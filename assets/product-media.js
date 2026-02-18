document.addEventListener("DOMContentLoaded", function () {
  let main = null;
  let thumbs = null;

  const totalSlidesEl = document.querySelector("[data-esProductGlideCount]");
  const totalSlides = totalSlidesEl
    ? parseInt(totalSlidesEl.getAttribute("data-esProductGlideCount"), 10)
    : null;

  // =========================
  // ✅ YOUTUBE IFRAME SUPPORT
  // =========================
  let ytApiReady = false;
  const ytPlayers = new Map(); // iframe -> YT.Player

  function loadYouTubeAPIOnce() {
    if (window.YT && window.YT.Player) {
      ytApiReady = true;
      return;
    }
    if (document.querySelector('script[data-yt-iframe-api="1"]')) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.setAttribute("data-yt-iframe-api", "1");
    document.head.appendChild(tag);

    // If another script sets this, we chain it safely.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      ytApiReady = true;
      try { if (typeof prev === "function") prev(); } catch (e) {}
    };
  }

  function isYouTubeIframe(iframe) {
    if (!iframe) return false;
    const src = (iframe.getAttribute("src") || "").toLowerCase();
    return src.includes("youtube.com/embed") || src.includes("youtube-nocookie.com/embed");
  }

  function getActiveYouTubeIframe(rootSelector) {
    try {
      const active = document.querySelector(rootSelector + " .glide__slide--active");
      if (!active) return null;
      const iframe = active.querySelector("iframe");
      if (iframe && isYouTubeIframe(iframe)) return iframe;
    } catch (e) {}
    return null;
  }

  function getOrCreateYTPlayer(iframe) {
    if (!iframe) return null;
    if (ytPlayers.has(iframe)) return ytPlayers.get(iframe);

    if (!ytApiReady || !(window.YT && window.YT.Player)) return null;

    // Ensure enablejsapi=1 so postMessage API works reliably
    try {
      const src = iframe.getAttribute("src") || "";
      if (src && !src.includes("enablejsapi=1")) {
        const glue = src.includes("?") ? "&" : "?";
        iframe.setAttribute("src", src + glue + "enablejsapi=1");
      }
    } catch (e) {}

    try {
      const player = new window.YT.Player(iframe, {
        events: {
          onReady: function () {
            // no-op
          }
        }
      });
      ytPlayers.set(iframe, player);
      return player;
    } catch (e) {
      return null;
    }
  }

  function playYouTubeIn(rootSelector) {
    const iframe = getActiveYouTubeIframe(rootSelector);
    if (!iframe) return;

    loadYouTubeAPIOnce();

    // If API not ready yet, retry shortly (first time only)
    if (!ytApiReady) {
      setTimeout(() => playYouTubeIn(rootSelector), 250);
      return;
    }

    const p = getOrCreateYTPlayer(iframe);
    if (!p) {
      // fallback: send postMessage directly (works if enablejsapi=1)
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      } catch (e) {}
      return;
    }

    try { p.playVideo(); } catch (e) {}
  }

  function pauseAllYouTubeIn(selector) {
    try {
      document.querySelectorAll(selector + " iframe").forEach((iframe) => {
        if (!isYouTubeIframe(iframe)) return;

        // Try player API
        const p = ytPlayers.get(iframe);
        if (p) {
          try { p.pauseVideo(); } catch (e) {}
          return;
        }

        // Fallback postMessage
        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*"
          );
        } catch (e) {}
      });
    } catch (e) {}
  }

  // =========================
  // EXISTING FUNCTIONS
  // =========================
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
    try {
      if (main && typeof main.destroy === "function") main.destroy();
    } catch (e) {}
    try {
      if (thumbs && typeof thumbs.destroy === "function") thumbs.destroy();
    } catch (e) {}

    try {
      const mainElNow = document.getElementById("esProductGlide");
      if (mainElNow && mainElNow._glideInstance) mainElNow._glideInstance = null;
    } catch (e) {}
    try {
      const thumbElNow = document.getElementById("esProductThumbs");
      if (thumbElNow && thumbElNow._glideInstance) thumbElNow._glideInstance = null;
    } catch (e) {}

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

    // ✅ also pause all youtube iframes
    pauseAllYouTubeIn("#esProductGlide");
    pauseAllYouTubeIn("#product-lightbox");
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

      if (isLightboxOpen()) return;

      // ✅ autoplay MP4 video
      try {
        const activeVideo = document.querySelector(
          "#esProductGlide .glide__slide--active video"
        );
        if (activeVideo) {
          activeVideo.play().catch(() => {});
          return; // if mp4 exists, prefer it
        }
      } catch (e) {}

      // ✅ autoplay YouTube embed if present
      playYouTubeIn("#esProductGlide");
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

    // expose instances on DOM elements so other scripts can call go() directly
    try {
      const mainElNow2 = document.getElementById("esProductGlide");
      if (mainElNow2) mainElNow2._glideInstance = main;
    } catch (e) {}
    try {
      const thumbElNow2 = document.getElementById("esProductThumbs");
      if (thumbElNow2) thumbElNow2._glideInstance = thumbs;
    } catch (e) {}

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

            lbGlideEl._glideInstance.on("run.before", function () {
              pauseAllVideos();
            });

            lbGlideEl._glideInstance.on("run.after", function () {
              try {
                main.go("=" + lbGlideEl._glideInstance.index);
              } catch (e) {}

              // ✅ autoplay MP4 video in lightbox
              try {
                const activeLbVideo = document.querySelector(
                  "#product-lightbox .glide__slide--active video"
                );
                if (activeLbVideo) {
                  activeLbVideo.play().catch(() => {});
                  return;
                }
              } catch (e) {}

              // ✅ autoplay YouTube embed in lightbox
              playYouTubeIn("#product-lightbox");
            });
          } else {
            lbGlideEl._glideInstance.go("=" + idx);

            setTimeout(() => {
              // ✅ try MP4 first
              try {
                const activeLbVideo = document.querySelector(
                  "#product-lightbox .glide__slide--active video"
                );
                if (activeLbVideo) {
                  activeLbVideo.play().catch(() => {});
                  return;
                }
              } catch (e) {}

              // ✅ then YouTube
              playYouTubeIn("#product-lightbox");
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
      pauseVideosIn("#product-lightbox");
      pauseAllYouTubeIn("#product-lightbox");

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
        pauseAllYouTubeIn("#product-lightbox");

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
