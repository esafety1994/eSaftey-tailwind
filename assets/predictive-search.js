class PredictiveSearch extends HTMLElement {
  constructor() {
    super();

    this.input = this.querySelector('input[type="search"]');
    this.predictiveSearchResults = this.querySelector('#predictive-search');

    this.input.addEventListener('input', this.debounce((event) => {
      this.onChange(event);
    }, 300).bind(this));
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
          this.predictiveSearchResults.innerHTML = section.innerHTML;
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

  open() {
    this.predictiveSearchResults.style.display = 'block';
  }

  close() {
    this.predictiveSearchResults.style.display = 'none';
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