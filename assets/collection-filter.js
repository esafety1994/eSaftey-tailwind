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

    fetch(url.toString())
      .then((response) => {
        return response.text();
      })
      .then((html) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const openFilters = this.filterTabs.map((value, index) => {
          return value.classList.contains("accordion-open") ? index : -1;
        }).filter((index) => index !== -1);
        openFilters.forEach((index) => {
          const currentFilter =
            tempDiv.querySelectorAll("accordion-tab")[index];
          currentFilter.classList.add("accordion-open");
        });
        document.querySelector(".collection-inner-element").innerHTML =
          tempDiv.querySelector(".collection-inner-element").innerHTML;

        url.searchParams.delete("section_id");
        window.history.pushState({}, "", url.toString());
      })
      .catch((error) => {
        console.error("Error fetching collection filters:", error);
      });
  }
  disconnectedCallback() {
    document.body.removeEventListener("click", this.handleClick);
  }
}

customElements.define("collection-filters", CollectionFilters);
