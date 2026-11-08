class ProductRecommendation extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.requestUrl = this.getAttribute("data-url");
    this.fetchRecommendations();
  }
  disconnectedCallback() {}
  async fetchRecommendations() {
    let productRecommendationsSection = this.querySelector(
      ".product-recommendations",
    );

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

      const safe = recommendations.cloneNode(true);
      safe.querySelectorAll('product-recommendations').forEach(el => el.remove());

      productRecommendationsSection.innerHTML = safe.innerHTML;

      const glideEl = document.getElementById('productRecommendationGlide');
      if (glideEl) {
        if (window.productRecommendationGlideInstance) {
          try { window.productRecommendationGlideInstance.destroy(); } catch (e) { /* ignore */ }
          window.productRecommendationGlideInstance = null;
        }

        const section = this.closest('.product-recommendation-section') || this.parentElement;
        const prevBtn = section && section.querySelector('[data-rec-arrow="prev"]');
        const nextBtn = section && section.querySelector('[data-rec-arrow="next"]');

        const initGlide = () => {
          window.productRecommendationGlideInstance = new Glide('#productRecommendationGlide', {
            type: 'carousel',
            startAt: 0,
            perView: 4,
            gap: 20,
            breakpoints: {
              1024: { perView: 3, gap: 16 },
              768: { perView: 2, gap: 16 },
              480: { perView: 1, gap: 12 },
            },
          });
          window.productRecommendationGlideInstance.mount();
          if (prevBtn) {
            prevBtn.addEventListener('click', () => window.productRecommendationGlideInstance.go('<'));
          }
          if (nextBtn) {
            nextBtn.addEventListener('click', () => window.productRecommendationGlideInstance.go('>'));
          }
        };

        const waitForGlide = (attempts = 0) => {
          console.log('[rec] waitForGlide attempt', attempts, 'Glide defined:', typeof Glide !== 'undefined');
          if (typeof Glide !== 'undefined') {
            initGlide();
          } else if (attempts < 20) {
            setTimeout(() => waitForGlide(attempts + 1), 100);
          } else {
            console.error('[rec] Glide never loaded after 20 attempts');
          }
        };

        waitForGlide();
      }
    } catch (err) {
      console.error('Failed to fetch recommendations', err);
    }
  }
}

customElements.define("product-recommendations", ProductRecommendation);
