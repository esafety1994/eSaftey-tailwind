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
    this.clearFilter = document.querySelector('span[data-clear-filters]');
    this.clearFilter?.addEventListener("click", () => {
      const u = new URL(window.location.href);
      u.search = '';
      window.location.href = u.toString();
    });
    this.filterInputs.forEach((input) => {
      input.addEventListener("change", this.handleClick);
    });
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
    fetch(url.toString())
      .then((response) => response.text())
      .then((html) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const openFilters = this.filterTabs
          .map((value, index) => (value.classList.contains("accordion-open") ? index : -1))
          .filter((index) => index !== -1);
        openFilters.forEach((index) => {
          const currentFilter = tempDiv.querySelectorAll("accordion-tab")[index];
          if (currentFilter) currentFilter.classList.add("accordion-open");
        });
        const target = document.querySelector(".collection-inner-element");
        if (target && tempDiv.querySelector(".collection-inner-element")) {
          target.innerHTML = tempDiv.querySelector(".collection-inner-element").innerHTML;
        }

        url.searchParams.delete("section_id");
        window.history.pushState({}, "", url.toString());
      })
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
  disconnectedCallback() {
    document.body.removeEventListener("click", this.handleClick);
  }
}

customElements.define("collection-filters", CollectionFilters);
