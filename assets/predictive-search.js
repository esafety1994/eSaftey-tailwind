class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    // Keep lightweight constructor: bind handlers and prepare fields.
    this.container = null;
    this.mobileOverlay = null;
    this.mobileInput = null;
    this.mobileResults = null;
    this.predictiveSearchResults = null;
    this.input = null;
    this._mobileOpen = false;

    // placeholders for removable handlers
    this._onInput = null;
    this._onFocus = null;
    this._toggleClickHandler = null;
    this._onMobileInput = null;

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

    // Query DOM nodes now that element is connected
    this.input =
      this.querySelector('input[type="search"]') ||
      this.querySelector("#Search") ||
      document.getElementById("Search");
    this.predictiveSearchResults =
      this.querySelector("#predictive-search") ||
      document.getElementById("predictive-search");

    if (!this.input || !this.predictiveSearchResults) {
      // nothing to wire up yet; bail but remain connected so future calls won't re-init
      return;
    }

    // wire input handlers
    this._onInput = this.debounce((event) => {
      this.onChange(event);
    }, 300);
    this.input.addEventListener("input", this._onInput);

    this._onFocus = (e) => {
      try {
        if (
          window.matchMedia &&
          window.matchMedia("(max-width: 767px)").matches
        ) {
          this.openMobileOverlay();
        }
      } catch (err) {}
    };
    this.input.addEventListener("focus", this._onFocus);

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

    // bind mobile input if present (overlay may be added server-side)
    this._bindMobileInputs();

    // register document pointerdown handler (capture) to close when clicking outside
    document.addEventListener("pointerdown", this._handleDocumentPointer, true);
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
      section_id: "predictive-search",
      "resources[limit]": "9",
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
        console.log(response);
        return response.text();
      })
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const section = doc.querySelector("#shopify-section-predictive-search");
        if (section) {
          // If mobile overlay is open, render into the mobile results container
          if (this._mobileOpen) {
            this.mobileResults = document.getElementById(
              "predictive-search-mobile-results",
            );
            if (this.mobileResults) {
              this.mobileResults.innerHTML = section.innerHTML;
              this.container = this.mobileResults;
            } else {
              this.predictiveSearchResults.innerHTML = section.innerHTML;
              this.container =
                this.predictiveSearchResults.querySelector(
                  "#predictive-search-results",
                ) || this.predictiveSearchResults;
            }
          } else {
            this.predictiveSearchResults.innerHTML = section.innerHTML;
            // Prefer the outer wrapper with padding if present
            this.container =
              this.predictiveSearchResults.querySelector(
                "#predictive-search-results",
              ) || this.predictiveSearchResults;
          }

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
        document.getElementById("predictive-search-results") ||
        this.predictiveSearchResults;
      var inputEl = document.getElementById("Search") || this.input;

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

  _bindMobileInputs() {
    try {
      this.mobileOverlay = document.getElementById("predictive-search-mobile");
      this.mobileInput = document.getElementById("SearchMobile");
      this.mobileResults = document.getElementById(
        "predictive-search-mobile-results",
      );
      var closeBtn = document.getElementById("predictive-search-mobile-close");
      if (this.mobileInput) {
        // store handler so it can be removed later
        this._onMobileInput = this.debounce((e) => {
          try {
            this.input.value = e.target.value;
          } catch (err) {}
          this.onChange();
        }, 300);
        this.mobileInput.addEventListener("input", this._onMobileInput);
        this.mobileInput.addEventListener("keydown", (e) => {
          // if mobile overlay open, show column layout handled by section template
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.closeMobileOverlay();
        });
      }
    } catch (err) {}
  }

  openMobileOverlay() {
    try {
      this._mobileOpen = true;
      this.mobileOverlay = document.getElementById("predictive-search-mobile");
      this.mobileResults = document.getElementById(
        "predictive-search-mobile-results",
      );
      if (this.mobileOverlay) {
        this.mobileOverlay.classList.remove("hidden");
        this.mobileOverlay.setAttribute("aria-hidden", "false");
      }
      if (this.mobileInput) this.mobileInput.focus();
      // route container to mobile results while open
      if (this.mobileResults) this.container = this.mobileResults;
      // lock body scrolling so only mobile results scroll
      try {
        this._prevBodyOverflow = document.body.style.overflow || "";
        document.body.style.overflow = "hidden";
        // also prevent overscroll on html element
        this._prevHtmlOverflow = document.documentElement.style.overflow || "";
        document.documentElement.style.overflow = "hidden";
        this._scrollLockOwner = "mobile";
      } catch (err) {}
    } catch (err) {}
  }

  closeMobileOverlay() {
    try {
      this._mobileOpen = false;
      if (this.mobileOverlay) {
        this.mobileOverlay.classList.add("hidden");
        this.mobileOverlay.setAttribute("aria-hidden", "true");
      }
      // restore container to default
      this.container =
        this.predictiveSearchResults.querySelector(
          "#predictive-search-results",
        ) || this.predictiveSearchResults;
      this.close();
      // restore body overflow
      try {
        if (typeof this._prevBodyOverflow !== "undefined")
          document.body.style.overflow = this._prevBodyOverflow;
        if (typeof this._prevHtmlOverflow !== "undefined")
          document.documentElement.style.overflow = this._prevHtmlOverflow;
        this._scrollLockOwner = null;
        this._prevBodyOverflow = undefined;
        this._prevHtmlOverflow = undefined;
      } catch (err) {}
    } catch (err) {}
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
      if (this.mobileInput && this._onMobileInput)
        this.mobileInput.removeEventListener("input", this._onMobileInput);
    } catch (e) {}
  }

  open() {
    var el = this.container || this.predictiveSearchResults;
    el.style.display = "block";
    // lock background scrolling when predictive search opens (desktop)
    try {
      if (!this._mobileOpen && this._scrollLockOwner !== "mobile") {
        if (!this._scrollLockOwner) {
          this._scrollLockOwner = "desktop";
          this._prevBodyOverflow = document.body.style.overflow || "";
          document.body.style.overflow = "hidden";
          this._prevHtmlOverflow = document.documentElement.style.overflow || "";
          document.documentElement.style.overflow = "hidden";
        }
      }
    } catch (err) {}
  }

  close() {
    var el = this.container || this.predictiveSearchResults;
    el.style.display = "none";
    // restore scrolling only if desktop opened it
    try {
      if (this._scrollLockOwner === "desktop") {
        if (typeof this._prevBodyOverflow !== "undefined")
          document.body.style.overflow = this._prevBodyOverflow;
        if (typeof this._prevHtmlOverflow !== "undefined")
          document.documentElement.style.overflow = this._prevHtmlOverflow;
        this._scrollLockOwner = null;
        this._prevBodyOverflow = undefined;
        this._prevHtmlOverflow = undefined;
      }
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
