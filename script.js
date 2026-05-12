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
    center: [26.46, -80.09],
    zoom: 11,
    scrollWheelZoom: false,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  }).addTo(map);

  const pinIcon = L.divIcon({
    className: "map-pin",
    html: `<span></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const areas = [
    { name: "Delray Beach", coords: [26.4615, -80.0728], price: "$650K median", url: "delray-beach.html" },
    { name: "Boca Raton",   coords: [26.3683, -80.1289], price: "$850K median", url: "boca-raton.html" },
    { name: "Boynton Beach",coords: [26.5317, -80.0905], price: "$430K median", url: "boynton-beach.html" },
    { name: "Gulf Stream",  coords: [26.5038, -80.0481], price: "$3M+ typical", url: "gulf-stream.html" },
    { name: "Highland Beach",coords:[26.4087, -80.0723], price: "$700K median", url: "highland-beach.html" },
    { name: "Palm Beach County", coords: [26.7153, -80.0534], price: "County-wide", url: "palm-beach-county.html" },
  ];

  areas.forEach(({ name, coords, price, url }) => {
    const marker = L.marker(coords, { icon: pinIcon }).addTo(map);
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
}
