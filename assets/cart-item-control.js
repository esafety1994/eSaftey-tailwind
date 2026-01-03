class CartQtyControl extends HTMLElement {
  constructor() {
    super();
    this.plusButton = this.querySelector("[data-plus]");
    this.minusButton = this.querySelector("[data-minus]");
    this.removeBtn = this.querySelector("[data-remove]");
    this.isAddon = this.dataset.isAddon || false;
  }

  connectedCallback() {
    this.plusButton.addEventListener("click", this.handleClick.bind(this));
    this.minusButton.addEventListener("click", this.handleClick.bind(this));
    if (this.removeBtn)
      this.removeBtn.addEventListener("click", this.handleClick.bind(this));
  }

  handleClick(event) {
    // go up one level and find a child `.fixings-panel`, then read its data-addon-line-key
    let addonLineKey = null;
    let itemKey = this.dataset.key;

    if (this.isAddon) {
      const addonLineKeyElement = document.querySelector(
        `[data-addon-parent_key="${itemKey}"]`
      );
      if (addonLineKeyElement) {
        addonLineKey = addonLineKeyElement.getAttribute("data-addon-line-key");
      }
    }

    let updates = {
      [itemKey]: event.target.dataset.quantity,
    };

    if (addonLineKey) {
      updates[addonLineKey] = event.target.dataset.quantity; // remove the addon item
    }

    const formData = {
      updates: updates,
      sections: "esaftey-cart-drawer,cart-count",
    };

    this.setLoading(true);

    fetch(window.Shopify.routes.root + "cart/update.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        console.log("Response received:", response);
        return response.json();
      })
      .then((data) => {
        console.log("Item quantity updated:", data.json);
        // if we're currently on the cart page, reload so the canonical cart view is updated
        if (
          window.location &&
          window.location.pathname &&
          window.location.pathname.startsWith("/cart")
        ) {
          try {
            window.location.reload();
            return;
          } catch (e) {
            /* ignore */
          }
        }
        // otherwise dispatch render event for drawer/mini-cart updates
        document.documentElement.dispatchEvent(
          new CustomEvent("cart:render", { detail: data, bubbles: true })
        );
        this.setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    /*const formData = { sections: "esaftey-cart-drawer,cart-count" };
    fetch
    // otherwise dispatch render event for drawer/mini-cart updates
        document.documentElement.dispatchEvent(
          new CustomEvent("cart:render", { detail: data, bubbles: true })
        );
        this.setLoading(false);*/
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.onClick);
    if (this.removeBtn)
      this.removeBtn.removeEventListener(
        "click",
        this.removeItemLine.bind(this)
      );
  }

  setLoading(loading) {
    const indicator = this.querySelector(".qty-loading");
    const buttons = this.querySelectorAll("button");
    if (indicator) indicator.classList.toggle("hidden", !loading);
    buttons.forEach((b) => (b.disabled = loading));
    // dim the entire cart table (preferred) or fallback to the closest row/container
    const table = this.closest("table");
    if (table) {
      table.classList.toggle("opacity-50", loading);
      table.classList.toggle("pointer-events-none", loading);
    } else {
      const row = this.closest("tr") || this.closest("div");
      if (row) {
        row.classList.toggle("opacity-50", loading);
      }
    }
  }
}

customElements.define("cart-qty-control", CartQtyControl);
