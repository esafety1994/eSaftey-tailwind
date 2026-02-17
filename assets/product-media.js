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
    // pause videos both in main slider and lightbox
    pauseVideosIn("#esProductGlide");
    pauseVideosIn("#product-lightbox");
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
          // If you need autoplay to be reliable across browsers, uncomment the next line:
          // activeVideo.muted = true;
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
              try {
                // keep main carousel synced to same media index
                main.go("=" + lbGlideEl._glideInstance.index);
              } catch (e) {}

              // autoplay the fullscreen active slide video (if any)
              try {
                const activeLbVideo = document.querySelector(
                  "#product-lightbox .glide__slide--active video"
                );
                if (activeLbVideo) {
                  // If you need autoplay to be reliable across browsers, uncomment:
                  // activeLbVideo.muted = true;
                  activeLbVideo.play().catch(() => {});
                }
              } catch (e) {}
            });
          } else {
            lbGlideEl._glideInstance.go("=" + idx);

            // When re-opening, try autoplay if current slide is a video
            setTimeout(() => {
              try {
                const activeLbVideo = document.querySelector(
                  "#product-lightbox .glide__slide--active video"
                );
                if (activeLbVideo) {
                  // activeLbVideo.muted = true;
                  activeLbVideo.play().catch(() => {});
                }
              } catch (e) {}
            }, 0);
          }
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

  const lbClose = document.getElementById("product-lightbox-close");
  const lb = document.getElementById("product-lightbox");
  const lbGlideEl = document.getElementById("product-lightbox-glide");

  if (lbClose && lb)
    lbClose.addEventListener("click", function () {
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
    });

  if (lb)
    lb.addEventListener("click", function (e) {
      if (e.target === lb) {
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
    });
});
