document.addEventListener("DOMContentLoaded", function () {
  let main = null;
  let thumbs = null;
  const totalSlidesEl = document.querySelector("[data-esProductGlideCount]");
  const totalSlides = totalSlidesEl
    ? parseInt(totalSlidesEl.getAttribute("data-esProductGlideCount"), 10)
    : null;
  // helper to sync thumbnails positioning and active class
  function syncThumbs(idx) {
    if (!thumbs) return;
    const total = document.querySelectorAll(
      "#esProductThumbs > .glide__track .glide__slide",
    ).length;

    // Prefer the Glide instance's resolved perView (breakpoints applied),
    // otherwise fall back to the configured breakpoints.
    let perView;
    try {
      perView = thumbs && thumbs.settings && thumbs.settings.perView
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
      try {
        thumbs.go("=0");
      } catch (e) {}
      // ensure the slides container transform is reset so thumbnails stay left-aligned
      try {
        const slidesEl = document.querySelector("#esProductThumbs .glide__slides");
        if (slidesEl) {
          slidesEl.style.transition = "none";
          slidesEl.style.transform = "translate3d(0px, 0px, 0px)";
          setTimeout(() => {
            slidesEl.style.transition = "";
          }, 40);
        }
      } catch (e) {}
    } else {
      const maxStart = Math.max(0, total - perView);
      const desired = idx - (perView - 1);
      const start = Math.max(0, Math.min(desired, maxStart));
      try {
        const current = typeof thumbs.index === "number" ? thumbs.index : null;
        if (current !== start) thumbs.go("=" + start);
      } catch (e) {
        try {
          thumbs.go("=" + start);
        } catch (e) {}
      }
    }
    setActiveThumb(idx);
  }

  function destroyGlides() {
    try {
      if (main && typeof main.destroy === "function") main.destroy();
    } catch (e) {}
    try {
      if (thumbs && typeof thumbs.destroy === "function") thumbs.destroy();
    } catch (e) {}
    main = null;
    thumbs = null;
  }

  function initGlides() {
    destroyGlides();
    const mainElNow = document.getElementById("esProductGlide");
    const thumbElNow = document.getElementById("esProductThumbs");
    const startAt =
      parseInt(
        (mainElNow && mainElNow.dataset.startIndex) ||
          (thumbElNow && thumbElNow.dataset.startIndex) ||
          0,
        10,
      ) || 0;

    main = new Glide("#esProductGlide", {
      type: "slider",
      startAt: startAt,
      perView: 1,
      keyboard: false,
    });

    if (thumbElNow) {
      const totalThumbs = document.querySelectorAll(
        "#esProductThumbs > .glide__track .glide__slide",
      ).length;
      let initPerView;
      if (window.innerWidth >= 1200) initPerView = 5;
      else if (window.innerWidth >= 1024) initPerView = 4;
      else if (window.innerWidth >= 767) initPerView = 4;
      else if (window.innerWidth >= 510) initPerView = 3;
      else initPerView = 3;
      initPerView = Math.max(1, Math.min(initPerView, totalThumbs || 1));

      thumbs = new Glide("#esProductThumbs", {
        type: "slider",
        startAt: startAt,
        perView: initPerView,
        gap: 8,
        bound: true,
        keyboard: false,
        breakpoints: {
          1200: { perView: 5 },
          1024: { perView: 4 },
          767: { perView: 4 },
          510: { perView: 3 },
        },
      });
    }

    // helper removed from here (now in module scope)

    main.on("run.after", () => {
      const idx = main.index;
      syncThumbs(idx);
    });

    if (thumbs) {
      thumbs.on("mount.after", () => {
        const idx = main.index;
        syncThumbs(idx);
      });
    }

    // mount in order
    if (thumbs) thumbs.mount();
    main.mount();

    // attach lightbox handlers for current DOM
    try {
      const root = document.getElementById("esProductGlide");
      if (root) {
        const openLightboxForSlide = function (slideEl) {
          var slides = Array.from(
            document.querySelectorAll("#esProductGlide .glide__slide"),
          );
          var idx = slideEl ? slides.indexOf(slideEl) : main.index || 0;
          var lb = document.getElementById("product-lightbox");
          var lbGlideEl = document.getElementById("product-lightbox-glide");
          if (lb && lbGlideEl) {
            lb.classList.remove("hidden");
            lb.classList.add("flex");

            if (!lbGlideEl._glideInstance) {
              try {
                lbGlideEl._glideInstance = new Glide(
                  "#product-lightbox-glide",
                  {
                    type: "carousel",
                    perView: 1,
                    gap: 16,
                    startAt: idx,
                    keyboard: false,
                  },
                ).mount();

                lbGlideEl._glideInstance.on("run.after", function () {
                  try {
                    main.go("=" + lbGlideEl._glideInstance.index);
                  } catch (e) {}
                });
              } catch (e) {
                console.warn("product-media: lightbox glide mount failed", e);
              }
            } else {
              try {
                lbGlideEl._glideInstance.go("=" + idx);
              } catch (e) {}
            }
          }
        };

        // keep existing zoom button behavior
        root.querySelectorAll(".slide-zoom-btn").forEach(function (el) {
          el.addEventListener("click", function (e) {
            var slideEl = e.currentTarget.closest(".glide__slide");
            openLightboxForSlide(slideEl);
          });
        });

        // delegated click: open lightbox when clicking slide images (only main gallery)
        root.addEventListener("click", function (e) {
          try {
            var clicked = e.target;
            if (!clicked) return;
            // ignore clicks on the zoom button itself (already handled)
            if (clicked.closest && clicked.closest(".slide-zoom-btn")) return;
            // find the closest slide element
            var slideEl = clicked.closest ? clicked.closest(".glide__slide") : null;
            if (!slideEl) return;
            // ignore thumbnail slides (in #esProductThumbs)
            if (slideEl.closest && slideEl.closest("#esProductThumbs")) return;
            // ensure the click target is (or is inside) an image
            var img = clicked.closest ? clicked.closest("img") : null;
            if (!img) return;
            // ignore when the image is wrapped in a link
            if (clicked.closest && clicked.closest("a")) return;
            // ensure the slide is part of the main root
            if (!root.contains(slideEl)) return;
            openLightboxForSlide(slideEl);
          } catch (err) {}
        });
      }
    } catch (e) {}
  }

  function setActiveThumb(index) {
    const slides = document.querySelectorAll("#esProductThumbs .glide__slide");
    slides.forEach((el, i) => el.classList.toggle("thumb-active", i === index));
  }

  // click thumbnails to navigate main
  document.addEventListener("click", function (e) {
    const btn =
      e.target.closest && e.target.closest("#esProductThumbs .thumb-btn");
    if (btn) {
      const slides = Array.from(
        document.querySelectorAll("#esProductThumbs .glide__slide"),
      );
      const li = btn.closest(".glide__slide");
      const idx = slides.indexOf(li);
      if (idx >= 0) main.go("=" + idx);
      // ensure thumbs reposition so active is on right after navigation
      try {
        setTimeout(function () {
          if (typeof syncThumbs === "function") syncThumbs(idx);
        }, 40);
      } catch (e) {}
    }
  });

  // initialize on load
  initGlides();

  // reinitialize when variant picker or other modules replace product content
  document.addEventListener("product:content:replaced", function (e) {
    setTimeout(function () {
      initGlides();
    }, 20);
  });

  var lbClose = document.getElementById("product-lightbox-close");
  var lb = document.getElementById("product-lightbox");
  var lbGlideEl = document.getElementById("product-lightbox-glide");
  if (lbClose && lb)
    lbClose.addEventListener("click", function () {
      lb.classList.add("hidden");
      lb.classList.remove("flex");
      // destroy lightbox instance to reset state next open
      try {
        if (lbGlideEl && lbGlideEl._glideInstance) {
          lbGlideEl._glideInstance.destroy();
          lbGlideEl._glideInstance = null;
        }
      } catch (e) {}
    });
  if (lb)
    lb.addEventListener("click", function (e) {
      if (e.target === lb) {
        lb.classList.add("hidden");
        lb.classList.remove("flex");
        try {
          if (lbGlideEl && lbGlideEl._glideInstance) {
            lbGlideEl._glideInstance.destroy();
            lbGlideEl._glideInstance = null;
          }
        } catch (e) {}
      }
    });
});
