document.addEventListener("DOMContentLoaded", function () {
  let main = null;
  let thumbs = null;

  const totalSlidesEl = document.querySelector("[data-esProductGlideCount]");
  const totalSlides = totalSlidesEl
    ? parseInt(totalSlidesEl.getAttribute("data-esProductGlideCount"), 10)
    : null;

  function syncThumbs(idx) {
    if (!thumbs) return;

    const total = document.querySelectorAll(
      "#esProductThumbs > .glide__track .glide__slide"
    ).length;

    let perView;
    try {
      perView =
        thumbs && thumbs.settings && thumbs.settings.perView
          ? Math.floor(thumbs.settings.perView)
          : undefined;
    } catch (e) {
      perView = undefined;
    }

    if (!perView) {
      if (window.innerWidth >= 1200) perView = 5;
      else if (window.innerWidth >= 1024) perView = 4;
      else if (window.innerWidth >= 767) perView = 4;
      else if (window.innerWidth >= 510) perView = 3;
      else perView = 3;
    }

    perView = Math.max(1, Math.min(perView, total || perView));

    if (total <= perView) {
      try { thumbs.go("=0"); } catch (e) {}
    } else {
      const maxStart = Math.max(0, total - perView);
      const desired = idx - (perView - 1);
      const start = Math.max(0, Math.min(desired, maxStart));
      try {
        if (typeof thumbs.index === "number" && thumbs.index !== start) {
          thumbs.go("=" + start);
        }
      } catch (e) {
        try { thumbs.go("=" + start); } catch (e) {}
      }
    }

    setActiveThumb(idx);
  }

  function destroyGlides() {
    try { if (main) main.destroy(); } catch (e) {}
    try { if (thumbs) thumbs.destroy(); } catch (e) {}
    main = null;
    thumbs = null;
  }

  function isLightboxOpen() {
    const lb = document.getElementById("product-lightbox");
    return !!(lb && lb.classList.contains("flex"));
  }

  function pauseVideosIn(selector) {
    try {
      document.querySelectorAll(selector + " video").forEach((v) => {
        try { if (!v.paused) v.pause(); } catch (e) {}
      });
    } catch (e) {}
  }

  function pauseAllVideos() {
    pauseVideosIn("#esProductGlide");
    pauseVideosIn("#product-lightbox");
  }

  // ==========================
  // ✅ VIDEO TIME SYNC HELPERS
  // ==========================
  function getSlides(selector) {
    return Array.from(document.querySelectorAll(selector + " .glide__slide"));
  }

  function getVideoInSlide(slideEl) {
    return slideEl ? slideEl.querySelector("video") : null;
  }

  function syncVideoTimeAndState(srcVideo, dstVideo) {
    if (!srcVideo || !dstVideo) return;

    // time
    try {
      const t = Number.isFinite(srcVideo.currentTime) ? srcVideo.currentTime : 0;

      // If dst metadata not ready, wait once
      if (dstVideo.readyState < 1) {
        const once = () => {
          try {
            if (Math.abs((dstVideo.currentTime || 0) - t) > 0.25) dstVideo.currentTime = t;
          } catch (e) {}
          dstVideo.removeEventListener("loadedmetadata", once);
        };
        dstVideo.addEventListener("loadedmetadata", once);
      } else {
        if (Math.abs((dstVideo.currentTime || 0) - t) > 0.25) dstVideo.currentTime = t;
      }
    } catch (e) {}

    // play/pause state
    try {
      if (srcVideo.paused) dstVideo.pause();
      else dstVideo.play().catch(() => {});
    } catch (e) {}
  }

  // Throttled live sync while lightbox open (scrub/play in fullscreen updates main)
  let syncLock = false;
  let lastSyncAt = 0;

  function throttle(fn) {
    const now = Date.now();
    if (syncLock) return;
    if (now - lastSyncAt < 250) return;
    lastSyncAt = now;
    syncLock = true;
    try { fn(); } finally { syncLock = false; }
  }

  function syncActiveLightboxToMain() {
    const lbGlideEl = document.getElementById("product-lightbox-glide");
    const inst = lbGlideEl && lbGlideEl._glideInstance;
    if (!inst) return;

    const idx = inst.index;

    const mainSlides = getSlides("#esProductGlide");
    const lbSlides = getSlides("#product-lightbox-glide");

    const mainV = getVideoInSlide(mainSlides[idx]);
    const lbV = getVideoInSlide(lbSlides[idx]);

    if (!mainV || !lbV) return;

    throttle(() => syncVideoTimeAndState(lbV, mainV));
  }

  function syncMainToLightboxAtIndex(idx) {
    const mainSlides = getSlides("#esProductGlide");
    const lbSlides = getSlides("#product-lightbox-glide");

    const mainV = getVideoInSlide(mainSlides[idx]);
    const lbV = getVideoInSlide(lbSlides[idx]);

    if (!mainV || !lbV) return;

    syncVideoTimeAndState(mainV, lbV);
  }

  function initGlides() {
    destroyGlides();

    const mainElNow = document.getElementById("esProductGlide");
    const thumbElNow = document.getElementById("esProductThumbs");

    const startAt =
      parseInt(mainElNow?.dataset.startIndex || 0, 10) || 0;

    main = new Glide("#esProductGlide", {
      type: "slider",
      startAt: startAt,
      perView: 1,
      keyboard: false,
    });

    if (thumbElNow) {
      const totalThumbs = document.querySelectorAll(
        "#esProductThumbs > .glide__track .glide__slide"
      ).length;

      thumbs = new Glide("#esProductThumbs", {
        type: "slider",
        startAt: startAt,
        perView: Math.min(4, totalThumbs || 1),
        gap: 8,
        bound: true,
        keyboard: false,
      });
    }

    // MAIN: autoplay only when lightbox is NOT open
    main.on("run.after", () => {
      const idx = main.index;
      syncThumbs(idx);

      // If the lightbox is open, do not autoplay the small/background video
      if (isLightboxOpen()) return;

      try {
        const activeVideo = document.querySelector(
          "#esProductGlide .glide__slide--active video"
        );
        if (activeVideo) {
          // activeVideo.muted = true; // optional for stricter autoplay compatibility
          activeVideo.play().catch(() => {});
        }
      } catch (e) {}
    });

    // MAIN: pause when leaving slide (and also pause any lightbox videos just in case)
    main.on("run.before", () => {
      pauseAllVideos();
    });

    if (thumbs) {
      thumbs.on("mount.after", () => {
        syncThumbs(main.index);
      });
      thumbs.mount();
    }

    main.mount();

    try {
      const root = document.getElementById("esProductGlide");

      if (root) {
        const openLightboxForSlide = function (slideEl, overrideIndex) {
          const slides = Array.from(
            document.querySelectorAll("#esProductGlide .glide__slide")
          );

          const idx =
            typeof overrideIndex === "number"
              ? overrideIndex
              : slideEl
              ? slides.indexOf(slideEl)
              : main.index || 0;

          const lb = document.getElementById("product-lightbox");
          const lbGlideEl = document.getElementById("product-lightbox-glide");

          if (!lb || !lbGlideEl) return;

          // Pause any playing videos before opening fullscreen
          pauseAllVideos();

          lb.classList.remove("hidden");
          lb.classList.add("flex");

          if (!lbGlideEl._glideInstance) {
            lbGlideEl._glideInstance = new Glide(
              "#product-lightbox-glide",
              {
                type: "carousel",
                perView: 1,
                gap: 16,
                startAt: idx,
                keyboard: false,
              }
            ).mount();

            // LIGHTBOX: keep main in sync + autoplay fullscreen video (not the small one)
            lbGlideEl._glideInstance.on("run.before", function () {
              pauseAllVideos();
            });

            lbGlideEl._glideInstance.on("run.after", function () {
              const i = lbGlideEl._glideInstance.index;

              try {
                // keep main carousel synced to same media index
                main.go("=" + i);
              } catch (e) {}

              // ✅ Sync time main -> lightbox for this slide
              setTimeout(() => {
                try { syncMainToLightboxAtIndex(i); } catch (e) {}
              }, 0);

              // autoplay the fullscreen active slide video (if any)
              try {
                const activeLbVideo = document.querySelector(
                  "#product-lightbox .glide__slide--active video"
                );
                if (activeLbVideo) {
                  // activeLbVideo.muted = true; // optional
                  activeLbVideo.play().catch(() => {});
                }
              } catch (e) {}
            });

          } else {
            lbGlideEl._glideInstance.go("=" + idx);

            // When re-opening, sync time and try autoplay if current slide is a video
            setTimeout(() => {
              try { syncMainToLightboxAtIndex(idx); } catch (e) {}

              try {
                const activeLbVideo = document.querySelector(
                  "#product-lightbox .glide__slide--active video"
                );
                if (activeLbVideo) {
                  // activeLbVideo.muted = true;
                  activeLbVideo.play().catch(() => {});
                }
              } catch (e) {}
            }, 50);
          }

          // ✅ On open, immediately sync time for the opened index
          setTimeout(() => {
            try { syncMainToLightboxAtIndex(idx); } catch (e) {}
          }, 0);
        };

        // Zoom button click -> open lightbox at that media index
        root.querySelectorAll(".slide-zoom-btn").forEach(function (el) {
          el.addEventListener("click", function (e) {
            const slideEl = e.currentTarget.closest(".glide__slide");
            openLightboxForSlide(slideEl);
          });
        });

        // Click image to open lightbox
        root.addEventListener("click", function (e) {
          const clicked = e.target;
          if (!clicked) return;

          if (clicked.closest(".slide-zoom-btn")) return;

          const slideEl = clicked.closest(".glide__slide");
          if (!slideEl) return;
          if (slideEl.closest("#esProductThumbs")) return;

          // Only open on images (so clicking a playing video doesn't pop fullscreen unexpectedly)
          if (!clicked.closest("img")) return;
          if (clicked.closest("a")) return;

          openLightboxForSlide(slideEl);
        });
      }
    } catch (e) {}
  }

  function setActiveThumb(index) {
    const slides = document.querySelectorAll("#esProductThumbs .glide__slide");
    slides.forEach((el, i) =>
      el.classList.toggle("thumb-active", i === index)
    );
  }

  // click thumbnails to navigate main
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("#esProductThumbs .thumb-btn");
    if (!btn) return;

    const slides = Array.from(
      document.querySelectorAll("#esProductThumbs .glide__slide")
    );

    const li = btn.closest(".glide__slide");
    const idx = slides.indexOf(li);

    if (idx >= 0) main.go("=" + idx);
  });

  initGlides();

  document.addEventListener("product:content:replaced", function () {
    setTimeout(initGlides, 20);
  });

  // ✅ Live sync while lightbox open (scrub/play updates main)
  try {
    const lb = document.getElementById("product-lightbox");
    if (lb) {
      ["timeupdate", "seeked", "play", "pause"].forEach((evt) => {
        lb.addEventListener(
          evt,
          function (e) {
            if (!isLightboxOpen()) return;
            if (e.target && e.target.tagName === "VIDEO") syncActiveLightboxToMain();
          },
          true
        );
      });
    }
  } catch (e) {}

  const lbClose = document.getElementById("product-lightbox-close");
  const lb = document.getElementById("product-lightbox");
  const lbGlideEl = document.getElementById("product-lightbox-glide");

  function closeLightbox() {
    // ✅ push time from lightbox -> main before closing
    try {
      if (lbGlideEl && lbGlideEl._glideInstance) {
        const idx = lbGlideEl._glideInstance.index;

        const mainSlides = getSlides("#esProductGlide");
        const lbSlides = getSlides("#product-lightbox-glide");

        const mainV = getVideoInSlide(mainSlides[idx]);
        const lbV = getVideoInSlide(lbSlides[idx]);

        syncVideoTimeAndState(lbV, mainV);
      }
    } catch (e) {}

    // pause fullscreen videos when closing
    pauseVideosIn("#product-lightbox");

    lb.classList.add("hidden");
    lb.classList.remove("flex");
    try {
      if (lbGlideEl?._glideInstance) {
        lbGlideEl._glideInstance.destroy();
        lbGlideEl._glideInstance = null;
      }
    } catch (e) {}
  }

  if (lbClose && lb) lbClose.addEventListener("click", closeLightbox);

  if (lb)
    lb.addEventListener("click", function (e) {
      if (e.target === lb) closeLightbox();
    });
});
