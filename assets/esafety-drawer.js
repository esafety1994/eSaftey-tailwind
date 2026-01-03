class EsafetyDrawer extends HTMLElement {
  constructor() {
    super();
    this.openTrigger = document.querySelector("[data-drawer-trigger]");
    this.overlay =
      this.querySelector("#cart-overlay") ||
      this.querySelector("#drawer-overlay");
    this.panel =
      this.querySelector("#cart-drawer") ||
      this.querySelector(".esafety-drawer-panel");
    this.closeButton = this.querySelector("[data-drawer-close]");
    this.cartCount = document.querySelector(".cart-count");
  }

  connectedCallback() {
    if (this.openTrigger)
      this.openTrigger.addEventListener("click", this.handleOpen.bind(this));
    if (this.closeButton)
      this.closeButton.addEventListener("click", this.handleClose.bind(this));
    // ensure panel/overlay exist
    if (!this.panel) this.panel = this.querySelector("#cart-drawer");
    if (!this.overlay) this.overlay = this.querySelector("#cart-overlay");
    document.addEventListener("click", (event) => {
      if (event.target === this.overlay) {
        this.closeDrawer();
      }
    });
    document.addEventListener("cart:render", this.cartRender.bind(this));
  }
  handleOpen(event) {
    event.preventDefault();

    this.openDrawer();
  }

  handleClose(event) {
    if (event && typeof event.preventDefault === "function")
      event.preventDefault();
    this.closeDrawer();
  }

  openDrawer() {
    // show overlay immediately
    if (this.overlay) this.overlay.classList.remove("hidden");
    // ensure panel exists
    if (this.panel) {
      // remove the offscreen class and add visible class to trigger Tailwind transition
      this.panel.classList.remove("translate-x-full", "-translate-x-full");
      this.panel.classList.add("translate-x-0");
      this.panel.setAttribute("aria-hidden", "false");
      // mark open attribute for stateful styling elsewhere
      this.setAttribute("open", "");
    } else {
      this.setAttribute("open", "");
    }
    // lock background scroll
    try {
      this._previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } catch (e) {
      // ignore in restricted environments
    }
  }

  closeDrawer() {
    // animate panel out, then hide overlay after transition
    if (this.panel) {
      // hide overlay immediately so clicks don't get intercepted
      if (this.overlay) this.overlay.classList.add("hidden");
      // restore body overflow immediately
      try {
        document.body.style.overflow = this._previousBodyOverflow || "";
      } catch (e) {}

      // move panel offscreen depending on its current position (right vs left)
      if (
        this.panel.classList.contains("left") ||
        this.panel.classList.contains("-translate-x-full")
      ) {
        this.panel.classList.remove("translate-x-0");
        // force reflow to ensure transition
        void this.panel.offsetWidth;
        this.panel.classList.add("-translate-x-full");
      } else {
        this.panel.classList.remove("translate-x-0");
        // force reflow
        void this.panel.offsetWidth;
        this.panel.classList.add("translate-x-full");
      }

      var onTransEnd = (ev) => {
        if (ev.propertyName && ev.propertyName.indexOf("transform") === -1)
          return;
        this.panel.removeEventListener("transitionend", onTransEnd);
      };
      this.panel.addEventListener("transitionend", onTransEnd);
      this.panel.setAttribute("aria-hidden", "true");
    } else {
      if (this.overlay) this.overlay.classList.add("hidden");
      try {
        document.body.style.overflow = this._previousBodyOverflow || "";
      } catch (e) {}
    }

    this.removeAttribute("open");
  }

  cartRender(event) {
    const itemsContainer = document.querySelector("[data-item-count-drawer]");
    const cartTotalContainer = document.querySelector(
      "[data-cart-total-drawer]"
    );

    const fakeElement = document.createElement("div");
    const fakeCount = document.createElement("div");

    const newHTML = event.detail.sections["esaftey-cart-drawer"];
    const newCount = event.detail.sections["cart-count"];

    console.log("newHTML", newHTML);

    fakeElement.innerHTML = newHTML;
    fakeCount.innerHTML = newCount;

    this.querySelector("#cart-drawer-content").innerHTML =
      fakeElement.querySelector("#cart-drawer-content").innerHTML;

    const countEl = fakeCount.querySelector(".cart-count");
    if (countEl) {
      // preserve original cart-count markup
      this.cartCount.innerHTML = countEl.innerHTML;
      // extract numeric value (e.g. "16") and set into itemsContainer if present
      const raw = (countEl.textContent || countEl.innerText || "").trim();
      const numeric = raw.replace(/[^0-9]/g, "");
      if (itemsContainer) {
        itemsContainer.innerHTML = numeric !== "" ? numeric : raw;
      }
    }

    const cartTotal = fakeElement.querySelector("#cart-total");
    if (cartTotal) cartTotalContainer.innerHTML = cartTotal.innerHTML;
    this.openDrawer();
  }
  disconnectedCallback() {}
}

customElements.define("esafety-drawer", EsafetyDrawer);
