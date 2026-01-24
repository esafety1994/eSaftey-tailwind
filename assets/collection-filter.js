class CollectionFilters extends HTMLElement {
  constructor() {
    super();
  }

  get sectionId() {
    return this.dataset.sectionId;
  }
  connectedCallback() {
    this.filterInputs = this.querySelectorAll("input");
    this.handleClick = this.handleClick.bind(this);
    this.minRange = this.querySelector('input[type="range"][data-min-value]');
    this.maxRange = this.querySelector('input[type="range"][data-max-value]');
    // clearFilter handled via delegated listener to allow cloned drawer elements to work
    this.filterInputs.forEach((input) => {
      input.addEventListener("change", this.handleClick);
    });
    // initialize price range UI (dual-thumb fill)
    this._initPriceRange();

    // listen for clicks on any "remove price" pills rendered outside the component
    this._removePriceHandler = (e) => {
      const btn = e.target.closest('[data-remove-price]');
      if (!btn) return;
      const sectionId = btn.getAttribute('data-section-id');
      const minParam = btn.getAttribute('data-min-param');
      const maxParam = btn.getAttribute('data-max-param');
      if (!sectionId || !minParam || !maxParam) return;

      // preserve open accordion indices so we can re-open them after replacing HTML
      const filterTabs = Array.from(document.querySelectorAll('accordion-tab'));
      const openFilters = filterTabs
        .map((value, index) => (value.classList.contains('accordion-open') ? index : -1))
        .filter((index) => index !== -1);

      // build URL without the min/max params and fetch the section
      const url = new URL(location.href);
      url.searchParams.delete(minParam);
      url.searchParams.delete(maxParam);
      url.searchParams.set('section_id', sectionId);

      this._showSpinner();
      performSectionUpdate(url, openFilters, 'clearing price filter')
        .catch((err) => console.error('Error clearing price filter:', err))
        .finally(() => this._hideSpinner());
    };
    document.addEventListener('click', this._removePriceHandler);
    // add a single document-level handler for sort selects (only once)
    if (!CollectionFilters._sortListenerAdded) {
      CollectionFilters._sortListenerAdded = true;
      document.addEventListener('change', (ev) => {
        const sel = ev.target.closest('[data-collection-sort]');
        if (!sel) return;
        const sectionId = sel.getAttribute('data-section-id');
        const sortVal = sel.value;

        // preserve open accordions
        const filterTabs = Array.from(document.querySelectorAll('accordion-tab'));
        const openFilters = filterTabs
          .map((value, index) => (value.classList.contains('accordion-open') ? index : -1))
          .filter((index) => index !== -1);

        // build URL that preserves current query params (filters) but uses the base path when provided
        const baseAttr = sel.getAttribute('data-base-url');
        let url = new URL(location.href);
        if (baseAttr) {
          try {
            const base = new URL(baseAttr, window.location.origin);
            // use base pathname but keep existing search params (so active filters remain)
            url.pathname = base.pathname;
            // merge any query params from the base (e.g., `q` on search) without overwriting existing ones
            base.searchParams.forEach((v, k) => { if (!url.searchParams.has(k)) url.searchParams.set(k, v); });
          } catch (e) {
            // fallback to using current location
            url = new URL(location.href);
          }
        }
        if (sortVal) url.searchParams.set('sort_by', sortVal);
        else url.searchParams.delete('sort_by');
        url.searchParams.set('section_id', sectionId);

        const instance = document.querySelector('collection-filters');
        instance? instance._showSpinner() : null;

        performSectionUpdate(url, openFilters, 'changing sort')
          .catch((err) => console.error('Error changing sort:', err))
          .finally(() => { instance? instance._hideSpinner() : null; });
      });
    }
  }

  

  handleClick(event) {
    const input = event.currentTarget;
    let url;
    this.filterTabs = Array.from(document.querySelectorAll("accordion-tab"));
    if (input.dataset.addUrl && input.dataset.removeUrl) {
      url = new URL(
        input.checked ? input.dataset.addUrl : input.dataset.removeUrl,
        window.location.origin
      );
    } else {
      url = new URL(location.href);
      url.searchParams.delete(this.minRange.dataset.param);
      url.searchParams.delete(this.maxRange.dataset.param);

      url.searchParams.set(this.minRange.dataset.param, this.minRange.value);
      url.searchParams.set(this.maxRange.dataset.param, this.maxRange.value);
    }
    url.searchParams.set("section_id", this.sectionId);

    this._showSpinner();
    const openFilters = this.filterTabs
      .map((value, index) => (value.classList.contains("accordion-open") ? index : -1))
      .filter((index) => index !== -1);
    performSectionUpdate(url, openFilters, 'fetching collection filters')
      .catch((error) => {
        console.error("Error fetching collection filters:", error);
      })
      .finally(() => {
        this._hideSpinner();
      });
  }

  _showSpinner() {
    if (document.getElementById('collection-filter-spinner')) return;
    const overlay = document.createElement('div');
    overlay.id = 'collection-filter-spinner';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-white/60';
    overlay.innerHTML = `
      <div class="flex items-center gap-3 p-4">
        <svg class="animate-spin h-6 w-6 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      
      </div>
    `;
    document.body.appendChild(overlay);
  }

  _hideSpinner() {
    const el = document.getElementById('collection-filter-spinner');
    if (el) el.remove();
  }

  _initPriceRange() {
    const wrapper = this.querySelector('.price-range-wrapper');
    if (!wrapper) return;

    this._priceMinEl = wrapper.querySelector('input[data-min-value]');
    this._priceMaxEl = wrapper.querySelector('input[data-max-value]');
    this._priceValMin = wrapper.querySelector('[data-value-min]');
    this._priceValMax = wrapper.querySelector('[data-value-max]');
    if (!this._priceMinEl || !this._priceMaxEl) return;

    const min = parseFloat(this._priceMinEl.min) || 0;
    const max = parseFloat(this._priceMinEl.max) || 100;
    this._priceFill = wrapper.querySelector('.range-fill');

    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
    const formatNumber = (v) => {
      try { return Number(v).toFixed(2); } catch (e) { return Number(v).toFixed(2); }
    };

    const update = (trigger) => {
      let a = clamp(parseFloat(this._priceMinEl.value), min, max);
      let b = clamp(parseFloat(this._priceMaxEl.value), min, max);
      if (a > b) {
        if (trigger === this._priceMinEl) {
          a = b;
          this._priceMinEl.value = a;
        } else {
          b = a;
          this._priceMaxEl.value = b;
        }
      }

      const pctA = ((a - min) / (max - min)) * 100;
      const pctB = ((b - min) / (max - min)) * 100;
      if (this._priceFill) {
        this._priceFill.style.left = pctA + '%';
        this._priceFill.style.width = Math.max(0, pctB - pctA) + '%';
      }

      if (this._priceValMin) {
        if (this._priceValMin.tagName === 'INPUT') this._priceValMin.value = formatNumber(a);
        else this._priceValMin.textContent = formatNumber(a);
      }
      if (this._priceValMax) {
        if (this._priceValMax.tagName === 'INPUT') this._priceValMax.value = formatNumber(b);
        else this._priceValMax.textContent = formatNumber(b);
      }
    };

    this._priceMinHandler = () => update(this._priceMinEl);
    this._priceMaxHandler = () => update(this._priceMaxEl);

    this._priceMinEl.addEventListener('input', this._priceMinHandler);
    this._priceMaxEl.addEventListener('input', this._priceMaxHandler);

    // if numeric inputs exist for manual entry, bind change handlers
    // Debounced commit: while typing we don't move the slider until user pauses or blurs/presses Enter
    const DEBOUNCE_MS = 600;
    if (this._priceValMin && this._priceValMin.tagName === 'INPUT') {
      this._priceValMinTimer = null;
      const commitMin = () => {
        let v = parseFloat(this._priceValMin.value);
        v = clamp(isNaN(v) ? min : v, min, max);
        this._priceMinEl.value = v;
        update(this._priceMinEl);
        try { this._priceMinEl.dispatchEvent(new Event('change', { bubbles: true })); }
        catch(e){ const ev = document.createEvent('HTMLEvents'); ev.initEvent('change', true, false); this._priceMinEl.dispatchEvent(ev); }
      };

      this._priceValMinHandler = () => {
        // live typing: don't move slider yet, just clamp displayed value
        let v = parseFloat(this._priceValMin.value);
        v = isNaN(v) ? '' : clamp(v, min, max);
        // keep user's partial input (don't overwrite if empty)
        if (v !== '') this._priceValMin.value = formatNumber(v);
        clearTimeout(this._priceValMinTimer);
        this._priceValMinTimer = setTimeout(commitMin, DEBOUNCE_MS);
      };

      this._priceValMinBlur = () => { clearTimeout(this._priceValMinTimer); commitMin(); };
      this._priceValMinKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(this._priceValMinTimer); commitMin(); } };

      this._priceValMin.addEventListener('input', this._priceValMinHandler);
      this._priceValMin.addEventListener('blur', this._priceValMinBlur);
      this._priceValMin.addEventListener('keydown', this._priceValMinKey);
    }

    if (this._priceValMax && this._priceValMax.tagName === 'INPUT') {
      this._priceValMaxTimer = null;
      const commitMax = () => {
        let v = parseFloat(this._priceValMax.value);
        v = clamp(isNaN(v) ? max : v, min, max);
        this._priceMaxEl.value = v;
        update(this._priceMaxEl);
        try { this._priceMaxEl.dispatchEvent(new Event('change', { bubbles: true })); }
        catch(e){ const ev = document.createEvent('HTMLEvents'); ev.initEvent('change', true, false); this._priceMaxEl.dispatchEvent(ev); }
      };

      this._priceValMaxHandler = () => {
        let v = parseFloat(this._priceValMax.value);
        v = isNaN(v) ? '' : clamp(v, min, max);
        if (v !== '') this._priceValMax.value = formatNumber(v);
        clearTimeout(this._priceValMaxTimer);
        this._priceValMaxTimer = setTimeout(commitMax, DEBOUNCE_MS);
      };

      this._priceValMaxBlur = () => { clearTimeout(this._priceValMaxTimer); commitMax(); };
      this._priceValMaxKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(this._priceValMaxTimer); commitMax(); } };

      this._priceValMax.addEventListener('input', this._priceValMaxHandler);
      this._priceValMax.addEventListener('blur', this._priceValMaxBlur);
      this._priceValMax.addEventListener('keydown', this._priceValMaxKey);
    }

    // allow clicking/dragging on the track area to pick nearest thumb and drag it
    let active = null;
    const rectEl = wrapper.querySelector('.relative') || wrapper;
    const toValue = (clientX) => {
      const rect = rectEl.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const pct = x / rect.width;
      return min + pct * (max - min);
    };

    const onPointerMove = (e) => {
      if (!active) return;
      const v = toValue(e.clientX);
      active.value = clamp(v, min, max);
      update(active);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (active) {
        try {
          active.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          // fallback for older browsers
          const ev = document.createEvent('HTMLEvents');
          ev.initEvent('change', true, false);
          active.dispatchEvent(ev);
        }
      }
      active = null;
    };

    const onPointerDown = (e) => {
      // ignore interactions that target the numeric inputs so they can receive focus
      if (e.target.closest('[data-value-min],[data-value-max]')) return;
      // only handle primary button
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      const clickVal = toValue(e.clientX);
      const a = parseFloat(this._priceMinEl.value);
      const b = parseFloat(this._priceMaxEl.value);
      const pctA = (a - min) / (max - min);
      const pctB = (b - min) / (max - min);
      const rect = rectEl.getBoundingClientRect();
      const clickPct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const distA = Math.abs(clickPct - pctA);
      const distB = Math.abs(clickPct - pctB);
      active = distA <= distB ? this._priceMinEl : this._priceMaxEl;
      active.value = clamp(clickVal, min, max);
      update(active);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    // pointerdown on track wrapper picks nearest thumb
    wrapper.addEventListener('pointerdown', onPointerDown);

    // initialize visuals
    update();
  }

  _destroyPriceRange() {
    if (this._priceMinEl && this._priceMinHandler) this._priceMinEl.removeEventListener('input', this._priceMinHandler);
    if (this._priceMaxEl && this._priceMaxHandler) this._priceMaxEl.removeEventListener('input', this._priceMaxHandler);
    if (this._priceValMin && this._priceValMinHandler) this._priceValMin.removeEventListener('input', this._priceValMinHandler);
    if (this._priceValMax && this._priceValMaxHandler) this._priceValMax.removeEventListener('input', this._priceValMaxHandler);
    if (this._priceValMin && this._priceValMinBlur) this._priceValMin.removeEventListener('blur', this._priceValMinBlur);
    if (this._priceValMax && this._priceValMaxBlur) this._priceValMax.removeEventListener('blur', this._priceValMaxBlur);
    if (this._priceValMin && this._priceValMinKey) this._priceValMin.removeEventListener('keydown', this._priceValMinKey);
    if (this._priceValMax && this._priceValMaxKey) this._priceValMax.removeEventListener('keydown', this._priceValMaxKey);
    clearTimeout(this._priceValMinTimer);
    clearTimeout(this._priceValMaxTimer);
    this._priceMinEl = null;
    this._priceMaxEl = null;
    this._priceValMin = null;
    this._priceValMax = null;
    this._priceMinHandler = null;
    this._priceMaxHandler = null;
    this._priceFill = null;
  }
  disconnectedCallback() {
    this._destroyPriceRange();
    // remove change listeners added in connectedCallback
    this.filterInputs.forEach((input) => {
      input.removeEventListener("change", this.handleClick);
    });
    document.removeEventListener('click', this._removePriceHandler);
  }
}

customElements.define("collection-filters", CollectionFilters);

// Helper to map sort_by param to human label
function getSortLabel(val){
  switch(String(val)){
    case 'best-selling': return 'Best selling';
    case 'title-ascending': return 'Alphabetically, A–Z';
    case 'title-descending': return 'Alphabetically, Z–A';
    case 'price-ascending': return 'Price, low to high';
    case 'price-descending': return 'Price, high to low';
    case 'created-descending': return 'Date, new to old';
    case 'created-ascending': return 'Date, old to new';
    case 'manual':
    default:
      return 'Featured';
  }
}

// Initialize sort selects and display from URL on load
function initSortDisplays(){
  try{
    const params = new URL(location.href).searchParams;
    const current = params.get('sort_by') || 'manual';
    document.querySelectorAll('[data-collection-sort]').forEach(function(sel){
      // If select has an option matching current, set it
      try{ sel.value = current; }catch(e){}
    });
    // update any left-panel displays
    document.querySelectorAll('[data-sort-display]').forEach(function(el){
      el.textContent = getSortLabel(current);
    });
  }catch(e){/* ignore */}
}

// Shared helper: fetch a section HTML, replace `.collection-inner-element`, re-open accordions, update history and re-init sort displays
function performSectionUpdate(url, openFilters = [], errorContext = 'section update'){
  // accept either URL object or string
  const urlStr = (typeof url === 'string') ? url : url.toString();
  try { closeDrawerIfOpen(); } catch(e) { /* ignore */ }
  return fetch(urlStr)
    .then((resp) => resp.text())
    .then((html) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // re-apply open states to the returned accordion tabs
      try{
        const returnedTabs = temp.querySelectorAll('accordion-tab');
        openFilters.forEach((index) => {
          const rt = returnedTabs[index];
          if (rt) rt.classList.add('accordion-open');
        });
      }catch(e){/* ignore */}

      const target = document.querySelector('.collection-inner-element');
      if (target && temp.querySelector('.collection-inner-element')) {
        target.innerHTML = temp.querySelector('.collection-inner-element').innerHTML;
      }

      try{
        // ensure section_id is removed from pushed URL
        const u = new URL(urlStr, window.location.origin);
        u.searchParams.delete('section_id');
        window.history.pushState({}, '', u.toString());
      }catch(e){ /* ignore */ }

      try { initSortDisplays(); } catch (e) { /* ignore */ }

      // (no caching) aside content will be read from DOM when drawer opens
    })
    .catch((err) => {
      console.error('Error during ' + errorContext + ':', err);
      throw err;
    });
}

// (removed: refreshDrawerIfOpen) - caching approach used instead

function closeDrawerIfOpen(){
  const overlay = document.getElementById('collection-filter-drawer');
  if (!overlay) return;
  const panel = overlay.querySelector('#collection-filter-drawer-panel');
  if (panel) panel.classList.add('-translate-x-full');
  setTimeout(() => {
    document.body.classList.remove('overflow-hidden');
    overlay.remove();
  }, 260);
}

// Mobile filter drawer: show aside content in a left-side drawer when toggle is clicked
function initFilterDrawer(){
  document.addEventListener('click', function(e){
    const toggle = e.target.closest('[data-action="toggle-filter"]');
    if(!toggle) return;
    e.preventDefault();

    const section = toggle.closest('section[id^="collection-section-"]') || document.querySelector('section');
    if(!section) return;
    const sectionIdAttr = section.id ? (section.id.match(/(\d+)$/) || [null, null])[1] : null;

    // build drawer overlay (initially with spinner while we fetch latest aside)
    const overlay = document.createElement('div');
    overlay.id = 'collection-filter-drawer';
    overlay.className = 'fixed inset-0 z-50';
    overlay.innerHTML = `
      <div class="fixed inset-0 bg-black/40" id="collection-filter-backdrop"></div>
      <div id="collection-filter-drawer-panel" class="fixed left-0 top-0 h-full w-full max-w-sm bg-white overflow-auto p-4 transform -translate-x-full transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Filters</h3>
          <button aria-label="Close filters" data-action="close-filter" class="p-2">&times;</button>
        </div>
        <div class="collection-filter-drawer-inner">Loading…</div>
      </div>
    `;

    document.body.appendChild(overlay);
    // prevent background scroll
    document.body.classList.add('overflow-hidden');

    const panel = overlay.querySelector('#collection-filter-drawer-panel');
    // animate panel in (slide from left)
    requestAnimationFrame(() => { panel.classList.remove('-translate-x-full'); });

    // close handler
    function closeDrawer(){
      panel.classList.add('-translate-x-full');
      setTimeout(() => {
        document.body.classList.remove('overflow-hidden');
        overlay.remove();
      }, 260);
      document.removeEventListener('keydown', escHandler);
    }

    // close when clicking the backdrop or the close button, or clicking outside the panel
    overlay.addEventListener('click', function(ev){
      const clickedInsidePanel = !!ev.target.closest('#collection-filter-drawer-panel');
      const clickedClose = !!ev.target.closest('[data-action="close-filter"]') || ev.target.id === 'collection-filter-backdrop';
      if (!clickedInsidePanel || clickedClose) {
        closeDrawer();
      }
    });

    const escHandler = (ev) => { if (ev.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', escHandler);

    // populate from current DOM aside (assumes performSectionUpdate has already replaced the DOM)
    const inner = overlay.querySelector('.collection-filter-drawer-inner');
    const currentAside = section.querySelector('aside') || document.querySelector('aside');
    inner.innerHTML = currentAside ? currentAside.innerHTML : '';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ initSortDisplays(); initFilterDrawer(); });
} else {
  initSortDisplays();
  initFilterDrawer();
}

// Delegated handler for clearing filters: fast AJAX replace of section content (preserve `q` param)
document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-clear-filters]');
  if (!btn) return;
  e.preventDefault();
  try { closeDrawerIfOpen(); } catch(e) { /* ignore */ }

  // find containing section id (numeric suffix)
  const sectionEl = btn.closest('section[id^="collection-section-"]') || document.querySelector('section[id^="collection-section-"]');
  let sectionId = null;
  if (sectionEl && sectionEl.id) {
    const m = sectionEl.id.match(/(\d+)$/);
    if (m) sectionId = m[1];
  }

  const url = new URL(location.href);
  const q = url.searchParams.get('q');
  url.search = '';
  if (q) url.searchParams.set('q', q);
  if (sectionId) url.searchParams.set('section_id', sectionId);

  // perform AJAX section update without showing spinner for speed
  performSectionUpdate(url, [], 'clearing filters').catch(err => console.error('Clear filters failed', err));
});
