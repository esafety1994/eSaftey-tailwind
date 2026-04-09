

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
  const variantEvent = new CustomEvent('variant:change', {
    detail: {
      variant: window?.Shopify?.currentVariant || null
    }
  });
  document.dispatchEvent(variantEvent);
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

document.addEventListener('variant:change', function (event) {
  const wrapper = document.getElementById('design-upload-wrapper');
  if (!wrapper || !event.detail || !event.detail.variant) return;

  const allowedSkus = wrapper.dataset.uploadSkus
    .split(',')
    .map(sku => sku.trim());

  const selectedSku = event.detail.variant.sku;

  if (allowedSkus.includes(selectedSku)) {
    wrapper.classList.remove('hidden');
  } else {
    wrapper.classList.add('hidden');

    // Clear file if switching to a non‑custom variant
    const input = wrapper.querySelector('input[type="file"]');
    if (input) input.value = '';
  }
});