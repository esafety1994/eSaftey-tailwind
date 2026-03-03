class CartQtyControl extends HTMLElement {
  constructor() {
    super();
    this.plusButton = this.querySelector("[data-plus]");
    this.minusButton = this.querySelector("[data-minus]");
    this.removeBtn = this.querySelector("[data-remove]");
    this.qtyInput = this.querySelector('[data-esinput]');
    this.isAddon = this.dataset.isAddon || false;

    // bound handlers for attach/detach
    this._onPlus = this._onPlus || this.handleClick.bind(this);
    this._onMinus = this._onMinus || this.handleClick.bind(this);
    this._onRemove = this._onRemove || this.handleClick.bind(this);
    this._onQtyChange = this._onQtyChange || this.handleInputChange.bind(this);
    console.log('cart item loaded');
    
  }

  connectedCallback() {
    if (this.plusButton) this.plusButton.addEventListener("click", this._onPlus);
    if (this.minusButton) this.minusButton.addEventListener("click", this._onMinus);
    if (this.qtyInput) this.qtyInput.addEventListener('change', this._onQtyChange);
    if (this.removeBtn) this.removeBtn.addEventListener("click", this._onRemove);
  }

  // Shared cart update helper
  updateCart(updates) {
    try {
      const formData = { updates: updates, sections: "esaftey-cart-drawer,cart-count" };
      this.setLoading(true);
      return fetch(window.Shopify.routes.root + "cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
        .then((r) => r.json())
        .then((data) => {
          if (window.location && window.location.pathname && window.location.pathname.startsWith("/cart")) {
            try { window.location.reload(); return; } catch (e) {}
          }
          document.documentElement.dispatchEvent(new CustomEvent('cart:render', { detail: data, bubbles: true }));
          this.setLoading(false);
          return data;
        })
        .catch((err) => {
          console.error('Error updating cart', err);
          this.setLoading(false);
          throw err;
        });
    } catch (e) {
      this.setLoading(false);
      return Promise.reject(e);
    }
  }

  handleClick(event) {
    try {
      let itemKey = this.dataset.key;
      let qty = 0;
      const src = event.currentTarget || event.target;
      qty = parseInt((src && src.dataset && src.dataset.quantity) || 0, 10) || 0;

      // update numeric input UI so the control stays in sync
      if (this.qtyInput) {
        try { this.qtyInput.value = qty; } catch (e) {}
      }

      let updates = {};
      updates[itemKey] = qty;

      if (this.isAddon) {
        const addonLineKeyElement = document.querySelector(`[data-addon-parent_key="${itemKey}"]`);
        if (addonLineKeyElement) {
          const addonLineKey = addonLineKeyElement.getAttribute('data-addon-line-key');
          if (addonLineKey) updates[addonLineKey] = qty;
        }
      }

      this.updateCart(updates).catch(() => {});
    } catch (e) { console.error(e); }
  }

  handleInputChange(event) {
    try {
      const raw = (this.qtyInput && this.qtyInput.value) || '';
      const value = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
      const qty = isNaN(value) ? 0 : value;
      let itemKey = this.dataset.key;
      let updates = {};
      updates[itemKey] = qty;
      if (this.isAddon) {
        const addonLineKeyElement = document.querySelector(`[data-addon-parent_key="${itemKey}"]`);
        if (addonLineKeyElement) {
          const addonLineKey = addonLineKeyElement.getAttribute('data-addon-line-key');
          if (addonLineKey) updates[addonLineKey] = qty;
        }
      }
      this.updateCart(updates).catch(() => {});
    } catch (e) { console.error(e); }
  }

  disconnectedCallback() {
    try {
      if (this.plusButton && this._onPlus) this.plusButton.removeEventListener('click', this._onPlus);
      if (this.minusButton && this._onMinus) this.minusButton.removeEventListener('click', this._onMinus);
      if (this.removeBtn && this._onRemove) this.removeBtn.removeEventListener('click', this._onRemove);
      if (this.qtyInput && this._onQtyChange) this.qtyInput.removeEventListener('change', this._onQtyChange);
    } catch (e) {}
  }

  setLoading(loading) {
    const indicator = this.querySelector(".qty-loading");
    const buttons = this.querySelectorAll("button");
    if (indicator) indicator.classList.toggle("hidden", !loading);
    buttons.forEach((b) => (b.disabled = loading));
    // dim the entire cart table (preferred) or fallback to the closest row/container
    const table = this.closest("table");
    if (table) {
      table.classList.toggle("opacity-50", loading);
      table.classList.toggle("pointer-events-none", loading);
    } else {
      const row = this.closest("tr") || this.closest("div");
      if (row) {
        row.classList.toggle("opacity-50", loading);
      }
    }
  }
}

customElements.define("cart-qty-control", CartQtyControl);
