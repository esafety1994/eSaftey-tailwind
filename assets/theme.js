

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
  document.addEventListener('DOMContentLoaded', function () {
    const wrapper = document.getElementById('design-upload-wrapper');
    if (!wrapper || !window.productVariants) return;

    const allowedSkus = wrapper.dataset.uploadSkus
      .split(',')
      .map(sku => sku.trim());

    function updateVisibility() {
      const variantIdInput = document.querySelector('input[name="id"]');
      if (!variantIdInput) return;

      const variant = window.productVariants.find(
        v => String(v.id) === String(variantIdInput.value)
      );

      if (!variant) return;

      if (allowedSkus.includes(variant.sku)) {
        wrapper.classList.remove('hidden');
      } else {
        wrapper.classList.add('hidden');

        // Clear file if switching away
        const input = wrapper.querySelector('input[type="file"]');
        if (input) input.value = '';
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