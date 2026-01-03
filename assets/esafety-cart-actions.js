// Optional: Additional JavaScript for handling form submission or interactions can be added here.
if (!customElements.get("esafety-cart-action-button")) {
  class EsafetyCartActionButton extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.submitForm = this.querySelector("form");
      this.submitForm.addEventListener("submit", this.handleSubmit.bind(this));
    }

    handleSubmit(event) {
      event.preventDefault();

      let formData = {
        items: [
          {
            id: this.submitForm.querySelector('input[name="id"]').value,
            quantity: this.submitForm.querySelector('input[name="quantity"]')
              .value,
          },
        ],
        sections: "esaftey-cart-drawer,cart-count",
      };

      fetch(window.Shopify.routes.root + "cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          console.log("Item added to cart:", data);
          document.documentElement.dispatchEvent(
            new CustomEvent("cart:render", { detail: data, bubbles: true })
          );
        });
      console.log("Add to Cart form submitted");
    }

    disconnectedCallback() {}
  }
  customElements.define("esafety-cart-action-button", EsafetyCartActionButton);
}
