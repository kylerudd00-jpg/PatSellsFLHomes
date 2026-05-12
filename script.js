document.documentElement.classList.add("js");

const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const siteHeader = document.querySelector(".site-header");
const progressBar = document.querySelector(".scroll-progress span");
const heroMedia = document.querySelector(".hero-media");
const heroVideos = [...document.querySelectorAll(".hero-video")];
const timeline = document.querySelector("[data-timeline]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroFadeMs = 1600;

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation");
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  setupHeroVideoLoop();

  const revealGroups = [
    ".quick-item",
    ".section-kicker",
    ".section h2",
    ".intro-copy p",
    ".feature-copy p",
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
  const imageItems = document.querySelectorAll(".feature-image-wrap");

  revealItems.forEach((item, index) => {
    item.classList.add("reveal");
    item.style.setProperty("--reveal-delay", `${Math.min((index % 5) * 70, 280)}ms`);
  });

  imageItems.forEach((item) => item.classList.add("image-reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    [...revealItems, ...imageItems].forEach((item) => item.classList.add("is-visible"));
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

  [...revealItems, ...imageItems].forEach((item) => observer.observe(item));
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
  if (reduceMotion || heroVideos.length < 2) {
    return;
  }

  let activeIndex = 0;
  let loopTimer;

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

  const scheduleFade = () => {
    const activeVideo = heroVideos[activeIndex];
    const duration = Number.isFinite(activeVideo.duration) ? activeVideo.duration : 18;
    const delay = Math.max(duration * 1000 - heroFadeMs, 1200);

    window.clearTimeout(loopTimer);
    loopTimer = window.setTimeout(crossfadeVideos, delay);
  };

  const crossfadeVideos = () => {
    const activeVideo = heroVideos[activeIndex];
    const nextIndex = (activeIndex + 1) % heroVideos.length;
    const nextVideo = heroVideos[nextIndex];

    nextVideo.currentTime = 0;
    nextVideo.classList.add("is-active");
    playQuietly(nextVideo);

    window.setTimeout(() => {
      activeVideo.classList.remove("is-active");
      activeVideo.pause();
      activeVideo.currentTime = 0;
      activeIndex = nextIndex;
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

  if (timeline) {
    const rect = timeline.getBoundingClientRect();
    const start = window.innerHeight * 0.82;
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
