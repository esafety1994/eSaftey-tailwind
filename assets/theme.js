

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
  const wrappers = document.querySelectorAll('[data-design-upload]');
  if (!wrappers.length || !window.productVariants) return;

  function updateUploadVisibility() {
    const variantIdInput = document.querySelector('input[name="id"]');
    if (!variantIdInput) return;

    const currentVariant = window.productVariants.find(
      v => String(v.id) === String(variantIdInput.value)
    );

    if (!currentVariant) return;

    wrappers.forEach(wrapper => {
      const allowedSkus = wrapper.dataset.uploadSkus
        .split(',')
        .map(sku => sku.trim());

      if (allowedSkus.includes(currentVariant.sku)) {
        wrapper.classList.remove('hidden');
      } else {
        wrapper.classList.add('hidden');

        const fileInput = wrapper.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      }
    });
  }

  // Initial run (page load)
  updateUploadVisibility();

  // Re-run whenever variant changes
  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'id') {
      updateUploadVisibility();
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