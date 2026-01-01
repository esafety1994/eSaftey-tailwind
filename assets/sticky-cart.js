(function(){

  function showSticky(){
    var el = document.querySelector('[data-sticky-cart]');
    if(!el) return;
    // pin to bottom of viewport
    el.style.bottom = '0px';
    // Make visible and slide in
    el.classList.remove('hidden');
    // ensure it's not still animating hidden state
    // reset any previously-set transform and bring into view
    requestAnimationFrame(function(){ el.style.transform = 'translateY(0)'; });
    el.setAttribute('aria-hidden','false');

    // ensure footer has padding so its content isn't covered by the sticky
    try{
      var h = Math.ceil(el.getBoundingClientRect().height || 0);
      applyFooterPadding(h);
    }catch(e){}
  }

  function hideSticky(){
    var el = document.querySelector('[data-sticky-cart]');
    if(!el) return;
    // Slide down by the element's full height (plus a small buffer) so it's fully off-screen
    try{
      var h = el.getBoundingClientRect().height || 0;
      el.style.transform = 'translateY(' + (Math.ceil(h) + 20) + 'px)';
      // remove footer padding we added
      restoreFooterPadding();
    }catch(e){
      el.style.transform = 'translateY(200%)';
      restoreFooterPadding();
    }
    el.setAttribute('aria-hidden','true');
    // add hidden class after animation completes
    setTimeout(function(){ try{ el.classList.add('hidden'); }catch(e){} }, 300);
  }

  function getFooterElement(){
    return document.querySelector('[data-sticky-footer]') || document.querySelector('.site-footer') || document.querySelector('footer');
  }

  function applyFooterPadding(pixels){
    var footer = getFooterElement();
    if(footer){
      // store original padding-bottom if not stored
      if (footer.dataset && footer.dataset._origPaddingBottom === undefined) {
        footer.dataset._origPaddingBottom = window.getComputedStyle(footer).paddingBottom || '0px';
      }
      footer.style.paddingBottom = (parseInt(footer.dataset._origPaddingBottom || 0, 10) + pixels) + 'px';
      return;
    }
    // fallback: add padding to body
    var body = document.body;
    if(body){
      if (body.dataset && body.dataset._origPaddingBottom === undefined) {
        body.dataset._origPaddingBottom = window.getComputedStyle(body).paddingBottom || '0px';
      }
      body.style.paddingBottom = (parseInt(body.dataset._origPaddingBottom || 0, 10) + pixels) + 'px';
    }
  }

  function restoreFooterPadding(){
    var footer = getFooterElement();
    if(footer && footer.dataset && footer.dataset._origPaddingBottom !== undefined){
      footer.style.paddingBottom = footer.dataset._origPaddingBottom;
      try{ delete footer.dataset._origPaddingBottom; }catch(e){ footer.removeAttribute('data-_orig-padding-bottom'); }
      return;
    }
    var body = document.body;
    if(body && body.dataset && body.dataset._origPaddingBottom !== undefined){
      body.style.paddingBottom = body.dataset._origPaddingBottom;
      try{ delete body.dataset._origPaddingBottom; }catch(e){ body.removeAttribute('data-_orig-padding-bottom'); }
    }
  }

  // content syncing removed — sticky should render its own content server-side

  function getSelectedVariantId(){
    // Prefer sticky-specific hidden input (kept in sync with selection), then
    // the main form input, then radios/selects as fallback.
    var stickyInput = document.querySelector('input[name="sticky-variant-id"]');
    if (stickyInput && stickyInput.value) return stickyInput.value;

    var formVariant = document.querySelector('form input[name="id"]');
    if (formVariant && formVariant.value) return formVariant.value;

    var checked = document.querySelector('.product-container input[type="radio"]:checked');
    if (checked && checked.value) return checked.value;

    var sel = document.querySelector('.product-container select[name="id"], select[name="id"]');
    if (sel && sel.value) return sel.value;

    return null;
  }

  function submitAddToCart(variantId, quantity){
    // try to find the main product form and submit it
    var form = document.querySelector('form[action*="/cart/add"]') || document.querySelector('form');
    if(form){
      var idInput = form.querySelector('input[name="id"]');
      if(idInput) idInput.value = variantId;
      var qtyInput = form.querySelector('input[name="quantity"]');
      if(qtyInput) qtyInput.value = quantity;
      // trigger click on submit button inside form
      var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if(submitBtn){ submitBtn.click(); return; }
      try{ form.submit(); return; }catch(e){}
    }

    // fallback: AJAX add to cart
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ id: variantId, quantity: quantity })
    }).then(function(resp){ return resp.json(); }).then(function(data){
      try{ window.location.href = '/cart'; }catch(e){}
    }).catch(function(err){ console.error('Add to cart failed', err); });
  }

  function initStickyCart(){
    var el = document.querySelector('[data-sticky-cart]');
    if(!el) return;

    // Show sticky once on load

    // We'll show/hide based on the visibility of the main add-to-cart button
    var mainAddBtn = document.querySelector('button.primary-cart-button, form button[type="submit"].primary-cart-button, form button[type="submit"]');
    function updateVisibilityByMainButton(isVisible){
      if(isVisible) hideSticky(); else showSticky();
    }

    if(mainAddBtn && 'IntersectionObserver' in window){
      try{
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            // Show when button is NOT intersecting
            updateVisibilityByMainButton(entry.isIntersecting);
          });
        }, { root: null, threshold: 0.05 });
        io.observe(mainAddBtn);
      }catch(e){
        // fallback: show when scrolled past button
        showStickyWhenScrolledPast(mainAddBtn);
      }
    } else if(mainAddBtn){
      showStickyWhenScrolledPast(mainAddBtn);
    } else {
      // no main button found — use scroll threshold fallback (show when scrolled >= 800px)
      function checkScrollThreshold(){
        if(window.pageYOffset >= 800) showSticky(); else hideSticky();
      }
      checkScrollThreshold();
      window.addEventListener('scroll', checkScrollThreshold);
      window.addEventListener('resize', checkScrollThreshold);
    }

    // Quantity controls are handled by the `qty-selector` snippet's own script;
    // avoid duplicating click handlers here to prevent double increments.

    // Add to cart handler — attach to the sticky form's submit button if present,
    // otherwise attach to any explicit sticky-add-to-cart selector. This ensures
    // we update the sticky form's hidden `id` before native submit so the right
    // variant is added.
    var addBtn = el.querySelector('button[type="submit"], input[type="submit"], .sticky-add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', function (e) {
        // Prevent native submit; we'll submit after ensuring the correct id
        e.preventDefault();
        var variantId = getSelectedVariantId();
        var qtyElem = el.querySelector('input[name="quantity"]') || el.querySelector('.quantity-input') || document.querySelector('input[name="quantity"]');
        var qty = 1;
        try { qty = parseInt(qtyElem && qtyElem.value ? qtyElem.value : 1, 10) || 1; } catch(ex) { qty = 1; }
        if (!variantId) {
          alert('Please select a variant');
          return;
        }

        // Try to find a form inside the sticky element first
        var stickyForm = el.querySelector('form[action*="/cart/add"], form');
        if (stickyForm) {
          var idInput = stickyForm.querySelector('input[name="id"]');
          if (idInput) idInput.value = variantId;
          var qtyInput = stickyForm.querySelector('input[name="quantity"]');
          if (qtyInput) qtyInput.value = qty;
          // submit using requestSubmit() when available to respect validation
          try {
            if (typeof stickyForm.requestSubmit === 'function') { stickyForm.requestSubmit(); return; }
            stickyForm.submit(); return;
          } catch (err) {
            // fall through to AJAX fallback
          }
        }

        // no sticky form found — update main form or fallback to AJAX
        submitAddToCart(variantId, qty);
      });
    }

    // Shared update: copy variant id, SKU, price and image from main product DOM into sticky
    function updateStickyContent(root){
      try{
        root = root || document;
        var mainVariant = root.querySelector('form input[name="id"]') || document.querySelector('form input[name="id"]');
        var stickyInput = document.querySelector('input[name="sticky-variant-id"]');
        if(mainVariant && stickyInput) stickyInput.value = mainVariant.value;

        // SKU
        var skuSource = root.querySelector('#product-sku .sku-value') || document.querySelector('#product-sku .sku-value');
        var skuTarget = document.querySelector('.sticky-sku');
        if(skuSource && skuTarget) skuTarget.textContent = skuSource.textContent.trim();

        // Price (copy innerHTML so formatting remains) but strip any "Save" green text
        var priceSrc = root.querySelector('#product-price') || document.getElementById('product-price');
        var priceTarget = document.getElementById('sticky-price');
        if(priceSrc && priceTarget) {
          try {
            var tmp = document.createElement('div');
            tmp.innerHTML = priceSrc.innerHTML || '';
            // remove any green 'Save' text that shouldn't appear in sticky
            var save = tmp.querySelectorAll('.text-green-600');
            if(save && save.length) {
              save.forEach(function(n){ if(n && n.parentNode) n.parentNode.removeChild(n); });
            }
            priceTarget.innerHTML = tmp.innerHTML;
          } catch(e) {
            priceTarget.innerHTML = priceSrc.innerHTML;
          }
        }

        // Image: prefer image inside the updated root, fallback to gallery or featured
        var stickyImg = document.querySelector('.sticky-image');
        if (stickyImg) {
          // Determine currently selected variant id
          var variantId = (mainVariant && mainVariant.value) || (stickyInput && stickyInput.value) || null;

          // Try to find an image associated with the variant inside the supplied root
          var candidate = null;
          if (variantId) {
            // common attribute patterns used by themes for variant-media mapping
            candidate = root.querySelector('img[data-variant-id="' + variantId + '"]') ||
                        root.querySelector('img[data-media-id="' + variantId + '"]') ||
                        root.querySelector('[data-media-id="' + variantId + '"] img') ||
                        root.querySelector('[data-image-id="' + variantId + '"] img');
          }

          // fallback: if gallery exists, use its data-start-index to pick the correct image
          var gallery = root.querySelector('#product-glide') || document.querySelector('#product-glide');
          if (gallery) {
            var imgs = gallery.querySelectorAll('img');
            var startIndex = parseInt(gallery.getAttribute('data-start-index') || gallery.dataset.startIndex || 0, 10) || 0;
            if (imgs && imgs.length) candidate = imgs[Math.min(startIndex, imgs.length - 1)] || imgs[0];
          }

          // fallback: featured image marker
          if (!candidate) candidate = root.querySelector('[data-featured-image] img, img[data-featured-image]');
          // fallback: gallery first image within the root
          if (!candidate) candidate = root.querySelector('#product-glide img, .product-media-gallery img');
          // final fallback: any gallery image on document
          if (!candidate) candidate = document.querySelector('#product-glide img, .product-media-gallery img');

          if (candidate) {
            if (candidate.src) stickyImg.src = candidate.src;
            if (candidate.currentSrc) stickyImg.src = candidate.currentSrc;
            if (candidate.alt) stickyImg.alt = candidate.alt;
          }
        }
      }catch(e){/* ignore */}
      // Also keep sticky button text/state in sync with main button
      try { updateStickyButton(root); } catch(e) {}
    }

    function updateStickyButton(root){
      try{
        root = root || document;
        // Find the source submit button inside the main product area
        var sourceBtn = root.querySelector('#product-act-button button[type="submit"], #product-act-button .primary-cart-button, .product-container button.primary-cart-button, form button.primary-cart-button');
        var stickyEl = document.querySelector('[data-sticky-cart]');
        if(!stickyEl || !sourceBtn) return;
        var stickyBtn = stickyEl.querySelector('button[type="submit"], input[type="submit"], .sticky-add-to-cart');
        if(!stickyBtn) return;

        // Update text/content without replacing the element so event handlers persist
        try {
          // Prefer textContent update; if source has innerHTML extras, copy that instead
          if(sourceBtn.innerHTML && sourceBtn.innerHTML.trim() !== '') stickyBtn.innerHTML = sourceBtn.innerHTML;
          else stickyBtn.textContent = sourceBtn.textContent.trim();
        } catch(e) { stickyBtn.textContent = sourceBtn.textContent.trim(); }

        // Update disabled state and helper classes
        if(sourceBtn.disabled || sourceBtn.getAttribute('aria-disabled') === 'true'){
          stickyBtn.disabled = true;
          stickyBtn.setAttribute('aria-disabled','true');
          stickyBtn.classList.add('opacity-50');
          stickyBtn.classList.add('cursor-not-allowed');
        } else {
          stickyBtn.disabled = false;
          stickyBtn.setAttribute('aria-disabled','false');
          stickyBtn.classList.remove('opacity-50');
          stickyBtn.classList.remove('cursor-not-allowed');
        }
      }catch(e){/* ignore */}
    }

    // ensure sticky content mirrors the initial/default variant on init
    try { updateStickyContent(); } catch (e) { }

    // Update when variant-picker dispatches (after AJAX replacement)
    document.addEventListener('product:content:replaced', function(e){
      var root = (e && e.detail && e.detail.root) ? e.detail.root : null;
      updateStickyContent(root);
    });

    // Immediate update when variant selection changes (optimistic)
    document.addEventListener('product:variant:changing', function(e){
      try{
        var vid = e && e.detail && e.detail.variantId ? e.detail.variantId : null;
        if(!vid) return;
        var stickyInput = document.querySelector('input[name="sticky-variant-id"]');
        if(stickyInput) stickyInput.value = vid;
        // Attempt to update sticky image/price/SKU from document immediately
        updateStickyContent(document);
        try { updateStickyButton(document); } catch(e) {}
      }catch(err){}
    });

    // Also listen for input changes (radio/select) to update sticky variant id immediately
    document.addEventListener('change', function(e){
      try{
        var t = e.target;
        if(!t) return;
        if(t.matches && (t.matches('input[type="radio"]') || t.matches('select') || t.matches('input[name="id"]'))){
          // Update sticky variant id quickly so add-to-cart uses current selection
          var stickyInput = document.querySelector('input[name="sticky-variant-id"]');
          if(stickyInput){
            var newVal = null;
            if(t.matches('input[type="radio"]') && t.value) newVal = t.value;
            if(t.matches('select')) newVal = t.value;
            if(t.matches('input[name="id"]')) newVal = t.value;
            if(newVal) stickyInput.value = newVal;
          }
          // let product:content:replaced handle price/image update; no immediate full sync here
        }
      }catch(err){}
    });



    // reposition on resize
    window.addEventListener('resize', function(){ showSticky(); });
  }

  // Fallback visibility: show sticky when window has scrolled past the button
  function showStickyWhenScrolledPast(targetBtn){
    if(!targetBtn) { showSticky(); return; }
    function check(){
      var rect = targetBtn.getBoundingClientRect();
      var inView = rect.top < window.innerHeight && rect.bottom >= 0;
      if(inView) hideSticky(); else showSticky();
    }
    check();
    window.addEventListener('scroll', check);
    window.addEventListener('resize', check);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStickyCart); else initStickyCart();

})();
