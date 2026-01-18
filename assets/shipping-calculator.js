/*
  Shipping Calculator
  - Single custom element implementation following the lightweight pattern used by `accordion-tab.js`.
  - Keeps original behaviour: binds to existing Liquid markup, validates inputs, and posts the same payload shape as the Alpine script.
*/

class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // read configuration and product JSON
    this.apiKey = 'd0b9db77d62442edb7301ddd4dbc8297';
    this.subscriptionKey = '2753e655f9704eea8ad3e957f72642e2';

    const prodAttr = this.getAttribute('data-product');
    let product = {};
    if (prodAttr) {
      try { product = JSON.parse(prodAttr); } catch (e) { product = {}; }
    }
    this.product = product;

    this.isLoading = false;
    this.shippingRates = [];
    this.errors = [];
    this.noShippingRates = false;
    this.isFreeShipping = false;

    this.findElements();
    this.bind();
    this.initState();
  }

  disconnectedCallback() {
    if (this._boundClick && this.calculateBtn) this.calculateBtn.removeEventListener('click', this._boundClick);
  }

  // Find expected nodes inside the element
  findElements() {
    this.form = this.querySelector('form[data-address="root"]') || this.querySelector('form');
    this.fieldQuantity = this.querySelector('#QuantityShipping') || (this.form && this.form.querySelector('input[name="quantity"]'));
    this.fieldStreet = this.querySelector('#AddressAddress1') || (this.form && this.form.querySelector('input[name*="address1"]'));
    this.fieldCity = this.querySelector('#AddressCity') || (this.form && this.form.querySelector('input[name*="city"]'));
    this.fieldProvince = this.querySelector('#AddressProvince') || (this.form && this.form.querySelector('select[name*="province"]'));
    this.fieldCountry = this.querySelector('#AddressCountry') || (this.form && this.form.querySelector('select[name*="country"]'));
    this.fieldZip = this.querySelector('#AddressZip') || (this.form && this.form.querySelector('input[name*="zip"]'));

    this.calculateBtn = this.querySelector('.shipping-rate-button button, .m-spinner-button, button[data-shipping-calc]');
    this.spinnerEl = this.querySelector('.m-spinner-icon');
    this.resultsEl = this.querySelector('.shipping-rates-result') || this.querySelector('#shipping-results');
  }

  bind() {
    if (this.calculateBtn) {
      this._boundClick = (e) => { e.preventDefault(); this.handleCalculate(); };
      this.calculateBtn.addEventListener('click', this._boundClick);
    }
  }

  initState() {
    if (this.spinnerEl) this.spinnerEl.style.display = 'none';
    if (this.calculateBtn) {
      this.calculateBtn.disabled = false;
      this.calculateBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
    if (this.resultsEl) {
      const uls = this.resultsEl.querySelectorAll('ul');
      uls.forEach(u => u.style.display = 'none');
      const divs = this.resultsEl.querySelectorAll('div');
      divs.forEach(d => d.style.display = 'none');
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
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = '';
    const data = this.readForm();

    const missing = [];
    if (!data.quantity || Number.isNaN(data.quantity) || data.quantity <= 0) missing.push('Quantity');
    if (!data.zip || String(data.zip).trim() === '') missing.push('Postcode');
    if (missing.length > 0) {
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
        if (this.shippingRates.some(r => r && r.service_code && String(r.service_code).includes('Free')) ||
            this.shippingRates.some(r => r && (Number(r.total_price) === 0 || Number(r.price) === 0))) {
          this.isFreeShipping = true;
        }
        this.renderResults();
      } else {
        this.noShippingRates = true;
        this.renderNoRates();
      }

    } catch (err) {
      this.errors = [{ details: err.message }];
      this.renderErrors();
    } finally {
      this.setLoading(false);
    }
  }

  renderResults() {
    if (!this.resultsEl) return;
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

    const html = `<ul class="shipping-rate">${ratesHtml}</ul>`;
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

  // product is provided by Liquid `data-product` attribute; no normalization required
}

if (!customElements.get('shipping-calculator')) {
  customElements.define('shipping-calculator', ShippingCalculator);
}

