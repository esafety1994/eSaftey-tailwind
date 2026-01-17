/*
  ShippingWidget
  - Minimal, dependency-free widget that talks to StarShipIT rates API.
  - Reads API keys from options or from the container element's data attributes.
  - Exposes `ShippingWidget` globally and auto-initializes containers that have `data-shipping-widget`.
*/
(function () {
  'use strict';

  class ShippingWidget {
    constructor({ selector = null, container = null, apiKey = 'd0b9db77d62442edb7301ddd4dbc8297', subscriptionKey = '2753e655f9704eea8ad3e957f72642e2', product = {} } = {}) {
      if (container) this.container = container;
      else if (selector) this.container = document.querySelector(selector);
      else this.container = document.querySelector('[data-shipping-widget]');

      if (!this.container) throw new Error('ShippingWidget: container not found');

      this.apiKey = apiKey || this.container.getAttribute('data-api-key') || '';
      this.subscriptionKey = subscriptionKey || this.container.getAttribute('data-subscription-key') || '';
      this.product = Object.assign({ title: 'Product', sku: '', price: 0, grams: 0 }, product);

      this.isLoading = false;
      this.shippingRates = [];
      this.errors = [];
      this.noShippingRates = false;
      this.isFreeShipping = false;

      this.findElements();
      this.bind();
      this.initState();
    }

    initState() {
      // Hide spinner and any pre-rendered result blocks until user triggers calculation
      if (this.spinnerEl) this.spinnerEl.style.display = 'none';
      if (this.calculateBtn) {
        this.calculateBtn.disabled = false;
        this.calculateBtn.classList.remove('opacity-60', 'cursor-not-allowed');
      }

      if (this.resultsEl) {
        // Hide existing ULs (shipping-rate, no-shipping-rates, errors) and any free-shipping div
        const uls = this.resultsEl.querySelectorAll('ul');
        uls.forEach(u => u.style.display = 'none');
        const divs = this.resultsEl.querySelectorAll('div');
        divs.forEach(d => d.style.display = 'none');
      }
        // initState complete
    }

    findElements() {
      // Prefer the form marked with data-address root, fallback to first form
      this.form = this.container.querySelector('form[data-address="root"]') || this.container.querySelector('form');
      // fields commonly used in the Liquid markup
      this.fieldQuantity = this.container.querySelector('#QuantityShipping') || this.form && this.form.querySelector('input[name="quantity"]');
      this.fieldStreet = this.container.querySelector('#AddressAddress1') || this.form && this.form.querySelector('input[name*="address1"]');
      this.fieldCity = this.container.querySelector('#AddressCity') || this.form && this.form.querySelector('input[name*="city"]');
      this.fieldProvince = this.container.querySelector('#AddressProvince') || this.form && this.form.querySelector('select[name*="province"]');
      this.fieldCountry = this.container.querySelector('#AddressCountry') || this.form && this.form.querySelector('select[name*="country"]');
      this.fieldZip = this.container.querySelector('#AddressZip') || this.form && this.form.querySelector('input[name*="zip"]');

      // Button and spinner
      this.calculateBtn = this.container.querySelector('.shipping-rate-button button, .m-spinner-button, button[data-shipping-calc]');
      this.spinnerEl = this.container.querySelector('.m-spinner-icon');

      // Results container (we will update innerHTML here)
      this.resultsEl = this.container.querySelector('.shipping-rates-result') || this.container.querySelector('#shipping-results');
    }

    bind() {
      if (this.calculateBtn) {
        this.calculateBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleCalculate();
        });
      } else {
          // calculate button not found inside container
      }
    }

    readForm() {
      let qty = null;
      if (this.fieldQuantity) {
        const raw = String(this.fieldQuantity.value || '').trim();
        qty = raw === '' ? null : parseInt(raw, 10);
      } else {
        qty = 1;
      }
      return {
        quantity: qty,
        street: this.fieldStreet ? this.fieldStreet.value || null : null,
        city: this.fieldCity ? this.fieldCity.value || null : null,
        province: this.fieldProvince ? this.fieldProvince.value || null : null,
        country: this.fieldCountry ? this.fieldCountry.value || 'AU' : 'AU',
        zip: this.fieldZip ? this.fieldZip.value || null : null
      };
    }

    setLoading(isLoading) {
      this.isLoading = isLoading;
      if (this.spinnerEl) this.spinnerEl.style.display = isLoading ? 'inline-block' : 'none';
      if (this.calculateBtn) {
        this.calculateBtn.disabled = !!isLoading;
        if (isLoading) this.calculateBtn.classList.add('opacity-60', 'cursor-not-allowed');
        else this.calculateBtn.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    }

    async handleCalculate() {
      const data = this.readForm();
      if (!this.resultsEl) return;
      this.resultsEl.innerHTML = '';
      // Validate required fields: quantity and postcode
      const missing = [];
      if (!data.quantity || Number.isNaN(data.quantity) || data.quantity <= 0) missing.push('Quantity');
      if (!data.zip || String(data.zip).trim() === '') missing.push('Postcode');
      if (missing.length > 0) {
        // create one error entry per missing field so each appears on its own line
        this.errors = missing.map(f => ({ details: `${f} is required` }));
        this.renderErrors();
        return;
      }
      this.setLoading(true);
      this.shippingRates = [];
      this.noShippingRates = false;
      this.errors = [];
      this.isFreeShipping = false;

      const payload = {
        rate: {
          destination: {
            address1: data.street,
            address: null,
            address3: null,
            suburb: data.city,
            city: data.city,
            province: data.province,
            postal_code: data.zip,
            country: data.country
          },
          items: [
            {
              name: this.product.title,
              sku: this.product.sku || null,
              quantity: data.quantity,
              price: this.product.price,
              grams: this.product.grams || 0
            }
          ],
          currency: 'AUD',
          carrierId: null
        }
      }; 

      try {
        const url = `https://api.starshipit.com/api/rates/shopify?apiKey=${encodeURIComponent(this.apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'StarShipIT-Api-Key': this.apiKey,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error('Network error: ' + res.status + ' ' + txt);
        }

        const json = await res.json();

        if (json && Array.isArray(json.rates) && json.rates.length > 0) {
          this.shippingRates = json.rates;
          if (this.shippingRates[0].service_code && this.shippingRates[0].service_code.includes('Free')) {
            this.isFreeShipping = true;
          }
          this.renderResults();
        } else {
          this.noShippingRates = true;
          this.renderNoRates();
        }

      } catch (err) {
          // error fetching shipping rates
        this.errors = [{ details: err.message }];
        this.renderErrors();
      } finally {
        this.setLoading(false);
      }
    }

    renderResults() {
      if (!this.resultsEl) return;
      // If free shipping is eligible, show a prominent green message
      if (this.isFreeShipping) {
        this.resultsEl.innerHTML = `<div class="free-shipping-msg" style="color:#16a34a;font-weight:600;padding:8px 0;">Eligible for Free Shipping</div>`;
        return;
      }
      const ratesHtml = this.shippingRates.map(rate => {
        const price = (rate.total_price !== undefined) ? parseFloat(rate.total_price).toFixed(2) : (rate.price || '—');
        return `
          <li>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#20782C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7.75 11.9999L10.58 14.8299L16.25 9.16992" stroke="#20782C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>Your estimate: <strong>$${price}</strong></p>
          </li>`;
      }).join('');

      const html = `
        <ul class="shipping-rate">${ratesHtml}
          <p>${window.Shopify && Shopify.locale ? '' : ''}</p>
        </ul>`;

      this.resultsEl.innerHTML = html;
    }

    renderNoRates() {
      if (!this.resultsEl) return;
      this.resultsEl.innerHTML = `<div class="no-shipping-rates"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#5D5D5D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><div><p><strong>No shipping</strong></p><p>Please contact support.</p></div></div>`;
    }

    renderErrors() {
      if (!this.resultsEl) return;
      const html = this.errors.map(err => `<p role="alert" style="color:#dc2626;margin:0 0 8px;">${(err && err.details) ? err.details : String(err)}</p>`).join('');
      this.resultsEl.innerHTML = `<div class="shipping-errors">${html}</div>`;
    }
  }

  window.ShippingWidget = ShippingWidget;

  function autoInit() {
    const nodes = document.querySelectorAll('[data-shipping-widget]');
    nodes.forEach(node => {
      try {
        let product = {};
        const prodAttr = node.getAttribute('data-product');
        if (prodAttr) {
          try { product = JSON.parse(prodAttr); } catch (e) { product = {}; }
        }
        new ShippingWidget({ container: node, apiKey: node.getAttribute('data-api-key') || undefined, subscriptionKey: node.getAttribute('data-subscription-key') || undefined, product });
      } catch (e) {
          // init error for this node
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    setTimeout(autoInit, 0);
  }

})();
