

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
  
console.log('--- Variant debug start ---');

  document.addEventListener('click', function () {
    console.log('Clicked');

    // Log all selects
    document.querySelectorAll('select').forEach((s, i) => {
      console.log(`Select ${i}:`, s.options[s.selectedIndex]?.text);
    });

    // Log checked radios
    document.querySelectorAll('input[type="radio"]:checked').forEach((r, i) => {
      console.log(`Radio ${i}:`, r.closest('label')?.innerText);
    });

    // Log hidden variant IDs
    document.querySelectorAll('input[name="id"]').forEach((i, idx) => {
      console.log(`Variant id input ${idx}:`, i.value);
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