document.documentElement.classList.add("js");

const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const siteHeader = document.querySelector(".site-header");
const progressBar = document.querySelector(".scroll-progress span");
const heroMedia = document.querySelector(".hero-media");
const heroVideos = [...document.querySelectorAll(".hero-video")];
const heroPlaylist = heroMedia
  ? heroMedia.dataset.videoPlaylist
      .split(",")
      .map((src) => src.trim())
      .filter(Boolean)
  : [];
const heroClipMs = heroMedia ? Number.parseInt(heroMedia.dataset.clipDuration, 10) || 8500 : 8500;
const timeline = document.querySelector("[data-timeline]");
const scrollDriftItems = [...document.querySelectorAll("[data-scroll-drift]")];
const backgroundDriftItems = [...document.querySelectorAll("[data-background-drift]")];
const sectionProgressItems = [...document.querySelectorAll(".section, .contact-section")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroFadeMs = 1800;
let revealWatchItems = [];

const closeNav = () => {
  navMenu.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open navigation");
  const icon = navToggle.querySelector("[data-lucide]");
  if (icon) { icon.setAttribute("data-lucide", "menu"); window.lucide?.createIcons(); }
};

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    const icon = navToggle.querySelector("[data-lucide]");
    if (icon) { icon.setAttribute("data-lucide", isOpen ? "x" : "menu"); window.lucide?.createIcons(); }
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("click", (e) => {
    if (navMenu.classList.contains("is-open") && !navMenu.contains(e.target) && !navToggle.contains(e.target)) {
      closeNav();
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  setupHeroVideoLoop();

  const revealGroups = [
    ".quick-item",
    ".advisor-card",
    ".section-kicker",
    ".section h2",
    ".intro-copy p",
    ".feature-copy p",
    ".testimonials-carousel",
    ".service-card",
    ".lifestyle-card",
    ".process-grid article",
    ".areas-section > div",
    ".area-list span",
    ".valuation-copy",
    ".lead-form",
    ".contact-inner > div",
    ".contact-link",
  ];

  const revealItems = document.querySelectorAll(revealGroups.join(","));
  const imageItems = document.querySelectorAll(".advisor-photo, .feature-image-wrap, .lifestyle-media");
  revealWatchItems = [...revealItems, ...imageItems];

  revealItems.forEach((item, index) => {
    item.classList.add("reveal");
    item.style.setProperty("--reveal-delay", `${Math.min((index % 5) * 70, 280)}ms`);
  });

  imageItems.forEach((item) => item.classList.add("image-reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealWatchItems.forEach((item) => item.classList.add("is-visible"));
    revealWatchItems = [];
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.16 }
  );

  revealWatchItems.forEach((item) => observer.observe(item));
  requestScrollUpdate();
});

const playQuietly = (video) => {
  const playAttempt = video.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      video.controls = false;
    });
  }
};

const setupHeroVideoLoop = () => {
  if (reduceMotion || heroVideos.length < 2 || heroPlaylist.length === 0) {
    return;
  }

  let activeIndex = 0;
  let playlistIndex = 0;
  let loopTimer;

  const setVideoSource = (video, src) => {
    if (video.dataset.activeSrc !== src) {
      video.src = src;
      video.dataset.activeSrc = src;
      video.load();
    }
  };

  const preloadUpcomingVideo = () => {
    const standbyIndex = (activeIndex + 1) % heroVideos.length;
    const upcomingSrc = heroPlaylist[(playlistIndex + 1) % heroPlaylist.length];
    setVideoSource(heroVideos[standbyIndex], upcomingSrc);
  };

  heroVideos.forEach((video, index) => {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.classList.toggle("is-active", index === activeIndex);

    if (index !== activeIndex) {
      video.pause();
      video.currentTime = 0;
    }
  });

  setVideoSource(heroVideos[activeIndex], heroPlaylist[playlistIndex]);
  preloadUpcomingVideo();

  const scheduleFade = () => {
    const delay = Math.max(heroClipMs - heroFadeMs, 1800);

    window.clearTimeout(loopTimer);
    loopTimer = window.setTimeout(crossfadeVideos, delay);
  };

  const crossfadeVideos = () => {
    const activeVideo = heroVideos[activeIndex];
    const nextIndex = (activeIndex + 1) % heroVideos.length;
    const nextVideo = heroVideos[nextIndex];
    playlistIndex = (playlistIndex + 1) % heroPlaylist.length;

    nextVideo.currentTime = 0;
    nextVideo.classList.add("is-active");
    playQuietly(nextVideo);

    window.setTimeout(() => {
      activeVideo.classList.remove("is-active");
      activeVideo.pause();
      activeVideo.currentTime = 0;
      activeIndex = nextIndex;
      preloadUpcomingVideo();
      scheduleFade();
    }, heroFadeMs);
  };

  const startLoop = () => {
    playQuietly(heroVideos[activeIndex]);
    scheduleFade();
  };

  if (heroVideos[activeIndex].readyState >= 1) {
    startLoop();
  } else {
    heroVideos[activeIndex].addEventListener("loadedmetadata", startLoop, { once: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      playQuietly(heroVideos[activeIndex]);
    }
  });
};

let ticking = false;

const updateScrollEffects = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  if (progressBar) {
    progressBar.style.transform = `scaleX(${progress})`;
  }

  if (siteHeader) {
    siteHeader.classList.toggle("is-scrolled", scrollTop > 28);
  }

  if (heroMedia && !reduceMotion) {
    const parallax = Math.min(scrollTop * 0.08, 42);
    heroMedia.style.transform = `scale(1.02) translateY(${parallax}px)`;
  }

  sectionProgressItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const start = viewportHeight * 0.82;
    const end = -rect.height * 0.2;
    const itemProgress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
    item.style.setProperty("--section-progress", itemProgress.toFixed(3));
  });

  if (revealWatchItems.length) {
    revealWatchItems = revealWatchItems.filter((item) => {
      if (item.classList.contains("is-visible")) {
        return false;
      }

      const rect = item.getBoundingClientRect();

      if (rect.top < viewportHeight * 0.92 && rect.bottom > viewportHeight * 0.02) {
        item.classList.add("is-visible");
        return false;
      }

      return true;
    });
  }

  if (!reduceMotion) {
    scrollDriftItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const speed = Number.parseFloat(item.dataset.scrollDrift) || 18;
      const itemCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const centerOffset = Math.min(Math.max((itemCenter - viewportCenter) / viewportCenter, -1), 1);
      item.style.setProperty("--scroll-drift", `${(-centerOffset * speed).toFixed(2)}px`);
    });

    backgroundDriftItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const speed = Number.parseFloat(item.dataset.backgroundDrift) || 24;
      const itemCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const centerOffset = Math.min(Math.max((itemCenter - viewportCenter) / viewportCenter, -1), 1);
      item.style.setProperty("--bg-drift", `${(-centerOffset * speed).toFixed(2)}px`);
    });
  }

  if (timeline) {
    const rect = timeline.getBoundingClientRect();
    const start = viewportHeight * 0.82;
    const end = -rect.height * 0.15;
    const timelineProgress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
    timeline.style.setProperty("--timeline-progress", `${timelineProgress * 100}%`);
  }

  ticking = false;
};

const requestScrollUpdate = () => {
  if (!ticking) {
    window.requestAnimationFrame(updateScrollEffects);
    ticking = true;
  }
};

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);
requestScrollUpdate();

// Testimonials carousel
const tcEl = document.getElementById("testimonials-carousel");
if (tcEl) {
  const cards = [...tcEl.querySelectorAll(".testimonial-card")];
  const dots = [...tcEl.querySelectorAll(".tc-dot")];
  let current = 0;
  let timer;

  const goTo = (index) => {
    cards[current].classList.remove("is-active");
    dots[current].classList.remove("is-active");
    dots[current].setAttribute("aria-selected", "false");
    current = (index + cards.length) % cards.length;
    cards[current].classList.add("is-active");
    dots[current].classList.add("is-active");
    dots[current].setAttribute("aria-selected", "true");
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5500);
  };

  tcEl.querySelector(".tc-prev").addEventListener("click", () => goTo(current - 1));
  tcEl.querySelector(".tc-next").addEventListener("click", () => goTo(current + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

  timer = setInterval(() => goTo(current + 1), 5500);
}

const LEAD_API_ENDPOINT = "/api/leads";
const FORM_FALLBACK_ENDPOINT = "https://formsubmit.co/ajax/patsellsflhomes@gmail.com";
const leadForms = [...document.querySelectorAll(".lead-form")];
const lastLeadSubmissionTimes = new WeakMap();

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
];

const getLeadMetadata = (form) => {
  const params = new URLSearchParams(window.location.search);
  const campaign = UTM_KEYS.reduce((memo, key) => {
    const value = params.get(key);
    if (value) memo[key] = value;
    return memo;
  }, {});

  return {
    form_id: form.id || "",
    form_type: form.dataset.leadType || form.getAttribute("name") || "general",
    page_title: document.title,
    page_url: window.location.href,
    page_path: window.location.pathname,
    referrer: document.referrer,
    submitted_at: new Date().toISOString(),
    user_agent: navigator.userAgent,
    ...campaign,
  };
};

const formDataToObject = (formData) => {
  const data = {};

  formData.forEach((value, key) => {
    if (data[key]) {
      data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
    } else {
      data[key] = value;
    }
  });

  return data;
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const shouldUseFallback = (error) =>
  !error.status || [404, 405, 500, 501, 502, 503, 504].includes(error.status);

const showFormFeedback = (feedback, message, type) => {
  if (!feedback) return;
  feedback.hidden = false;
  feedback.textContent = message;
  feedback.className = `form-feedback is-${type}`;
};

const setButtonState = (button, isSending) => {
  if (!button) return;

  if (!button.dataset.originalHtml) {
    button.dataset.originalHtml = button.innerHTML;
  }

  button.disabled = isSending;
  button.innerHTML = isSending ? "Sending..." : button.dataset.originalHtml;

  if (!isSending && window.lucide) {
    window.lucide.createIcons();
  }
};

const submitLeadToApi = async (payload) => {
  const response = await fetch(LEAD_API_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await safeJson(response);

  if (!response.ok || data.ok !== true) {
    const error = new Error(data.error || "Lead API request failed.");
    error.status = response.ok ? 502 : response.status;
    throw error;
  }

  return data;
};

const submitLeadToFallback = async (form, payload) => {
  const formData = new FormData(form);

  Object.entries(payload.metadata).forEach(([key, value]) => {
    formData.set(key, value);
  });

  formData.set("form_type", payload.form_type);

  const response = await fetch(form.dataset.fallbackEndpoint || FORM_FALLBACK_ENDPOINT, {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
  });
  const data = await safeJson(response);

  if (!response.ok) {
    const error = new Error(data.message || "Lead fallback request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
};

const redirectToThankYou = (form, payload) => {
  const successUrl = form.dataset.successUrl;
  if (!successUrl) return;

  const url = new URL(successUrl, window.location.href);
  url.searchParams.set("form", payload.form_type);

  window.setTimeout(() => {
    window.location.href = url.toString();
  }, 650);
};

leadForms.forEach((form) => {
  const feedback = form.querySelector(".form-feedback");
  const submitBtn = form.querySelector('[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const lastSubmitTime = lastLeadSubmissionTimes.get(form) || 0;
    if (Date.now() - lastSubmitTime < 3000) {
      showFormFeedback(feedback, "Give it a moment before sending again.", "error");
      return;
    }

    const formData = new FormData(form);
    const fields = formDataToObject(formData);
    const metadata = getLeadMetadata(form);
    const payload = {
      form_type: metadata.form_type,
      fields,
      metadata,
    };

    if (fields._honey) {
      showFormFeedback(feedback, "Thanks - Pat will follow up within one business day.", "success");
      form.reset();
      return;
    }

    lastLeadSubmissionTimes.set(form, Date.now());
    setButtonState(submitBtn, true);
    if (feedback) feedback.hidden = true;

    try {
      try {
        await submitLeadToApi(payload);
      } catch (error) {
        if (!shouldUseFallback(error)) throw error;
        await submitLeadToFallback(form, payload);
      }

      showFormFeedback(feedback, "Thanks - Pat will follow up within one business day.", "success");
      form.reset();
      redirectToThankYou(form, payload);
    } catch (error) {
      showFormFeedback(
        feedback,
        error.message || "Something went wrong. Please call or email Pat directly.",
        "error"
      );
    } finally {
      setButtonState(submitBtn, false);
    }
  });
});

// Interactive map
const mapEl = document.getElementById("areas-map");
if (mapEl && typeof L !== "undefined") {
  const map = L.map("areas-map", {
    center: [26.55, -80.14],
    zoom: 9,
    scrollWheelZoom: false,
    zoomControl: true,
  });

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN",
    maxZoom: 19,
  }).addTo(map);

  L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    opacity: 0.7,
  }).addTo(map);

  const cityPinIcon = L.divIcon({
    className: "map-pin",
    html: `<span></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const hoodPinIcon = L.divIcon({
    className: "map-pin map-pin--hood",
    html: `<span></span>`,
    iconSize: [9, 9],
    iconAnchor: [4, 4],
  });

  const cities = [
    { name: "Delray Beach",       coords: [26.4615, -80.0728], price: "$650K median",  url: "delray-beach.html" },
    { name: "Boca Raton",         coords: [26.3683, -80.1289], price: "$850K median",  url: "boca-raton.html" },
    { name: "Boynton Beach",      coords: [26.5317, -80.0905], price: "$430K median",  url: "boynton-beach.html" },
    { name: "Gulf Stream",        coords: [26.5038, -80.0481], price: "$3M+ typical",  url: "gulf-stream.html" },
    { name: "Highland Beach",     coords: [26.4087, -80.0723], price: "$700K median",  url: "highland-beach.html" },
    { name: "Palm Beach County",  coords: [26.6500, -80.1800], price: "County-wide",   url: "palm-beach-county.html" },
    { name: "Lake Worth Beach",   coords: [26.6198, -80.0590], price: "~$380K median", url: "lake-worth.html" },
    { name: "Wellington",         coords: [26.6590, -80.2689], price: "~$550K median", url: "wellington.html" },
    { name: "Jupiter",            coords: [26.9342, -80.0942], price: "~$650K median", url: "jupiter.html" },
    { name: "West Palm Beach",    coords: [26.7153, -80.0534], price: "$520K median",  url: "palm-beach-county.html" },
    { name: "Palm Beach Gardens", coords: [26.8234, -80.1233], price: "$700K median",  url: "palm-beach-county.html" },
    { name: "North Palm Beach",   coords: [26.8183, -80.0696], price: "$650K median",  url: "palm-beach-county.html" },
    { name: "Singer Island",      coords: [26.7861, -80.0346], price: "$600K median",  url: "palm-beach-county.html" },
    { name: "Ocean Ridge",        coords: [26.5195, -80.0487], price: "$2M+ typical",  url: "palm-beach-county.html" },
    { name: "Manalapan",          coords: [26.5688, -80.0451], price: "$5M+ typical",  url: "palm-beach-county.html" },
    { name: "Royal Palm Beach",   coords: [26.7026, -80.2254], price: "~$430K median", url: "palm-beach-county.html" },
    { name: "Juno Beach",         coords: [26.8807, -80.0539], price: "~$500K median", url: "palm-beach-county.html" },
    { name: "Hobe Sound",         coords: [27.0650, -80.1360], price: "~$550K median", url: "palm-beach-county.html" },
    { name: "Hillsboro Beach",    coords: [26.2996, -80.0743], price: "$1.5M+ median", url: "palm-beach-county.html" },
    { name: "Deerfield Beach",    coords: [26.3184, -80.0998], price: "~$350K median", url: "palm-beach-county.html" },
    { name: "Lighthouse Point",   coords: [26.2759, -80.0870], price: "~$700K median", url: "palm-beach-county.html" },
    { name: "Pompano Beach",      coords: [26.2379, -80.1248], price: "~$400K median", url: "palm-beach-county.html" },
    { name: "Lauderdale-by-the-Sea", coords: [26.1921, -80.0968], price: "~$500K median", url: "palm-beach-county.html" },
    { name: "Fort Lauderdale",    coords: [26.1224, -80.1373], price: "~$550K median", url: "palm-beach-county.html" },
    { name: "Wilton Manors",      coords: [26.1595, -80.1323], price: "~$600K median", url: "palm-beach-county.html" },
    { name: "Coconut Creek",      coords: [26.2956, -80.1787], price: "~$380K median", url: "palm-beach-county.html" },
    { name: "Coral Springs",      coords: [26.2707, -80.2707], price: "~$480K median", url: "palm-beach-county.html" },
    { name: "Parkland",           coords: [26.3087, -80.2402], price: "~$850K median", url: "palm-beach-county.html" },
  ];

  const neighborhoods = [
    // Delray Beach
    { name: "Atlantic Avenue",         coords: [26.4609, -80.0645], type: "Downtown · Walkable",    price: "$500K–$2M",   url: "delray-beach.html", desc: "The heart of Delray — restaurants, galleries, nightlife steps from the beach." },
    { name: "Pineapple Grove",         coords: [26.4660, -80.0652], type: "Arts District",           price: "$350K–$900K", url: "delray-beach.html", desc: "Arts and gallery district just north of Atlantic Ave. Great value close to downtown." },
    { name: "Kings Point",             coords: [26.4445, -80.1234], type: "55+ Community",           price: "$150K–$350K", url: "55-plus.html",      desc: "One of South Florida's largest active adult communities. Extensive amenities, shuttle service." },
    { name: "Tropic Isle",             coords: [26.4298, -80.0812], type: "Waterfront · Deepwater",  price: "$1M–$3M+",   url: "delray-beach.html", desc: "Deepwater lots with dock access to the Intracoastal. Mostly single-family." },
    { name: "Lake Ida",                coords: [26.4750, -80.0889], type: "Single-Family · Lakefront",price: "$600K–$1.8M",url: "delray-beach.html", desc: "Quiet lakefront neighborhood with mature trees and easy access to downtown." },
    { name: "High Point",              coords: [26.4489, -80.1132], type: "55+ Community",           price: "$120K–$280K", url: "55-plus.html",      desc: "Established active adult community with pools, tennis, and low HOA fees." },
    // Boca Raton
    { name: "Mizner Park",             coords: [26.3575, -80.0843], type: "Downtown · Walkable",     price: "$500K–$2M",   url: "boca-raton.html",   desc: "Boca's upscale open-air center. Condos and townhomes above shops and restaurants." },
    { name: "Boca West",               coords: [26.3836, -80.1758], type: "Golf · Gated",            price: "$300K–$1.5M", url: "boca-raton.html",   desc: "Private country club with four golf courses. One of the largest clubs in the country." },
    { name: "Royal Palm Yacht Club",   coords: [26.3390, -80.0810], type: "Waterfront · Yachting",   price: "$2M–$15M+",  url: "boca-raton.html",   desc: "Exclusive deepwater yachting community in East Boca. Some of the best dockage in the county." },
    { name: "East Boca Beachside",     coords: [26.3590, -80.0683], type: "Oceanfront · Condos",     price: "$600K–$3M+", url: "boca-raton.html",   desc: "High-rise condos with direct Atlantic access between Palmetto Park and Spanish River." },
    { name: "Broken Sound",            coords: [26.3986, -80.1539], type: "Golf · Country Club",     price: "$350K–$1.8M", url: "boca-raton.html",   desc: "Established private golf community with 36 holes and strong social programming." },
    // Boynton Beach
    { name: "Downtown Boynton",        coords: [26.5318, -80.0597], type: "Downtown · Emerging",     price: "$250K–$600K", url: "boynton-beach.html",desc: "Renovated marina, new restaurants, and value condos steps from the Intracoastal." },
    { name: "Quail Ridge",             coords: [26.5518, -80.1563], type: "Golf · 55+",              price: "$200K–$600K", url: "55-plus.html",      desc: "Private golf and country club with 36 holes. Active adult-leaning community." },
    { name: "Valencia Isles",          coords: [26.5628, -80.1887], type: "55+ · Upscale",           price: "$450K–$900K", url: "55-plus.html",      desc: "GL Homes' upscale active adult product. Resort amenities, newer construction." },
    // Lake Worth Beach
    { name: "Downtown Lake Worth",     coords: [26.6141, -80.0627], type: "Arts · Walkable",         price: "$200K–$600K", url: "lake-worth.html",   desc: "Real walkable downtown with independent restaurants, galleries, and diverse housing." },
    { name: "College Park",            coords: [26.6244, -80.0784], type: "Residential · Value",     price: "$180K–$450K", url: "lake-worth.html",   desc: "Quiet tree-lined streets, older homes with character, best dollar-per-sqft in the area." },
    // Wellington
    { name: "Palm Beach Polo Club",    coords: [26.6410, -80.2494], type: "Equestrian · Polo",       price: "$500K–$5M+", url: "wellington.html",   desc: "World-class polo grounds. Equestrian estates, high-end residences surrounding the fields." },
    { name: "Versailles",              coords: [26.6726, -80.2949], type: "Gated · Luxury",          price: "$700K–$2M+", url: "wellington.html",   desc: "Upscale gated community with large lots and a Mediterranean aesthetic." },
    { name: "Binks Forest",            coords: [26.7032, -80.2565], type: "Golf · Equestrian",       price: "$400K–$1.2M", url: "wellington.html",   desc: "Golf and equestrian community. Spacious lots, mature landscaping, quieter feel." },
    // Jupiter
    { name: "Abacoa",                  coords: [26.9001, -80.1113], type: "Master-Planned · Schools",price: "$400K–$1.2M", url: "jupiter.html",      desc: "Town-center design with walkable streets, great schools, and a strong community feel." },
    { name: "Admirals Cove",           coords: [26.9150, -80.1060], type: "Waterfront · Gated",      price: "$1.5M–$8M+", url: "jupiter.html",      desc: "Private gated yachting community with deepwater dockage. One of Jupiter's finest." },
    { name: "Tequesta",                coords: [26.9684, -80.1016], type: "Village · Waterway",      price: "$350K–$1.5M", url: "jupiter.html",      desc: "Quiet village feel at the county's northern tip. Waterway access, older homes, low-key." },
    { name: "Jupiter Farms",           coords: [26.9293, -80.1620], type: "Rural · Acreage",         price: "$400K–$1.2M", url: "jupiter.html",      desc: "Rural lots where horses are welcome. The most space for the money in northern PBC." },
    // Gulf Stream
    { name: "Ocean Blvd (A1A)",        coords: [26.5038, -80.0481], type: "Oceanfront · Estates",      price: "$4M–$20M+",   url: "gulf-stream.html",       desc: "The most coveted street in Gulf Stream. Direct Atlantic frontage, estate lots." },
    { name: "Polo Drive",              coords: [26.5010, -80.0530], type: "Intracoastal · Dockage",     price: "$2M–$8M+",    url: "gulf-stream.html",       desc: "Intracoastal side with deepwater dockage and sunset views. More value than the ocean side." },
    // Highland Beach
    { name: "Toscana",                 coords: [26.4250, -80.0718], type: "Oceanfront · High-Rise",    price: "$700K–$3M+",  url: "highland-beach.html",    desc: "Luxury oceanfront tower with resort amenities and full concierge service." },
    { name: "Byrd Beach Club",         coords: [26.4180, -80.0720], type: "Oceanfront · Mid-Rise",     price: "$500K–$1.5M", url: "highland-beach.html",    desc: "Boutique mid-rise with direct beach access and a tight-knit community feel." },
    // West Palm Beach
    { name: "Northwood",               coords: [26.7311, -80.0681], type: "Historic Arts District",    price: "$350K–$850K",  url: "palm-beach-county.html", desc: "Revived arts neighborhood north of downtown WPB. Great walkability, eclectic bungalows, galleries." },
    { name: "Flamingo Park",           coords: [26.7175, -80.0683], type: "Historic · Bungalows",      price: "$450K–$950K",  url: "palm-beach-county.html", desc: "Beloved historic district with charming bungalows and deep community pride." },
    { name: "El Cid",                  coords: [26.7130, -80.0755], type: "Mediterranean Estates",     price: "$700K–$3.5M+", url: "palm-beach-county.html", desc: "Elegant Intracoastal-adjacent neighborhood known for Mediterranean Revival architecture and grand lots." },
    { name: "SoSo",                    coords: [26.6900, -80.0683], type: "Arts · Antique Row",        price: "$320K–$750K",  url: "palm-beach-county.html", desc: "South of Southern. Antique dealers, independent restaurants, and a creative community vibe." },
    // Palm Beach (island)
    { name: "Palm Beach",              coords: [26.7075, -80.0395], type: "Oceanfront Estates · Old Money", price: "$3M–$50M+", url: "palm-beach-county.html", desc: "The island. Worth Avenue, historic mansions, ocean-to-lake estates. The pinnacle of Palm Beach County luxury." },
    { name: "Palm Beach North End",    coords: [26.7400, -80.0330], type: "Quieter Estates",           price: "$2M–$12M+",   url: "palm-beach-county.html", desc: "Calmer end of the island with large lots, more privacy, and direct ocean or Intracoastal access." },
    // Palm Beach Gardens
    { name: "PGA National",           coords: [26.8334, -80.1433], type: "Golf · Master-Planned",     price: "$350K–$2M",   url: "palm-beach-county.html", desc: "Home of the Honda Classic. Five golf courses, resort amenities, and strong resale demand." },
    { name: "Mirasol",                coords: [26.8511, -80.1328], type: "Ultra-Luxury Golf",         price: "$1.5M–$8M+",  url: "palm-beach-county.html", desc: "Private ultra-luxury country club with two Fazio courses. Some of the finest golf real estate in the county." },
    { name: "Frenchman's Creek",      coords: [26.8764, -80.1005], type: "Marina · Gated",            price: "$700K–$3M+",  url: "palm-beach-county.html", desc: "Gated community with a full-service marina, golf, and tennis. Popular with boaters." },
    { name: "BallenIsles",            coords: [26.8284, -80.1465], type: "Golf · Gated",              price: "$400K–$2.5M", url: "palm-beach-county.html", desc: "Three-course gated golf community with a renovated clubhouse and strong activity calendar." },
    { name: "Alton",                  coords: [26.8550, -80.1153], type: "New Construction",          price: "$550K–$1.6M", url: "palm-beach-county.html", desc: "Newer master-planned community with contemporary homes, walkable design, and modern finishes." },
    // Jupiter additional
    { name: "Jonathan's Landing",     coords: [26.9050, -80.1360], type: "Gated Marina · Golf",      price: "$450K–$3M+",  url: "jupiter.html",           desc: "Prestigious gated community with a private marina, three golf courses, and a clubhouse." },
    { name: "Jupiter Island",         coords: [26.9680, -80.0698], type: "Ultra-Luxury Barrier Island", price: "$5M–$60M+", url: "jupiter.html",           desc: "One of the wealthiest zip codes in the U.S. Narrow barrier island, absolute privacy, ocean-to-river estates." },
    { name: "Pennock Point",          coords: [26.9153, -80.0971], type: "Waterfront Peninsula",      price: "$900K–$5M+",  url: "jupiter.html",           desc: "Serene finger peninsula surrounded by the Loxahatchee River. Some of Jupiter's most private waterfront addresses." },
    // Singer Island
    { name: "Singer Island Condos",   coords: [26.7780, -80.0380], type: "Oceanfront · High-Rise",   price: "$350K–$2.5M+",url: "palm-beach-county.html", desc: "Oceanfront towers with sweeping Atlantic views. Strong rental market and resort-style amenities." },
    // More Boca Raton
    { name: "Woodfield Country Club", coords: [26.4170, -80.1700], type: "Golf · Gated · Luxury",    price: "$700K–$3.5M+",url: "boca-raton.html",        desc: "Prestigious private golf community. Well-maintained estates, strong HOA, and a tight-knit membership." },
    { name: "St. Andrews CC",         coords: [26.4065, -80.1775], type: "Ultra-Private Golf",        price: "$900K–$5M+",  url: "boca-raton.html",        desc: "One of Boca's most exclusive enclaves. Private golf, limited membership, impeccable landscaping." },
    { name: "Boca del Mar",           coords: [26.3420, -80.1200], type: "Golf · Mature Community",  price: "$200K–$650K", url: "boca-raton.html",        desc: "Established community with a mix of condos and single-family. Good value in south Boca." },
    // More Delray Beach
    { name: "The Bridges",            coords: [26.4880, -80.1450], type: "New Luxury · GL Homes",    price: "$750K–$2.5M+",url: "delray-beach.html",      desc: "One of GL Homes' flagship luxury communities. Resort-style amenities, newer construction." },
    { name: "Seacrest",               coords: [26.4560, -80.0800], type: "Arts · Walkable",          price: "$280K–$650K", url: "delray-beach.html",      desc: "Diverse, walkable neighborhood close to downtown. A favorite among first-time buyers and artists." },
    // More Wellington
    { name: "Olympia",                coords: [26.6820, -80.2700], type: "Master-Planned · Schools", price: "$420K–$1.2M", url: "wellington.html",        desc: "Well-run master-planned community with top-rated schools and a strong community association." },
    { name: "Equestrian Club Estates",coords: [26.6290, -80.2650], type: "Equestrian Estates",       price: "$500K–$3M+",  url: "wellington.html",        desc: "Direct access to the equestrian trail system. Bring your horses — paddocks and stalls on site." },
    // Royal Palm Beach / Loxahatchee
    { name: "The Acreage",            coords: [26.7200, -80.2900], type: "Rural · Large Lots",       price: "$350K–$900K", url: "palm-beach-county.html", desc: "One-to-five acre lots west of Royal Palm Beach. Rural character, lower density, room to breathe." },
    // More Boynton Beach
    { name: "Hunters Run",            coords: [26.5120, -80.1350], type: "55+ Golf",                 price: "$140K–$450K", url: "55-plus.html",           desc: "Bundled golf community for active adults. Three 9-hole courses and one of the most active clubhouses in Boynton." },
    { name: "Atlantis",               coords: [26.5950, -80.1000], type: "Small City · Golf",        price: "$350K–$900K", url: "palm-beach-county.html", desc: "Tiny incorporated city with its own golf course and low traffic. Like a private enclave inside Palm Beach County." },
    // South Palm Beach
    { name: "South Palm Beach",       coords: [26.5900, -80.0514], type: "Oceanfront · Small Town",  price: "$250K–$950K", url: "palm-beach-county.html", desc: "Narrow strip of oceanfront condos between Lantana and Manalapan. Quiet, walkable, and undervalued." },
    // Ocean Ridge
    { name: "Ocean Ridge",            coords: [26.5150, -80.0498], type: "Oceanfront Estates",       price: "$600K–$4M+",  url: "palm-beach-county.html", desc: "Quiet incorporated town with strict zoning, low density, and ocean-to-Intracoastal lot opportunities." },
    // Manalapan
    { name: "Manalapan Estates",      coords: [26.5688, -80.0440], type: "Ultra-Luxury · Private",   price: "$3M–$25M+",   url: "palm-beach-county.html", desc: "One of the most exclusive addresses in Florida. Oceanfront-to-Intracoastal estates on a gated barrier island." },
    // North Palm Beach
    { name: "Old Port Cove",          coords: [26.8162, -80.0640], type: "Marina · Waterfront",      price: "$400K–$1.5M",  url: "palm-beach-county.html", desc: "Marina community with Intracoastal views, boat slips, and a short drive to the beach." },
    // Hobe Sound / Martin County border
    { name: "Medalist Village",       coords: [27.0548, -80.1625], type: "Golf · Greg Norman Design", price: "$400K–$2M+",  url: "palm-beach-county.html", desc: "Exclusive golf community built around the world-famous Medalist Golf Club. Tiger Woods trained here for years." },
    { name: "Jupiter Inlet Colony",   coords: [26.9401, -80.0697], type: "Oceanfront · 400 Homes",   price: "$1M–$8M+",    url: "jupiter.html",           desc: "The smallest municipality in Palm Beach County. Private oceanfront enclave — every home is steps from the Atlantic." },
    // Hillsboro Beach / Deerfield area
    { name: "Hillsboro Shores",       coords: [26.2970, -80.0766], type: "Oceanfront · Quiet",        price: "$600K–$3M+",  url: "palm-beach-county.html", desc: "Low-key oceanfront strip between Boca and Pompano. Sleeper community with direct beach access and very little development." },
    { name: "Deer Creek CC",          coords: [26.3340, -80.1454], type: "Golf · Gated",              price: "$150K–$500K",  url: "palm-beach-county.html", desc: "Well-kept gated golf community popular with snowbirds. Condos and villas at accessible price points." },
    // Lighthouse Point
    { name: "LHP Deep-Water Canals",  coords: [26.2759, -80.0835], type: "Boating · No Fixed Bridges", price: "$500K–$3M+", url: "palm-beach-county.html", desc: "Every home has a dock. Deep-water canals with no fixed bridges — bring a large boat. One of Broward's best boating addresses." },
    // Pompano Beach
    { name: "Palm Aire CC",           coords: [26.2452, -80.1329], type: "Bundled Golf · Active Adult", price: "$100K–$450K", url: "55-plus.html",          desc: "Bundled golf community — green fees included in HOA. Very active lifestyle, great dollars-per-square-foot." },
    { name: "Pompano Isles",          coords: [26.2560, -80.1050], type: "Waterfront · Canal Homes",  price: "$350K–$1.5M", url: "palm-beach-county.html", desc: "Canal-front single-family homes with boat dockage. Solid value compared to Fort Lauderdale's waterfront neighborhoods." },
    // Fort Lauderdale
    { name: "Las Olas",               coords: [26.1193, -80.1290], type: "Walkable · Canal Homes",    price: "$400K–$3M+",  url: "palm-beach-county.html", desc: "Fort Lauderdale's signature boulevard. Canal-front homes, walkable restaurants, gallery district, and direct Intracoastal access." },
    { name: "Victoria Park",          coords: [26.1284, -80.1230], type: "Historic Bungalows",         price: "$500K–$1.5M", url: "palm-beach-county.html", desc: "Beloved neighborhood of craftsman homes just north of downtown FTL. Walkable, tree-lined, tight-knit community." },
    { name: "Rio Vista",              coords: [26.1052, -80.1280], type: "Deepwater · No Fixed Bridges", price: "$800K–$5M+", url: "palm-beach-county.html", desc: "South of downtown FTL. Deep-water canals, no fixed bridges, direct ocean access. One of South Florida's premier boating addresses." },
    { name: "Harbor Beach",           coords: [26.0991, -80.1090], type: "Gated · Yachting",           price: "$2M–$15M+",   url: "palm-beach-county.html", desc: "Private gated community with its own beach club and marina. Ocean-to-Intracoastal lots, absolute privacy, world-class dockage." },
    { name: "Coral Ridge",            coords: [26.1450, -80.1070], type: "Intracoastal Dockage",       price: "$500K–$2.5M", url: "palm-beach-county.html", desc: "Established FTL neighborhood with deepwater canal access. Strong boating culture and a mix of single-family and condos." },
    { name: "Wilton Manors Village",  coords: [26.1595, -80.1370], type: "Walkable · Community Pride",  price: "$400K–$1.2M", url: "palm-beach-county.html", desc: "Known for its walkable Wilton Drive dining scene and strong community identity. Excellent pride of ownership." },
    // Coral Springs / Parkland
    { name: "Parkland Golf & CC",     coords: [26.3145, -80.2534], type: "Golf · Exclusive Schools",   price: "$600K–$2.5M+", url: "palm-beach-county.html", desc: "One of Broward's most sought-after addresses. Private golf, top-rated schools, and strict HOA standards." },
    { name: "Heron Bay",              coords: [26.3320, -80.2416], type: "Master-Planned · Resort",    price: "$550K–$1.8M", url: "palm-beach-county.html", desc: "Large master-planned community in Coral Springs with multiple gated sub-communities, resort pools, and fitness clubs." },
    { name: "Boca Pointe",            coords: [26.3353, -80.1237], type: "Golf · South Boca",          price: "$150K–$600K",  url: "boca-raton.html",        desc: "Popular bundled golf community in south Boca. Mandatory membership included in dues. Mix of condos, villas, and homes." },
  ];

  const cityLayer = L.layerGroup().addTo(map);
  const hoodLayer = L.layerGroup();

  cities.forEach(({ name, coords, price, url }) => {
    const marker = L.marker(coords, { icon: cityPinIcon }).addTo(cityLayer);
    marker.bindPopup(
      `<div class="map-popup">
        <strong>${name}</strong>
        <span>${price}</span>
        <a href="${url}">Read the guide →</a>
      </div>`,
      { closeButton: false, offset: [0, -4] }
    );
    marker.on("mouseover", () => marker.openPopup());
  });

  neighborhoods.forEach(({ name, coords, type, price, url, desc }) => {
    const marker = L.marker(coords, { icon: hoodPinIcon }).addTo(hoodLayer);
    marker.bindPopup(
      `<div class="map-popup map-popup--hood">
        <strong>${name}</strong>
        <em>${type}</em>
        <span>${price}</span>
        <p>${desc}</p>
        <a href="${url}">View area guide →</a>
      </div>`,
      { closeButton: false, offset: [0, -4], maxWidth: 220 }
    );
    marker.on("mouseover", () => marker.openPopup());
  });

  const zoomHint = L.control({ position: "bottomleft" });
  zoomHint.onAdd = () => {
    const div = L.DomUtil.create("div", "map-zoom-hint");
    div.innerHTML = "Zoom in to explore neighborhoods";
    return div;
  };
  zoomHint.addTo(map);

  const updateHoodLayer = () => {
    if (map.getZoom() >= 11) {
      if (!map.hasLayer(hoodLayer)) hoodLayer.addTo(map);
      zoomHint._container && (zoomHint._container.style.opacity = "0");
    } else {
      if (map.hasLayer(hoodLayer)) map.removeLayer(hoodLayer);
      zoomHint._container && (zoomHint._container.style.opacity = "1");
    }
  };

  map.on("zoomend", updateHoodLayer);
  updateHoodLayer();
}
