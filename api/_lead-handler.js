const crypto = require("crypto");

const MAX_BODY_BYTES = 64 * 1024;
const MAX_FIELD_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6;
const rateLimitBuckets = new Map();

const SYSTEM_FIELD_NAMES = new Set([
  "_captcha",
  "_honey",
  "_next",
  "_subject",
  "_template",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getHeader = (headers, name) => {
  if (!headers) return "";
  const lowerName = name.toLowerCase();
  const match = Object.keys(headers).find((key) => key.toLowerCase() === lowerName);
  const value = match ? headers[match] : "";
  return Array.isArray(value) ? value.join(", ") : String(value || "");
};

const jsonResponse = (statusCode, payload, headers = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  },
  body: JSON.stringify(payload),
});

const buildCorsHeaders = (headers) => {
  const origin = getHeader(headers, "origin");
  const allowedOrigin = isAllowedOrigin(origin) ? origin : "";

  return {
    ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin } : {}),
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept",
    "vary": "origin",
  };
};

const isAllowedOrigin = (origin) => {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return (
      url.hostname === "patsellsflhomes.com" ||
      url.hostname === "www.patsellsflhomes.com" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
};

const readNodeBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const parseBody = (rawBody, headers) => {
  if (!rawBody) return {};

  if (typeof rawBody === "object" && !Buffer.isBuffer(rawBody)) {
    return rawBody;
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  if (body.length > MAX_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  const contentType = getHeader(headers, "content-type");
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(body));
  }

  return body ? JSON.parse(body) : {};
};

const safeString = (value, maxLength = MAX_FIELD_LENGTH) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => safeString(item, maxLength)).join(", ");

  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
};

const sanitizeRecord = (record = {}) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) return {};

  return Object.entries(record).reduce((clean, [key, value]) => {
    const cleanKey = safeString(key, 80);
    if (!cleanKey) return clean;
    clean[cleanKey] = safeString(value);
    return clean;
  }, {});
};

const publicLeadFields = (fields) =>
  Object.entries(fields).reduce((clean, [key, value]) => {
    if (!SYSTEM_FIELD_NAMES.has(key)) {
      clean[key] = value;
    }
    return clean;
  }, {});

const getClientIp = (headers, fallbackIp = "") => {
  const forwardedFor = getHeader(headers, "x-forwarded-for").split(",")[0].trim();
  return forwardedFor || getHeader(headers, "x-real-ip") || fallbackIp || "unknown";
};

const checkRateLimit = (key) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key) || [];
  const activeHits = bucket.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (activeHits.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(key, activeHits);
    return false;
  }

  activeHits.push(now);
  rateLimitBuckets.set(key, activeHits);
  return true;
};

const createLeadId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
};

const isProductionRuntime = () =>
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.CONTEXT === "production";

const shouldAcceptDevLeads = () => process.env.LEAD_DEV_ACCEPT === "true" || !isProductionRuntime();

const deliverLead = async (lead) => {
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  const forwardUrl =
    process.env.LEAD_FORWARD_URL ||
    (process.env.FORMSUBMIT_EMAIL
      ? `https://formsubmit.co/ajax/${encodeURIComponent(process.env.FORMSUBMIT_EMAIL)}`
      : "");

  if (webhookUrl) {
    const headers = { "content-type": "application/json" };
    if (process.env.LEAD_WEBHOOK_SECRET) {
      headers.authorization = `Bearer ${process.env.LEAD_WEBHOOK_SECRET}`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(lead),
    });

    return { configured: true, ok: response.ok, mode: "webhook", status: response.status };
  }

  if (forwardUrl) {
    const response = await fetch(forwardUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        _subject: `New ${lead.form_type || "website"} lead from PatSellsFLHomes.com`,
        name: lead.name,
        email: lead.email,
        phone: lead.fields.phone || "",
        form_type: lead.form_type,
        received_at: lead.received_at,
        page_url: lead.metadata.page_url || "",
        referrer: lead.metadata.referrer || "",
        ...lead.fields,
      }),
    });

    return { configured: true, ok: response.ok, mode: "forward", status: response.status };
  }

  return { configured: false, ok: false, mode: "log-only" };
};

const handleLeadRequest = async ({ method, headers = {}, body, ip = "", nodeRequest = null }) => {
  const corsHeaders = buildCorsHeaders(headers);

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed." }, corsHeaders);
  }

  const clientIp = getClientIp(headers, ip);
  if (!checkRateLimit(clientIp)) {
    return jsonResponse(429, { ok: false, error: "Please wait a moment before sending again." }, corsHeaders);
  }

  let payload;
  try {
    const rawBody = body === undefined && nodeRequest ? await readNodeBody(nodeRequest) : body;
    payload = parseBody(rawBody, headers);
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid lead payload." }, corsHeaders);
  }

  const fields = sanitizeRecord(payload.fields || payload);
  const metadata = sanitizeRecord(payload.metadata || {});
  const honeypot = fields._honey || fields.company || fields.website;

  if (honeypot) {
    return jsonResponse(200, { ok: true, filtered: true }, corsHeaders);
  }

  const name = safeString(fields.name, 140);
  const email = safeString(fields.email, 254).toLowerCase();

  if (!name) {
    return jsonResponse(422, { ok: false, error: "Please enter your name." }, corsHeaders);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse(422, { ok: false, error: "Please enter a valid email address." }, corsHeaders);
  }

  const lead = {
    id: createLeadId(),
    received_at: new Date().toISOString(),
    form_type: safeString(payload.form_type || fields.form_type || metadata.form_type || "general", 80),
    name,
    email,
    fields: publicLeadFields(fields),
    metadata: {
      ...publicLeadFields(metadata),
      ip: clientIp,
      user_agent: safeString(getHeader(headers, "user-agent"), 500),
    },
  };

  try {
    const delivery = await deliverLead(lead);

    if (delivery.configured && delivery.ok) {
      return jsonResponse(200, { ok: true, id: lead.id, mode: delivery.mode }, corsHeaders);
    }

    if (delivery.configured) {
      return jsonResponse(502, { ok: false, error: "Lead delivery failed." }, corsHeaders);
    }

    if (shouldAcceptDevLeads()) {
      console.info("[lead:log-only]", JSON.stringify(lead));
      return jsonResponse(200, { ok: true, id: lead.id, mode: "log-only" }, corsHeaders);
    }

    return jsonResponse(501, { ok: false, error: "Lead delivery is not configured." }, corsHeaders);
  } catch (error) {
    console.error("[lead:error]", error);
    return jsonResponse(502, { ok: false, error: "Lead delivery failed." }, corsHeaders);
  }
};

module.exports = {
  handleLeadRequest,
};
