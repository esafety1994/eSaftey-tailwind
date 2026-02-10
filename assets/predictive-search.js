class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    console.log("PredictiveSearch constructor");
    // assign a simple instance id for debug tracing
    if (typeof PredictiveSearch._nextId === 'undefined') PredictiveSearch._nextId = 1;
    this._id = PredictiveSearch._nextId++;
    // Keep lightweight constructor: bind handlers and prepare fields.
    this.container = null;
    this.predictiveSearchResults = null;
    this.input = null;

    // placeholders for removable handlers
    this._onInput = null;
    this._onFocus = null;
    this._toggleClickHandler = null;

    // bind instance methods used as listeners
    this._handleDocumentPointer = this._handleDocumentPointer.bind(this);
    // track scroll lock owner and previous overflow values
    this._scrollLockOwner = null;
    this._prevBodyOverflow = undefined;
    this._prevHtmlOverflow = undefined;
  }

  connectedCallback() {
    // Avoid double initialization
    if (this._connected) return;
    this._connected = true;
    try { console.debug && console.debug(`[predictive-search #${this._id}] connected`); } catch(e){}

    // Query DOM nodes now that element is connected (scope to this instance)
    this.input =
      this.querySelector('input[type="search"]') ||
      this.querySelector('input[name="q"]') ||
      this.querySelector("#Search");
    this.predictiveSearchResults = this.querySelector("#predictive-search");

    // If input/results aren't present yet (e.g., rendered later), install delegated
    // listeners so this instance initializes lazily when its children appear.
    if (!this.input || !this.predictiveSearchResults) {
      this._delegatedInit = (event) => {
        try {
          const t = event.target;
          if (!t) return;
          const isSearchInput =
            (t.matches && (t.matches('input[type="search"]') || t.matches('input[name="q"]'))) ||
            t.id === 'Search' || t.getAttribute && t.getAttribute('name') === 'q';
          if (isSearchInput) {
            if (!this.input) {
              this.input = t;
              try { console.debug && console.debug(`[predictive-search #${this._id}] delegated bound input`); } catch(e){}
              // wire input handlers now that input exists
              if (!this._onInput) this._onInput = this.debounce((e) => this.onChange(e), 300);
              this.input.addEventListener('input', this._onInput);
              this._onFocus = (e) => {};
              this.input.addEventListener('focus', this._onFocus);
            }
            if (!this.predictiveSearchResults) {
              this.predictiveSearchResults = this.querySelector('#predictive-search');
              try { console.debug && console.debug(`[predictive-search #${this._id}] delegated found results container`); } catch(e){}
            }
            // If both present, remove delegated init handler
            if (this.input && this.predictiveSearchResults) {
              this.removeEventListener('input', this._delegatedInit);
              this.removeEventListener('focusin', this._delegatedInit);
            }
          }
        } catch (e) {}
      };
      this.addEventListener('input', this._delegatedInit);
      this.addEventListener('focusin', this._delegatedInit);
      // continue — other wiring will occur when delegated init fires
    }

    // wire input handlers if input exists (delegatedInit may handle late bind)
    if (this.input) {
      try { console.debug && console.debug(`[predictive-search #${this._id}] wiring input handlers`); } catch(e){}
      this._onInput = this.debounce((event) => {
        this.onChange(event);
      }, 300);
      this.input.addEventListener("input", this._onInput);

      // Do not open mobile overlay on focus; keep consistent inline behavior
      this._onFocus = (e) => {};
      this.input.addEventListener("focus", this._onFocus);
    }

    // Trigger predictive search when clicking the search icon/svg
    try {
      let toggle = this.querySelector(
        'button[type="submit"], [data-search-toggle], .search .search-toggle, span > svg, .search span',
      );
      if (toggle) {
        try {
          if (toggle.tagName && toggle.tagName.toLowerCase() === "svg") {
            toggle = toggle.closest("span") || toggle;
          }
        } catch (e) {}

        this._toggleClickHandler = (e) => {
          e.preventDefault();
          try {
            this.input.focus();
            if (this.input.value && this.input.value.trim().length) {
              this.onChange();
            }
          } catch (err) {}
        };
        toggle.addEventListener("click", this._toggleClickHandler);
      }
    } catch (err) {}

    // mobile overlay removed — no mobile bindings

    // register document pointerdown handler (capture) to close when clicking outside
    document.addEventListener("pointerdown", this._handleDocumentPointer, true);
  }

  onChange() {
    const searchTerm = this.input.value.trim();
    try { console.debug && console.debug(`[predictive-search #${this._id}] onChange: "${searchTerm}"`); } catch(e){}

    if (!searchTerm.length) {
      this.close();
      return;
    }

    this.getSearchResults(searchTerm);
  }

  getSearchResults(searchTerm) {
    try { console.debug && console.debug(`[predictive-search #${this._id}] getSearchResults: "${searchTerm}"`); } catch(e){}
    // Request up to 6 product resources from the suggest endpoint and include collections
    const params = new URLSearchParams({
      q: searchTerm,
      section_id: "predictive-search",
      "resources[limit]": "3",
      "resources[type]": "product",
      "resources[fields]": "title,product_type,variants.title,variants.sku",
    });
    fetch(`/search/suggest?${params.toString()}`)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.close();
          throw error;
        }
        try { console.debug && console.debug(`[predictive-search #${this._id}] suggest response ok`); } catch(e){}
        return response.text();
      })
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const section = doc.querySelector("#shopify-section-predictive-search");
        if (section) {
          // Render into the inline predictive results container
          this.predictiveSearchResults.innerHTML = section.innerHTML;
          try { console.debug && console.debug(`[predictive-search #${this._id}] rendered results into container`); } catch(e){}
          // Prefer the outer wrapper with padding if present
          this.container =
            this.predictiveSearchResults.querySelector(
              "#predictive-search-results",
            ) || this.predictiveSearchResults;

          this.open();

          // Apply hover images if available
          try {
            if (window.applyHoverImages) window.applyHoverImages();
          } catch (e) {}

          // Try to extract total results count from the suggest response and update any 'view-all-results' anchor
          try {
            var m = text.match(/(\d[\d,\.]*)\s+results?/i);
            var viewAll =
              this.predictiveSearchResults.querySelector(".view-all-results");
            if (m && m[1]) {
              var count = m[1].replace(/[,\.]/g, "");
              var qtyEl =
                this.predictiveSearchResults.querySelector("#res-qty");
              if (qtyEl) qtyEl.innerHTML = "&nbsp;" + count + "&nbsp;";
            } else if (viewAll) {
              // Fallback: fetch the full search page to get authoritative count
              var q = encodeURIComponent(searchTerm);
              fetch(`/search?q=${q}`, { credentials: "same-origin" })
                .then((res) => res.text())
                .then((html) => {
                  try {
                    var mm = html.match(/(\d[\d,\.]*)\s+results?/i);
                    if (mm && mm[1]) {
                      var c2 = mm[1].replace(/[,\.]/g, "");
                      var qtyEl2 =
                        this.predictiveSearchResults.querySelector("#res-qty");
                      if (qtyEl2) qtyEl2.innerHTML = "&nbsp;" + c2 + "&nbsp;";
                    }
                  } catch (e) {}
                })
                .catch(() => {});
            }
          } catch (e) {}
        }
      })
      .catch((error) => {
        this.close();
        throw error;
      });
  }

  _handleDocumentPointer(e) {
    try {
      var container =
        this.container ||
        (this.predictiveSearchResults && this.predictiveSearchResults.querySelector("#predictive-search-results")) ||
        this.predictiveSearchResults;
      var inputEl = this.input || this.querySelector('input[type="search"]') || this.querySelector('#Search');

      // If click is inside the results container or the search input, do nothing
      var clickedInsideResults = false;
      try {
        if (container && container.contains && container.contains(e.target))
          clickedInsideResults = true;
      } catch (err) {}

      var clickedOnInput = false;
      try {
        if (
          inputEl === e.target ||
          (inputEl && inputEl.contains && inputEl.contains(e.target))
        )
          clickedOnInput = true;
      } catch (err) {}

      if (!clickedInsideResults && !clickedOnInput) this.close();
    } catch (err) {
      // ignore
    }
  }

  disconnectedCallback() {
    try {
      document.removeEventListener(
        "pointerdown",
        this._handleDocumentPointer,
        true,
      );
    } catch (e) {}

    try {
      if (this.input) {
        if (this._onInput)
          this.input.removeEventListener("input", this._onInput);
        if (this._onFocus)
          this.input.removeEventListener("focus", this._onFocus);
      }
    } catch (e) {}

    try {
      // remove toggle click handler if present
      let toggle = this.querySelector(
        'button[type="submit"], [data-search-toggle], .search .search-toggle, span > svg, .search span',
      );
      if (toggle && this._toggleClickHandler) {
        try {
          if (toggle.tagName && toggle.tagName.toLowerCase() === "svg") {
            toggle = toggle.closest("span") || toggle;
          }
        } catch (e) {}
        toggle.removeEventListener("click", this._toggleClickHandler);
      }
    } catch (e) {}
    try {
      if (this._delegatedInit) {
        this.removeEventListener('input', this._delegatedInit);
        this.removeEventListener('focusin', this._delegatedInit);
        this._delegatedInit = null;
      }
    } catch (e) {}
  }

  open() {
    var el = this.container || this.predictiveSearchResults;
    try {
      if (el) el.style.display = "block";
    } catch (err) {}
  }

  close() {
    var el = this.container || this.predictiveSearchResults;
    try {
      if (el) el.style.display = "none";
    } catch (err) {}
  }

  debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
}

customElements.define("predictive-search", PredictiveSearch);
