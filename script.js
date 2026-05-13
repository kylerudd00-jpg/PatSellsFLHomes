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
    ".testimonial-card",
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

const FORM_ENDPOINT = "https://formsubmit.co/ajax/patsellsflhomes@gmail.com";
const valuationForm = document.getElementById("valuation-form");

if (valuationForm) {
  const formFeedback = valuationForm.querySelector(".form-feedback");
  const submitBtn = valuationForm.querySelector('[type="submit"]');

  valuationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!submitBtn || !formFeedback) return;

    submitBtn.disabled = true;
    formFeedback.hidden = true;
    formFeedback.className = "form-feedback";

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: new FormData(valuationForm),
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        formFeedback.textContent = "Thanks — Pat will follow up within one business day.";
        formFeedback.classList.add("is-success");
        valuationForm.reset();
      } else {
        throw new Error();
      }
    } catch {
      formFeedback.textContent = "Something went wrong. Please call or email Pat directly.";
      formFeedback.classList.add("is-error");
    } finally {
      formFeedback.hidden = false;
      submitBtn.disabled = false;
    }
  });
}

// Interactive map
const mapEl = document.getElementById("areas-map");
if (mapEl && typeof L !== "undefined") {
  const map = L.map("areas-map", {
    center: [26.65, -80.15],
    zoom: 10,
    scrollWheelZoom: false,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
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
    { name: "Delray Beach",      coords: [26.4615, -80.0728], price: "$650K median",  url: "delray-beach.html" },
    { name: "Boca Raton",        coords: [26.3683, -80.1289], price: "$850K median",  url: "boca-raton.html" },
    { name: "Boynton Beach",     coords: [26.5317, -80.0905], price: "$430K median",  url: "boynton-beach.html" },
    { name: "Gulf Stream",       coords: [26.5038, -80.0481], price: "$3M+ typical",  url: "gulf-stream.html" },
    { name: "Highland Beach",    coords: [26.4087, -80.0723], price: "$700K median",  url: "highland-beach.html" },
    { name: "Palm Beach County", coords: [26.7153, -80.0534], price: "County-wide",   url: "palm-beach-county.html" },
    { name: "Lake Worth Beach",  coords: [26.6198, -80.0590], price: "~$380K median", url: "lake-worth.html" },
    { name: "Wellington",        coords: [26.6590, -80.2689], price: "~$550K median", url: "wellington.html" },
    { name: "Jupiter",           coords: [26.9342, -80.0942], price: "~$650K median", url: "jupiter.html" },
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
    { name: "Ocean Blvd (A1A)",        coords: [26.5038, -80.0481], type: "Oceanfront · Estates",    price: "$4M–$20M+",  url: "gulf-stream.html",  desc: "The most coveted street in Gulf Stream. Direct Atlantic frontage, estate lots." },
    { name: "Polo Drive",              coords: [26.5010, -80.0530], type: "Intracoastal · Dockage",   price: "$2M–$8M+",   url: "gulf-stream.html",  desc: "Intracoastal side with deepwater dockage and sunset views. More value than the ocean side." },
    // Highland Beach
    { name: "Toscana",                 coords: [26.4250, -80.0718], type: "Oceanfront · High-Rise",  price: "$700K–$3M+", url: "highland-beach.html",desc: "Luxury oceanfront tower with resort amenities and full concierge service." },
    { name: "Byrd Beach Club",         coords: [26.4180, -80.0720], type: "Oceanfront · Mid-Rise",   price: "$500K–$1.5M", url: "highland-beach.html",desc: "Boutique mid-rise with direct beach access and a tight-knit community feel." },
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
