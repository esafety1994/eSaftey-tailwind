class PredictiveSearch extends HTMLElement {
  constructor() {
    super();

    this.input = this.querySelector('input[type="search"]');
    this.predictiveSearchResults = this.querySelector('#predictive-search');
    this.container = null;
    this.mobileOverlay = null;
    this.mobileInput = null;
    this.mobileResults = null;
    this._mobileOpen = false;

    this.input.addEventListener('input', this.debounce((event) => {
      this.onChange(event);
    }, 300).bind(this));
    // Open mobile overlay on focus for small screens
    this.input.addEventListener('focus', (e) => {
      try {
        if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) {
          this.openMobileOverlay();
        }
      } catch (err) {}
    });

    // bind mobile input if present (overlay may be added server-side)
    this._bindMobileInputs();
    // bind and register document pointerdown handler (capture) to close when clicking outside
    this._handleDocumentPointer = this._handleDocumentPointer.bind(this);
    document.addEventListener('pointerdown', this._handleDocumentPointer, true);
  }

  onChange() {
    const searchTerm = this.input.value.trim();

    if (!searchTerm.length) {
      this.close();
      return;
    }

    this.getSearchResults(searchTerm);
  }

  getSearchResults(searchTerm) {
    // Request up to 6 product resources from the suggest endpoint and include collections
    const params = new URLSearchParams({
      q: searchTerm,
      section_id: 'predictive-search',
      'resources[limit]': '20'
    });
    fetch(`/search/suggest?${params.toString()}`)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.close();
          throw error;
        }

        return response.text();
      })
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const section = doc.querySelector('#shopify-section-predictive-search');
        if (section) {
          // If mobile overlay is open, render into the mobile results container
          if (this._mobileOpen) {
            this.mobileResults = document.getElementById('predictive-search-mobile-results');
            if (this.mobileResults) {
              this.mobileResults.innerHTML = section.innerHTML;
              this.container = this.mobileResults;
            } else {
              this.predictiveSearchResults.innerHTML = section.innerHTML;
              this.container = this.predictiveSearchResults.querySelector('#predictive-search-results') || this.predictiveSearchResults;
            }
          } else {
            this.predictiveSearchResults.innerHTML = section.innerHTML;
            // Prefer the outer wrapper with padding if present
            this.container = this.predictiveSearchResults.querySelector('#predictive-search-results') || this.predictiveSearchResults;
          }

          this.open();

          // Apply hover images if available
          try { if(window.applyHoverImages) window.applyHoverImages(); } catch(e){}

          // Try to extract total results count from the suggest response and update any 'view-all-results' anchor
          try{
            var m = text.match(/(\d[\d,\.]*)\s+results?/i);
            var viewAll = this.predictiveSearchResults.querySelector('.view-all-results');
            if(m && m[1]){
              var count = m[1].replace(/[,\.]/g,'');
              var qtyEl = this.predictiveSearchResults.querySelector('#res-qty');
              if(qtyEl) qtyEl.innerHTML = '&nbsp;' + count + '&nbsp;';
            } else if(viewAll){
              // Fallback: fetch the full search page to get authoritative count
              var q = encodeURIComponent(searchTerm);
              fetch(`/search?q=${q}`, { credentials: 'same-origin' })
                .then((res) => res.text())
                .then((html) => {
                  try {
                    var mm = html.match(/(\d[\d,\.]*)\s+results?/i);
                    if (mm && mm[1]) {
                      var c2 = mm[1].replace(/[,\.]/g, '');
                        var qtyEl2 = this.predictiveSearchResults.querySelector('#res-qty');
                        if (qtyEl2) qtyEl2.innerHTML = '&nbsp;' + c2 + '&nbsp;';
                    }
                  } catch (e) {}
                })
                .catch(() => {});
            }
          }catch(e){}
        }
      })
      .catch((error) => {
        this.close();
        throw error;
      });
  }

  _handleDocumentPointer(e) {
    try {
      var container = this.container || document.getElementById('predictive-search-results') || this.predictiveSearchResults;
      var inputEl = document.getElementById('Search') || this.input;

      // If click is inside the results container or the search input, do nothing
      var clickedInsideResults = false;
      try {
        if (container && container.contains && container.contains(e.target)) clickedInsideResults = true;
      } catch (err) {}

      var clickedOnInput = false;
      try {
        if (inputEl === e.target || (inputEl && inputEl.contains && inputEl.contains(e.target))) clickedOnInput = true;
      } catch (err) {}

      if (!clickedInsideResults && !clickedOnInput) this.close();
    } catch (err) {
      // ignore
    }
  }

  _bindMobileInputs() {
    try {
      this.mobileOverlay = document.getElementById('predictive-search-mobile');
      this.mobileInput = document.getElementById('SearchMobile');
      this.mobileResults = document.getElementById('predictive-search-mobile-results');
      var closeBtn = document.getElementById('predictive-search-mobile-close');
      if (this.mobileInput) {
        this.mobileInput.addEventListener('input', this.debounce((e) => {
          // forward mobile input value to main input and trigger search
          try { this.input.value = e.target.value; } catch (err) {}
          this.onChange();
        }, 300).bind(this));
        this.mobileInput.addEventListener('keydown', (e) => {
          // if mobile overlay open, show column layout handled by section template
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => { e.preventDefault(); this.closeMobileOverlay(); });
      }
    } catch (err) {}
  }

  openMobileOverlay() {
    try {
      this._mobileOpen = true;
      this.mobileOverlay = document.getElementById('predictive-search-mobile');
      this.mobileResults = document.getElementById('predictive-search-mobile-results');
      if (this.mobileOverlay) {
        this.mobileOverlay.classList.remove('hidden');
        this.mobileOverlay.setAttribute('aria-hidden', 'false');
      }
      if (this.mobileInput) this.mobileInput.focus();
      // route container to mobile results while open
      if (this.mobileResults) this.container = this.mobileResults;
      // lock body scrolling so only mobile results scroll
      try {
        this._prevBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
        // also prevent overscroll on html element
        this._prevHtmlOverflow = document.documentElement.style.overflow || '';
        document.documentElement.style.overflow = 'hidden';
      } catch (err) {}
    } catch (err) {}
  }

  closeMobileOverlay() {
    try {
      this._mobileOpen = false;
      if (this.mobileOverlay) {
        this.mobileOverlay.classList.add('hidden');
        this.mobileOverlay.setAttribute('aria-hidden', 'true');
      }
      // restore container to default
      this.container = this.predictiveSearchResults.querySelector('#predictive-search-results') || this.predictiveSearchResults;
      this.close();
      // restore body overflow
      try {
        if (typeof this._prevBodyOverflow !== 'undefined') document.body.style.overflow = this._prevBodyOverflow;
        if (typeof this._prevHtmlOverflow !== 'undefined') document.documentElement.style.overflow = this._prevHtmlOverflow;
      } catch (err) {}
    } catch (err) {}
  }

  disconnectedCallback() {
    try { document.removeEventListener('pointerdown', this._handleDocumentPointer, true); } catch(e){}
  }

  open() {
    var el = this.container || this.predictiveSearchResults;
    el.style.display = 'block';
  }

  close() {
    var el = this.container || this.predictiveSearchResults;
    el.style.display = 'none';
  }

  debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
}

customElements.define('predictive-search', PredictiveSearch);