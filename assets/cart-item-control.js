class CartQtyControl extends HTMLElement {
  constructor() {
    super();
    this.line = this.dataset.line;
    this.qty = parseInt(this.dataset.quantity || '1', 10);
  }

  connectedCallback() {
    this.render();
    this.onClick = this.handleClick.bind(this);
    this.addEventListener('click', this.onClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
  }

  render() {
    const trashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

    this.innerHTML = `
      <div class="inline-flex items-center space-x-2 cart-qty-component border p-1 rounded-lg shadow-lg" aria-live="polite">
        <button type="button" class="dec w-8 h-8 flex items-center justify-center text-gray-700 hover:text-bg-light-red cursor-pointer" aria-label="Decrease quantity">${this.qty>1?'-':trashSvg}</button>
        <input class="qty w-12 text-center border-0" value="${this.qty}" readonly aria-label="Quantity">
        <button type="button" class="inc w-8 h-8 flex items-center justify-center text-gray-700 hover:text-bg-light-red cursor-pointer" aria-label="Increase quantity">+</button>
        <span class="qty-loading hidden ml-2" aria-hidden="true"><svg class="animate-spin w-5 h-5 text-gray-600 hover:text-bg-light-red" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg></span>
      </div>
    `;
  }

  handleClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('inc')) this.setQty(this.qty + 1);
    if (btn.classList.contains('dec')) {
      if (this.qty <= 1) return this.removeItemWithLoading();
      this.setQty(this.qty - 1);
    }
  }

  setQty(n) {
    this.qty = Math.max(0, n);
    this.querySelector('.qty').value = String(this.qty);
    const dec = this.querySelector('.dec');
    if (dec) dec.innerHTML = this.qty>1 ? '-' : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    // perform AJAX update for change in quantity
    this.updateServerWithLoading(this.qty);
  }

  setLoading(loading) {
    const indicator = this.querySelector('.qty-loading');
    const buttons = this.querySelectorAll('button');
    if (indicator) indicator.classList.toggle('hidden', !loading);
    buttons.forEach(b => b.disabled = loading);
    // dim the entire cart table (preferred) or fallback to the closest row/container
    const table = this.closest('table');
    if (table) {
      table.classList.toggle('opacity-50', loading);
      table.classList.toggle('pointer-events-none', loading);
    } else {
      const row = this.closest('tr') || this.closest('div');
      if (row) {
        row.classList.toggle('opacity-50', loading);
      }
    }
  }

  updateServerWithLoading(qty) {
    this.setLoading(true);
    return this.updateServer(qty).finally(() => {
      this.setLoading(false);
      if (window.location.pathname.startsWith('/cart')) location.reload();
    });
  }

  updateServer(qty) {
    const line = this.line;
    const body = `line=${encodeURIComponent(line)}&quantity=${encodeURIComponent(qty)}`;
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: body
    }).then(r => r.json()).then(cart => {
      if (window.fetchCart) window.fetchCart();
      this.dispatchEvent(new CustomEvent('cart:updated', { detail: cart, bubbles: true }));
      return cart;
    }).catch(err => { console.error('cart-qty control update error', err); throw err; });
  }

  removeItem() {
    return this.removeItemWithLoading();
  }

  removeItemWithLoading() {
    this.setLoading(true);
    const line = this.line;
    const body = `line=${encodeURIComponent(line)}&quantity=0`;
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: body
    }).then(r => r.json()).then(cart => {
      if (window.fetchCart) window.fetchCart();
      this.dispatchEvent(new CustomEvent('cart:updated', { detail: cart, bubbles: true }));
      return cart;
    }).catch(err => { console.error('cart-qty control remove error', err); throw err; })
    .finally(() => {
      this.setLoading(false);
      if (window.location.pathname.startsWith('/cart')) location.reload();
    });
  }
}

customElements.define('cart-qty-control', CartQtyControl);
