class ProductRecommendation extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    //product_id=12345690123&limit=4&section_id=product-recommendations&intent=related
    this.requestUrl = this.getAttribute("data-url");
    this.fetchRecommendations();
  }
  disconnectedCallback() {}
  async fetchRecommendations() {
    let productRecommendationsSection = this.querySelector(
      ".product-recommendations",
    );

    // ensure a container exists to receive injected markup
    if (!productRecommendationsSection) {
      productRecommendationsSection = document.createElement('div');
      productRecommendationsSection.className = 'product-recommendations';
      this.appendChild(productRecommendationsSection);
    }

    try {
      const res = await fetch(`${window.Shopify.routes.root}recommendations/products${this.requestUrl}`);
      const text = await res.text();
      const html = document.createElement('div');
      html.innerHTML = text;
      const recommendations = html.querySelector('.product-recommendations');

      if (!recommendations || !recommendations.innerHTML.trim()) return;

      // remove nested custom elements to avoid recursive construction
      const safe = recommendations.cloneNode(true);
      safe.querySelectorAll('product-recommendations').forEach(el => el.remove());

      productRecommendationsSection.innerHTML = safe.innerHTML;

      // Initialize Glide after injection (or re-init if already present)
      const glideEl = document.getElementById('productRecommendationGlide');
      if (glideEl && typeof Glide !== 'undefined') {
        if (window.productRecommendationGlideInstance) {
          try { window.productRecommendationGlideInstance.destroy(); } catch (e) { /* ignore */ }
          window.productRecommendationGlideInstance = null;
        }

        window.productRecommendationGlideInstance = new Glide('#productRecommendationGlide', {
          type: 'slider',
          startAt: 0,
          perView: 4,
          rewind: false,
          gap: 10,
          bound: true,
          breakpoints: {
            1024: { perView: 3 },
            768: { perView: 2 },
            480: { perView: 1 },
          },
        });

        
        window.productRecommendationGlideInstance.mount();
      }
    } catch (err) {
      console.error('Failed to fetch recommendations', err);
    }
  }
}

customElements.define("product-recommendations", ProductRecommendation);

