(function(){
  function getHeaderHeight(){
    try{
      var header = document.querySelector('[data-sticky-header]') || document.querySelector('.site-header') || document.querySelector('header') || document.querySelector('.header');
      if(header) return header.getBoundingClientRect().height;
    }catch(e){}
    return 0;
  }

  function getFooterHeight(){
    try{
      var footer = document.querySelector('[data-sticky-footer]') || document.querySelector('.site-footer') || document.querySelector('footer');
      if(footer) return footer.getBoundingClientRect().height;
    }catch(e){}
    return 0;
  }

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
    // Prefer existing form input updated by variant picker
    var formVariant = document.querySelector('form input[name="id"]');
    if(formVariant && formVariant.value) return formVariant.value;
    // fallback: any radio checked value (variant picker)
    var checked = document.querySelector('.product-container input[type="radio"]:checked');
    if(checked) return checked.value;
    return null;
  }

  function getQuantity(){
    var q = document.querySelector('input[name="quantity"]') || document.querySelector('input[name="sticky-quantity"]');
    if(!q) return 1;
    var n = parseInt(q.value,10);
    if(isNaN(n) || n<1) return 1;
    return n;
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

    // Quantity controls
    el.querySelectorAll('.sticky-qty-decrement').forEach(function(b){
      b.addEventListener('click', function(){
        var q = el.querySelector('.sticky-quantity-input');
        var v = parseInt(q.value,10) || 1; v = Math.max(1, v-1); q.value = v;
        // reflect to main quantity input if present
        var mainQ = document.querySelector('input[name="quantity"]'); if(mainQ) mainQ.value = q.value;
      });
    });
    el.querySelectorAll('.sticky-qty-increment').forEach(function(b){
      b.addEventListener('click', function(){
        var q = el.querySelector('.sticky-quantity-input');
        var v = parseInt(q.value,10) || 1; v = Math.min(999, v+1); q.value = v;
        var mainQ = document.querySelector('input[name="quantity"]'); if(mainQ) mainQ.value = q.value;
      });
    });

    // Add to cart handler
    var addBtn = el.querySelector('.sticky-add-to-cart');
    if(addBtn){
      addBtn.addEventListener('click', function(e){
        var variantId = getSelectedVariantId();
        var qty = parseInt(el.querySelector('.sticky-quantity-input').value,10) || 1;
        if(!variantId){
          alert('Please select a variant');
          return;
        }
        submitAddToCart(variantId, qty);
      });
    }

    // When variant-picker updates the main product content, update sticky hidden variant id and SKU
    document.addEventListener('product:content:replaced', function(){
      try{
        var mainVariant = document.querySelector('form input[name="id"]');
        var stickyInput = document.querySelector('input[name="sticky-variant-id"]');
        if(mainVariant && stickyInput) stickyInput.value = mainVariant.value;
        var skuSource = document.querySelector('#product-sku .sku-value');
        var skuTarget = document.querySelector('.sticky-sku');
        if(skuSource && skuTarget) skuTarget.textContent = skuSource.textContent.trim();
      }catch(e){/* ignore */}
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
