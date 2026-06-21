

//move this to PDP qty selector
document.addEventListener("DOMContentLoaded", function () {
  // Quantity increment/decrement handlers for `.qty-selector`
  document.addEventListener("click", function (e) {
    const dec = e.target.closest(".qty-decrement");
    const inc = e.target.closest(".qty-increment");

    if (dec || inc) {
      const btn = dec || inc;
      const container = btn.closest(".qty-selector");
      if (!container) return;
      const input = container.querySelector('input[name="quantity"]');
      if (!input) return;
      let val = parseInt(input.value, 10);
      if (isNaN(val)) val = 1;
      if (dec) {
        val = Math.max(1, val - 1);
      } else {
        val = val + 1;
      }
      input.value = String(val);
      // Notify the global qty-sync listener so other qty inputs match (main ↔ sticky)
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  try{ window.applyHoverImages(); } catch(e){}
});

document.addEventListener('DOMContentLoaded', function () {
  var heroBanner = document.querySelector('.hero-banner');
  if (heroBanner && typeof Glide !== 'undefined') {
    new Glide('.hero-banner', {
      type: 'slider',
      autoplay: false,
      hoverpause: true,
      perView: 1,
    }).mount();
  }

  var announcementGlide = document.querySelector('.announcement-glide');
  if (announcementGlide && typeof Glide !== 'undefined') {
    new Glide('.announcement-glide', {
      type: 'slider',
      autoplay: 8000,
      animationDuration: 1000,
      perView: 1,
      hoverpause: true,
    }).mount();
  }

  var closeBtn = document.getElementById('announcement-close');
  var bar = document.getElementById('announcement-bar');
  if (closeBtn && bar) {
    closeBtn.addEventListener('click', function () {
      bar.classList.add('opacity-0', '-translate-y-full');
      bar.classList.remove('opacity-100', 'translate-y-0');
      setTimeout(function () { bar.style.display = 'none'; }, 500);
    });
  }
});

// Hover image helper: move from inline snippet to central theme asset
window.applyHoverImages = function(){
  try{
    if(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches){
      document.querySelectorAll('img[data-hover-src]').forEach(function(img){
        if(!img.getAttribute('src')) img.setAttribute('src', img.getAttribute('data-hover-src'));
      });
    }
  }catch(e){ /* ignore */}
};