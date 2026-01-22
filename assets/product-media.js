;(function () {
  function initGallery(e) {
    var invokedByReplacement = e && e.type === 'product:content:replaced';
    var mainEl = document.querySelector('#product-glide');
    var thumbsEl = document.querySelector('#product-thumbs');
    if (!mainEl) return;
    // On the initial page load we want to keep the product's first image
    // regardless of any `data-start-index` set by the server or URL.
    // Subsequent `product:content:replaced` events (e.g. when a user
    // actively selects a variant) will respect `data-start-index`.
    var startAt;
    if (!invokedByReplacement && !window._productMediaHasInit) {
      startAt = 0;
      window._productMediaHasInit = true;
    } else {
      startAt = parseInt(mainEl.getAttribute('data-start-index')) || 0;
    }

    // destroy previous instances
    if (mainEl._glideInstance) { try { mainEl._glideInstance.destroy(); } catch (e) {} mainEl._glideInstance = null; }
    if (thumbsEl && thumbsEl._glideInstance) { try { thumbsEl._glideInstance.destroy(); } catch (e) {} thumbsEl._glideInstance = null; }

    function mount() {
      try {
        // Main carousel
        var main = new Glide('#product-glide', {
          type: 'carousel',
          perView: 1,
          gap: 16,
          startAt: startAt
        }).mount();

        mainEl._glideInstance = main;

        // Thumbnails as a Glide carousel; initialize and sync with main carousel
        if (thumbsEl) {
          var thumbsPerView = Math.min(5, thumbsEl.querySelectorAll('.glide__slides > li').length || 5);
          var thumbs = new Glide('#product-thumbs', {
            type: 'slider',
            perView: thumbsPerView,
            gap: 8,
          }).mount();
          thumbsEl._glideInstance = thumbs;

          // click on thumb buttons
          thumbsEl.querySelectorAll('.thumb-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              var idx = parseInt(btn.getAttribute('data-thumb-index')) || 0;
              try { main.go('=' + idx); } catch (err) {}
            });
          });

          // helper to toggle active class on thumbnail items
          function setActiveThumb(index) {
            thumbsEl.querySelectorAll('.glide__slides > li').forEach(function (li, i) {
              if (i === index) li.classList.add('thumb-active'); else li.classList.remove('thumb-active');
            });
          }

          // initialize active thumb and sync both ways
          setActiveThumb(startAt || 0);
          thumbs.on('run.after', function () { try { main.go('=' + thumbs.index); setActiveThumb(thumbs.index); } catch (e) {} });
          // Only move the thumbs carousel when the active thumbnail would be outside
          // the currently visible thumbnails. This prevents the thumbnail strip from
          // scrolling on every main slide change — it will only shift when the
          // new active thumb is not visible, or when it becomes the last visible
          // thumbnail after clicking next.
          main.on('run.after', function () {
            try {
              var idx = main.index;
              var totalThumbs = (thumbsEl.querySelectorAll('.glide__slides > li').length) || 0;
              var currentThumbStart = typeof thumbs.index === 'number' ? thumbs.index : 0;
              var perViewCount = thumbsPerView || 1;
              var visibleEnd = currentThumbStart + perViewCount - 1;

              if (idx < currentThumbStart) {
                // active thumb moved to the left outside visible range -> show it as first
                thumbs.go('=' + idx);
              } else if (idx > visibleEnd) {
                // active thumb moved to the right outside visible range -> shift so
                // the active thumb becomes the last visible item
                var newStart = Math.min(Math.max(idx - perViewCount + 1, 0), Math.max(totalThumbs - perViewCount, 0));
                thumbs.go('=' + newStart);
              }
              setActiveThumb(idx);
            } catch (e) {}
          });
        }

        // lightbox: open when clicking main image
        mainEl.querySelectorAll('.glide__slide img').forEach(function (img) {
          img.style.cursor = 'zoom-in';
          img.addEventListener('click', function () {
            var lb = document.getElementById('product-lightbox');
            var lbImg = document.getElementById('product-lightbox-img');
            if (lb && lbImg) {
              lbImg.src = img.src;
              lb.classList.remove('hidden');
              lb.classList.add('flex');
            }
          });
        });

        // Wire custom arrow buttons (our arrows use data-glide-dir)
        document.querySelectorAll('.product-gallery-arrow').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            var dir = btn.getAttribute('data-glide-dir');
            if (!dir) return;
            try {
              // direct go commands like '=' + index or '>' '<' work
              if (dir.indexOf('=') === 0) main.go(dir);
              else if (dir === '>' || dir === '<') main.go(dir);
              else main.go(dir);
            } catch (err) { /* ignore */ }
          });
        });

        var lbClose = document.getElementById('product-lightbox-close');
        var lb = document.getElementById('product-lightbox');
        if (lbClose && lb) lbClose.addEventListener('click', function () { lb.classList.add('hidden'); lb.classList.remove('flex'); });
        if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) { lb.classList.add('hidden'); lb.classList.remove('flex'); } });

      } catch (e) {
        console.error('product-media: Glide init failed', e);
      }
    }

    if (window.Glide) {
      mount();
    } else {
      var src = 'https://cdn.jsdelivr.net/npm/@glidejs/glide';
      if (!document.querySelector('script[src="' + src + '"]')) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = mount;
        s.onerror = function () { console.warn('product-media: failed to load Glide'); };
        document.head.appendChild(s);
      } else {
        var t = setInterval(function () {
          if (window.Glide) { clearInterval(t); mount(); }
        }, 100);
        setTimeout(function () { clearInterval(t); }, 5000);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', initGallery);
  document.addEventListener('product:content:replaced', initGallery);
})();
