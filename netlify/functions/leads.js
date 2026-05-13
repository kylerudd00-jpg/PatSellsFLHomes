const { handleLeadRequest } = require("../../api/_lead-handler");

exports.handler = async (event) => {
  const body = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body;

  const response = await handleLeadRequest({
    method: event.httpMethod,
    headers: event.headers,
    body,
    ip: event.headers["client-ip"] || event.headers["x-nf-client-connection-ip"] || "",
  });

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
};
