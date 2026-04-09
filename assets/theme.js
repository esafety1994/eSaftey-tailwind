

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
  if (!wrappers.length) return;

  function getSelectedOptionText() {
    // Works for dropdowns, radio buttons, and button groups
    const select = document.querySelector('select');
    if (select) return select.options[select.selectedIndex]?.text?.trim();

    const checkedRadio = document.querySelector('input[type="radio"]:checked');
    if (checkedRadio) {
      const label = checkedRadio.closest('label');
      return label ? label.innerText.trim() : null;
    }

    const activeButton = document.querySelector('[aria-pressed="true"], .is-active, .active');
    if (activeButton) return activeButton.innerText.trim();

    return null;
  }

  function updateUploads() {
    const selectedText = getSelectedOptionText();
    if (!selectedText) return;

    wrappers.forEach(wrapper => {
      const allowedOptions = wrapper.dataset.uploadOptions
        .split(',')
        .map(s => s.trim());

      if (allowedOptions.includes(selectedText)) {
        wrapper.classList.remove('hidden');
      } else {
        wrapper.classList.add('hidden');
        const file = wrapper.querySelector('input[type="file"]');
        if (file) file.value = '';
      }
    });
  }

  // Initial run
  updateUploads();

  // Re-run on any interaction
  document.addEventListener('click', updateUploads);
  document.addEventListener('change', updateUploads);
  
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