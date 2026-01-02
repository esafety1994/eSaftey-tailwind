class EsafetyDrawer extends HTMLElement {
  constructor() {
    super();
    this._onKey = this._onKey.bind(this);
    this._onOverlayClick = this._onOverlayClick.bind(this);
    this._onCloseClick = this._onCloseClick.bind(this);
    this._closeTimer = null;
    this._prevBodyOverflow = null;
  }

  connectedCallback() {
    // Render in light DOM so Tailwind utilities in global CSS apply
    if (!this.classList.contains('esafety-drawer')) this.classList.add('esafety-drawer');
    if (!this.querySelector('.esafety-drawer-panel')) {
        this.innerHTML = `
          <div class="esafety-drawer-overlay fixed inset-0 bg-black/80 opacity-0 pointer-events-none transition-opacity duration-200"></div>
          <aside class="esafety-drawer-panel fixed top-0 bottom-0 w-80 max-w-full bg-white shadow-lg transition-transform duration-200 ease-out" role="dialog" aria-modal="true">
          <button class="esafety-drawer-close absolute top-2 right-2 bg-transparent border-0 text-xl leading-none cursor-pointer" aria-label="Close">×</button>
          <div class="esafety-drawer-content p-4 h-full overflow-auto">
            <div class="esafety-drawer-default">
              <h2 class="text-lg font-semibold">eSafety Information</h2>
              <p class="mt-2 text-sm text-gray-700">This is a placeholder for eSafety drawer content.</p>
            </div>
          </div>
        </aside>
      `;
    }

    this._overlay = this.querySelector('.esafety-drawer-overlay');
    this._panel = this.querySelector('.esafety-drawer-panel');
    this._closeBtn = this.querySelector('.esafety-drawer-close');

    if (this._overlay) this._overlay.addEventListener('click', this._onOverlayClick);
    if (this._closeBtn) this._closeBtn.addEventListener('click', this._onCloseClick);
  }

  disconnectedCallback() {
    if (this._overlay) this._overlay.removeEventListener('click', this._onOverlayClick);
    if (this._closeBtn) this._closeBtn.removeEventListener('click', this._onCloseClick);
    document.removeEventListener('keydown', this._onKey);
  }

  _onOverlayClick() {
    this.close();
  }

  _onCloseClick() {
    this.close();
  }

  _onKey(evt) {
    if (evt.key === 'Escape') this.close();
  }

  /**
   * Open the drawer. side can be 'left' or 'right' (default 'right').
   */
  open(side = 'right') {
    side = side === 'left' ? 'left' : 'right';
    // Clear pending close cleanup
    if (this._closeTimer) { clearTimeout(this._closeTimer); this._closeTimer = null; }
    // Remove previous side classes and position utils
    this._panel.classList.remove('left', 'right', 'left-0', 'right-0');
    // Add semantic side class for transform and the Tailwind positioning class
    this._panel.classList.add(side);
    this._panel.classList.add(side === 'left' ? 'left-0' : 'right-0');
    this.setAttribute('open', '');
    this.setAttribute('data-side', side);
    // Prevent body scroll while drawer is open; save previous overflow
    try {
      this._prevBodyOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    } catch (_) { this._prevBodyOverflow = null; }
    document.addEventListener('keydown', this._onKey);
    this.dispatchEvent(new CustomEvent('esafety:open', { bubbles: true }));
  }

  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this._onKey);
    // Restore body scroll
    try {
      if (this._prevBodyOverflow !== null) document.body.style.overflow = this._prevBodyOverflow; else document.body.style.overflow = '';
      this._prevBodyOverflow = null;
    } catch (_) {}
    // After transition ends, remove side positioning classes so initial state is clean
    if (this._panel) {
      const duration = 220; // slightly longer than CSS duration
      if (this._closeTimer) clearTimeout(this._closeTimer);
      this._closeTimer = setTimeout(() => {
        this._panel.classList.remove('left', 'right', 'left-0', 'right-0');
        this._closeTimer = null;
      }, duration);
    }
    this.dispatchEvent(new CustomEvent('esafety:close', { bubbles: true }));
  }

  /**
   * Toggle open state; optional side.
   */
  toggle(side) {
    if (this.hasAttribute('open')) this.close(); else this.open(side);
  }
}

customElements.define('esafety-drawer', EsafetyDrawer);

// Global delegation for buttons that want to open drawers.
// Usage: <button data-drawer-target="esafety-drawer" data-drawer-side="left">Open</button>
if (!window.__esafetyDrawerGlobalInit) {
  window.__esafetyDrawerGlobalInit = true;
  console.debug('esafety-drawer: global init');
  document.addEventListener('click', (e) => {
    console.log('esafety-drawer: click', e.target);
    const btn = e.target.closest('[data-drawer-target]');
    console.log('esafety-drawer btn: click', btn);
    if (!btn) return;
    e.preventDefault();
    const targetSelector = (btn.dataset.drawerTarget || '').trim();
    const side = btn.dataset.drawerSide || 'right';
    let drawer = null;

    if (targetSelector) {
      // Try several ways to resolve the target: as selector, id, or tag name
      try { drawer = document.querySelector(targetSelector); } catch (_) { drawer = null; }
      if (!drawer) {
        // If targetSelector looks like an id without '#', try getElementById
        if (!targetSelector.startsWith('#')) {
          const byId = document.getElementById(targetSelector);
          if (byId) drawer = byId;
        }
      }
      if (!drawer) {
        // Try tag name fallback (e.g., 'esafety-drawer')
        try { drawer = document.querySelector(targetSelector.replace(/^#/, '')); } catch (_) { drawer = null; }
      }
    }

    if (!drawer) drawer = document.querySelector('esafety-drawer');

    if (!drawer) {
      console.warn('esafety-drawer: no target found for', targetSelector, btn);
      return;
    }

    if (typeof drawer.open === 'function') {
      drawer.open(side);
    } else {
      console.warn('esafety-drawer: target found but has no open() method', drawer);
    }
  });
}