class ProductFixingAddons extends HTMLElement {
  connectedCallback(){
    try{
      this.setup();
    } catch(e){ console.error('product-fixing init', e); }
  }

  setup(){
    // nothing to do server-side for markup; attach behavior
    this.form = document.querySelector('#product-act-button form');
    if (!this.form) return;
    // ensure we only attach once
    if (this.form._productFixingHandlerAttached) return;
    this.form._productFixingHandlerAttached = true;

    // Ensure we only patch fetch once to watch for main product add responses
    if (!window.__pf_fetch_patched) {
      window.__pf_fetch_patched = true;
      const _origFetch = window.fetch.bind(window);
      window.fetch = async function(resource, init) {
        const resp = await _origFetch(resource, init);
        try {
          const url = (typeof resource === 'string') ? resource : (resource && resource.url);
          if (url && url.indexOf('/cart/add.js') !== -1 && window.__pf_pendingAddon) {
            // parse response JSON to obtain parent item key
            let data = null;
            try { data = await resp.clone().json(); } catch(e) { data = null; }
            const parentKey = data && data.key ? data.key : null;
            const pending = window.__pf_pendingAddon;
            // attempt to add the addon and pass parent_key when available
            const props = parentKey ? { is_addon: 'true', parent_key: parentKey } : { is_addon: 'true' };
            try {
              await _origFetch('/cart/add.js', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ id: pending.addonId, quantity: pending.qty, properties: props })
              });
            } catch(e) { console.error('Failed to add addon after main add', e); }
            // refresh drawer
            if (typeof window.fetchCart === 'function') {
              try { await window.fetchCart(); } catch(e) {}
            }
            if (typeof window.openCartDrawer === 'function') {
              window.openCartDrawer();
            } else {
              const cartBtn = document.getElementById('cart-btn');
              if (cartBtn) cartBtn.click();
            }
            delete window.__pf_pendingAddon;
          }
        } catch(e) { /* ignore */ }
        return resp;
      };
    }

    // Use capture phase handler to run before other listeners and prevent double-adds.
    this.form.addEventListener('submit', async function(e) {
      const selected = document.querySelector('product-fixing-addons .addon-radio:checked');
      if (!selected) return; // no addon selected; allow normal flow
      const addonId = Number(selected.dataset.variantId || selected.value) || null;
      if (!addonId) return; // default/no-fixing selected

      // prevent other handlers from also adding the main product
      e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      // read quantity from DOM (prefer form field)
      let qty = 1;
      try {
        const fd = new FormData(this);
        qty = Number(fd.get('quantity') || this.querySelector('input[name="quantity"]')?.value || 1) || 1;
      } catch(err) { qty = 1; }

      // spinner/button feedback
      const button = this.querySelector('button[type="submit"]');
      const originalText = button ? button.textContent : null;
      function _spinnerHtml() { return '<svg class="animate-spin inline-block w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>'; }
      if (button) { button.innerHTML = _spinnerHtml(); button.disabled = true; button.setAttribute('aria-busy','true'); }

      try {
        // add main product(s) and addon(s)
        const fd = new FormData(this);
        const mainVariant = Number(fd.get('id') || this.querySelector('input[name="id"]')?.value);

        if (addonId) {
          // Add main product with a distinguishing property so items with the same fixing group together.
          // This creates one parent line with quantity `qty` for this fixing, then we attach the addon as a sub-line.
          const mainResp = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id: mainVariant, quantity: qty, properties: { fixing_id: String(addonId) } })
          });
          let mainItem = null;
          try { mainItem = await mainResp.json(); } catch(e) { mainItem = null; }
          const parentKey = mainItem && mainItem.key ? mainItem.key : null;

          await fetch('/cart/add.js', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id: addonId, quantity: qty, properties: parentKey ? { is_addon: 'true', parent_key: parentKey } : { is_addon: 'true' } })
          });
        } else {
          // No addon selected — add main product normally
          await fetch('/cart/add.js', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id: mainVariant, quantity: qty })
          });
        }

        // Refresh cart UI and open drawer
        if (typeof fetchCart === 'function') {
          try { await fetchCart(); } catch(e) {}
        }
        if (typeof openCartDrawer === 'function') {
          openCartDrawer();
        } else {
          const cartBtn = document.getElementById('cart-btn');
          if (cartBtn) cartBtn.click();
        }
      } catch(err) {
        console.error('Add to cart (fixings) failed', err);
        // fallback: submit the form normally
        try { this.submit(); } catch(e) {}
      } finally {
        if (button) {
          setTimeout(() => { button.textContent = originalText || ''; button.disabled = false; button.removeAttribute('aria-busy'); }, 300);
        }
      }
    }, true);
  }
}

customElements.define('product-fixing-addons', ProductFixingAddons);
