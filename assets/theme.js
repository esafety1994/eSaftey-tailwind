

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
  const uploadWrapper = document.getElementById('design-upload-wrapper');
  if (!uploadWrapper) return;

  const allowedSkus = uploadWrapper.dataset.uploadSkus
    .split(',')
    .map(sku => sku.trim());

  function evaluateUploadVisibility() {
    const variantIdInput = document.querySelector('input[name="id"]');
    if (!variantIdInput) return;

    const variantId = variantIdInput.value;

    // Make sure variant data is available
    if (!window.productVariants) return;

    const currentVariant = window.productVariants.find(
      v => String(v.id) === String(variantId)
    );

    if (!currentVariant || !currentVariant.sku) return;

    if (allowedSkus.includes(currentVariant.sku)) {
      uploadWrapper.classList.remove('hidden');
    } else {
      uploadWrapper.classList.add('hidden');

      // Clear file if switching to non-custom variant
      const input = uploadWrapper.querySelector('input[type="file"]');
      if (input) input.value = '';
    }
  }

  // Run once on initial page load
  evaluateUploadVisibility();

  // Re-run whenever the variant selection changes
  document.addEventListener('change', function (event) {
    if (event.target && event.target.name === 'id') {
      evaluateUploadVisibility();
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