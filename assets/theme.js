

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
    }
  });

  try{ window.applyHoverImages(); } catch(e){}

  // ---- Design upload visibility (SKU-based) ----
  const wrapper = document.getElementById('design-upload-wrapper');
    if (!wrapper || !window.productVariants) return;

    const allowedSkus = wrapper.dataset.uploadSkus
      .split(',')
      .map(s => s.trim());

    function checkVariantById() {
      const idInput = document.querySelector('input[name="id"]');
      if (!idInput) return;

      const variant = window.productVariants.find(
        v => String(v.id) === String(idInput.value)
      );

      if (!variant) return;

      if (allowedSkus.includes(variant.sku)) {
        wrapper.classList.remove('hidden');
      } else {
        wrapper.classList.add('hidden');
        const file = wrapper.querySelector('input[type="file"]');
        if (file) file.value = '';
      }
    }

    // Observe changes to the variant ID input (even if set by JS)
    const observer = new MutationObserver(checkVariantById);
    const idInput = document.querySelector('input[name="id"]');

    if (idInput) {
      observer.observe(idInput, { attributes: true, attributeFilter: ['value'] });
      checkVariantById(); // initial run
    }

  }

  // Run once on load
  updateVisibility();

  // Run whenever variant changes
  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'id') {
      updateVisibility();
    }
  });
  
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