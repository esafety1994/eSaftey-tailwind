// Optional: Additional JavaScript for handling form submission or interactions can be added here.
if (!customElements.get("esafety-cart-action-button")) {
  class EsafetyCartActionButton extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      // listen on the custom element so submit events still get handled
      // if the inner form is replaced by variant scripts
      this.addEventListener("submit", this.handleSubmit.bind(this));
    }

    handleSubmit(event) {
      event.preventDefault();

      // derive the active form (supports cases where variant scripts replace the form)
      const form = (event.target && event.target.closest && event.target.closest('form')) || this.querySelector('form');
      if (!form) return;

      // toggle loading spinner on primary cart button inside the form
      const primaryButton = form.querySelector('button.primary-cart-button');
      const _origButtonHtml = primaryButton ? primaryButton.innerHTML : null;
      const _origButtonWidth = primaryButton ? primaryButton.style.width : null;
      const setLoading = (loading) => {
        if (!primaryButton) return;
        if (loading) {
          // Lock width to avoid layout shift when replacing content with spinner
          try {
            const rect = primaryButton.getBoundingClientRect();
            primaryButton.style.boxSizing = 'border-box';
            primaryButton.style.width = rect.width + 'px';
          } catch (e) {}
          primaryButton.innerHTML = '<svg class="animate-spin inline-block w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>';
          primaryButton.disabled = true;
          primaryButton.setAttribute('aria-busy', 'true');
        } else {
          // restore original content and width
          primaryButton.innerHTML = _origButtonHtml || '';
          if (_origButtonWidth) primaryButton.style.width = _origButtonWidth; else primaryButton.style.width = '';
          primaryButton.disabled = false;
          primaryButton.removeAttribute('aria-busy');
        }
      };

      setLoading(true);

      const formData = {
        items: [
          {
            id: form.querySelector('input[name="id"]').value,
            quantity: form.querySelector('input[name="quantity"]').value,
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
        .then((response) => response.json())
        .then((data) => {
          document.documentElement.dispatchEvent(
            new CustomEvent("cart:render", { detail: data, bubbles: true })
          );
          setLoading(false);
        })
        .catch((err) => {
          console.error('Add to cart failed', err);
          setLoading(false);
        });
    }

    disconnectedCallback() {}
  }
  customElements.define("esafety-cart-action-button", EsafetyCartActionButton);
}
