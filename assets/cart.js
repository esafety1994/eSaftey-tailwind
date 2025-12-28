document.addEventListener('DOMContentLoaded', function () {
  // Cart drawer functionality
  const cartBtn = document.getElementById('cart-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartClose = document.getElementById('cart-drawer-close');

  function openCartDrawer() {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.classList.remove('translate-x-full');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartOverlay.classList.remove('hidden');
    cartBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('overflow-hidden');
  }

  function closeCartDrawer() {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.classList.add('translate-x-full');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartOverlay.classList.add('hidden');
    cartBtn?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('overflow-hidden');
  }

  function formatMoney(amount) {
    return (amount / 100).toLocaleString(undefined, {style: 'currency', currency: 'USD'});
  }

  function renderCart(cart) {
    const itemsContainer = document.getElementById('cart-items');
    const emptyNode = document.getElementById('cart-empty');
    const subtotalNode = document.getElementById('cart-subtotal');
    if (!itemsContainer || !subtotalNode || !emptyNode) return;

    itemsContainer.innerHTML = '';

    if (!cart || !cart.items || cart.items.length === 0) {
      emptyNode.style.display = 'block';
      subtotalNode.textContent = formatMoney(cart ? cart.items_subtotal_price : 0);
      return;
    }

    emptyNode.style.display = 'none';

    cart.items.forEach(function(item, index){
      const line = index + 1;
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3';
      row.innerHTML = `
        <img src="${item.image}" class="w-16 h-16 object-cover rounded" alt="${item.title}">
        <div class="flex-1">
          <div class="font-medium">${item.product_title}</div>
          <div class="text-sm text-gray-600">${item.variant_title || ''}</div>
          <div class="text-sm mt-2">${formatMoney(item.price)}</div>
          <div class="mt-2 flex items-center space-x-2">
            <input data-line="${line}" type="number" min="0" value="${item.quantity}" class="w-20 border p-1 rounded cart-qty-input">
            <button data-line="${line}" class="text-red-600 remove-item">Remove</button>
          </div>
        </div>
      `;
      itemsContainer.appendChild(row);
    });

    subtotalNode.textContent = formatMoney(cart.items_subtotal_price);

    // attach listeners for quantity inputs and remove buttons
    itemsContainer.querySelectorAll('.cart-qty-input').forEach(function(input){
      input.addEventListener('change', function(){
        const line = this.getAttribute('data-line');
        let qty = parseInt(this.value, 10);
        if (isNaN(qty) || qty < 0) qty = 0;
        updateCart(line, qty);
      });
    });

    itemsContainer.querySelectorAll('.remove-item').forEach(function(btn){
      btn.addEventListener('click', function(){
        const line = this.getAttribute('data-line');
        updateCart(line, 0);
      });
    });
  }

  function fetchCart() {
    return fetch('/cart.js')
      .then(r => r.json())
      .then(cart => {
        renderCart(cart);
        // update visible cart counts in nav if present
        const countSpans = document.querySelectorAll('#cart-btn span');
        const count = cart.item_count || 0;
        countSpans.forEach(s => s.textContent = (count > 99 ? '99+' : count));
        // reflect Authority attribute into drawer and checkout buttons
        try {
          const hasAuth = cart.attributes && cart.attributes['Authority to leave'] === 'Yes';
          const drawerAuth = document.getElementById('drawer-authority');
          const drawerCheckout = document.getElementById('cart-drawer-checkout-btn');
          if (drawerAuth) drawerAuth.checked = !!hasAuth;
          if (drawerCheckout) {
            drawerCheckout.classList.toggle('opacity-50', !hasAuth);
            drawerCheckout.classList.toggle('pointer-events-none', !hasAuth);
          }
        } catch (e) { /* ignore */ }
        return cart;
      })
      .catch(err => console.error('Error fetching cart:', err));
  }

  function updateCart(line, quantity) {
    const body = `line=${encodeURIComponent(line)}&quantity=${encodeURIComponent(quantity)}`;
    fetch('/cart/change.js', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: body
    })
    .then(r => r.json())
    .then(cart => {
      fetchCart();
    })
    .catch(err => console.error('Error updating cart:', err));
  }

  // wire up open/close handlers
  if (cartBtn) cartBtn.addEventListener('click', function(e){ e.preventDefault(); fetchCart().then(openCartDrawer); });
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);
  if (cartClose) cartClose.addEventListener('click', closeCartDrawer);

  // initial render
  fetchCart();

  // expose fetchCart for components
  window.fetchCart = fetchCart;

  // Save cart note and Authority attribute via AJAX
  function saveCartAttributes(noteSelector, authoritySelector) {
    const noteEl = noteSelector ? document.querySelector(noteSelector) : null;
    const authEl = authoritySelector ? document.querySelector(authoritySelector) : null;
    const note = noteEl ? noteEl.value : '';
    const hasAuth = (authEl && authEl.checked) ? 'Yes' : '';
    const bodyParts = [];
    bodyParts.push('note=' + encodeURIComponent(note));
    bodyParts.push('attributes[Authority to leave]=' + encodeURIComponent(hasAuth));
    const body = bodyParts.join('&');
    return fetch('/cart/update.js', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: body
    }).then(r => r.json());
  }

  // toggle checkout enable/disable based on checkbox
  function toggleCheckoutState(checkbox, btn) {
    if (!checkbox || !btn) return;
    const enabled = checkbox.checked === true;
    btn.classList.toggle('opacity-50', !enabled);
    btn.classList.toggle('pointer-events-none', !enabled);
  }

  // bind page authority checkbox to checkout button
  const pageAuth = document.getElementById('AuthorityToLeave');
  const pageCheckout = document.getElementById('cart-checkout-btn');
  if (pageAuth && pageCheckout) {
    pageAuth.addEventListener('change', function(){ toggleCheckoutState(pageAuth, pageCheckout); });
  }

  // bind drawer authority checkbox to drawer checkout
  const drawerAuth = document.getElementById('drawer-authority');
  const drawerCheckoutBtn = document.getElementById('cart-drawer-checkout-btn');
  if (drawerAuth && drawerCheckoutBtn) {
    drawerAuth.addEventListener('change', function(){ toggleCheckoutState(drawerAuth, drawerCheckoutBtn); });
  }

  // Intercept checkout clicks to save attributes first
  document.addEventListener('click', function(e){
    const pageAnchor = e.target.closest && e.target.closest('#cart-checkout-btn');
    const drawerAnchor = e.target.closest && e.target.closest('#cart-drawer-checkout-btn');
    if (!pageAnchor && !drawerAnchor) return;
    e.preventDefault();
    const targetBtn = pageAnchor ? document.getElementById('cart-checkout-btn') : document.getElementById('cart-drawer-checkout-btn');
    const authCheckbox = pageAnchor ? document.getElementById('AuthorityToLeave') : document.getElementById('drawer-authority');
    const noteEl = pageAnchor ? document.getElementById('Cart-Note') : document.getElementById('drawer-note');
    if (!authCheckbox || !authCheckbox.checked) {
      if (authCheckbox) authCheckbox.focus();
      return;
    }
    saveCartAttributes(noteEl ? '#'+noteEl.id : null, authCheckbox ? '#'+authCheckbox.id : null).then(function(){
      window.location.href = targetBtn.getAttribute('href');
    }).catch(function(){ window.location.href = targetBtn.getAttribute('href'); });
  });

  // Cart page quantity controls (increment/decrement/update/remove)
  document.addEventListener('click', function(e){
    const dec = e.target.closest('.cart-qty-decrement');
    const inc = e.target.closest('.cart-qty-increment');
    const updateBtn = e.target.closest('.cart-qty-update');
    const removeBtn = e.target.closest('.cart-qty-remove');

    if (dec || inc) {
      const btn = dec || inc;
      const form = btn.closest('.cart-change-form');
      if (!form) return;
      const input = form.querySelector('input[name="quantity"]');
      const line = form.querySelector('input[name="line"]')?.value;
      if (!input || !line) return;
      let val = parseInt(input.value, 10);
      if (isNaN(val)) val = 1;

      if (inc) {
        val = val + 1;
        input.value = String(val);
        // update decrement icon if needed
        const decBtn = form.querySelector('.cart-qty-decrement');
        if (decBtn) decBtn.innerHTML = '-';
      }

      if (dec) {
        if (val <= 1) {
          // remove item immediately
          updateCart(line, 0).then(function(){ if (window.location.pathname.startsWith('/cart')) location.reload(); });
        } else {
          val = val - 1;
          input.value = String(val);
          if (val === 1) {
            const decBtn = form.querySelector('.cart-qty-decrement');
            if (decBtn) decBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
          }
        }
      }
    }

    if (updateBtn) {
      const form = updateBtn.closest('.cart-change-form');
      if (!form) return;
      const line = form.querySelector('input[name="line"]')?.value;
      const qty = parseInt(form.querySelector('input[name="quantity"]')?.value || '0', 10);
      if (!line) return;
      updateCart(line, qty).then(function(){ if (window.location.pathname.startsWith('/cart')) location.reload(); });
    }

    if (removeBtn) {
      const form = removeBtn.closest('.cart-change-form');
      if (!form) return;
      const line = form.querySelector('input[name="line"]')?.value;
      if (!line) return;
      updateCart(line, 0).then(function(){ if (window.location.pathname.startsWith('/cart')) location.reload(); });
    }
    // unified remove handler for trash buttons next to variant info
    const itemRemove = e.target.closest('.cart-item-remove');
    if (itemRemove) {
      const line = itemRemove.getAttribute('data-line');
      // try to find cart-qty-control in same row and call its removeItem if present
      const row = itemRemove.closest('tr') || itemRemove.closest('div');
      const ctrl = row ? row.querySelector('cart-qty-control') : null;
      if (ctrl && typeof ctrl.removeItem === 'function') {
        // call component remove and reload cart page when on /cart
        ctrl.removeItem().then(function(){ if (window.location.pathname.startsWith('/cart')) location.reload(); });
      } else if (line) {
        updateCart(line, 0).then(function(){ if (window.location.pathname.startsWith('/cart')) location.reload(); });
      }
    }
  });

  // Handle cart form submissions with AJAX
  function initAddToCartForms(scope) {
    scope = scope || document;
    const cartForms = scope.querySelectorAll('form[action="/cart/add"]');
    cartForms.forEach(form => {
      // avoid double-binding
      if (form.__cartBound) return;
      form.__cartBound = true;
      form.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const button = this.querySelector('button[type="submit"]');
        const originalText = button ? button.textContent : '';

        if (button) {
          button.textContent = 'Adding...';
          button.disabled = true;
        }

        fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (button) {
            button.textContent = 'Added!';
            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            button.classList.add('bg-green-600', 'hover:bg-green-700');
          }

          // Refresh cart UI and open drawer
          if (typeof fetchCart === 'function') fetchCart();
          if (typeof openCartDrawer === 'function') openCartDrawer();

          setTimeout(() => {
            if (button) {
              button.textContent = originalText;
              button.disabled = false;
              button.classList.remove('bg-green-600', 'hover:bg-green-700');
              button.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
          }, 2000);
        })
        .catch(error => {
          console.error('Error adding to cart:', error);
          if (button) {
            button.textContent = 'Error';
            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            button.classList.add('bg-red-600', 'hover:bg-red-700');

            setTimeout(() => {
              button.textContent = originalText;
              button.disabled = false;
              button.classList.remove('bg-red-600', 'hover:bg-red-700');
              button.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }, 2000);
          }
        });
      });
    });
  }

  // initialize on load and after variant replacement
  initAddToCartForms(document);
  document.addEventListener('product:content:replaced', function(e){
    initAddToCartForms(document);
  });
});
