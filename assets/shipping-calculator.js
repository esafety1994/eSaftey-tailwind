/*
  Shipping Calculator
  - Single custom element implementation following the lightweight pattern used by `accordion-tab.js`.
  - Keeps original behaviour: binds to existing Liquid markup, validates inputs, and posts the same payload shape as the Alpine script.
  - Standard AU states (non-WA/NT/TAS): flat rate tiers based on order value — no API call.
  - WA / NT / TAS: carrier-calculated via Starshipit (margin-based, minimum $29).
*/

const REMOTE_SUBURB_LOOKUP = {
  // NT
  799:'Darwin',800:'Darwin',801:'Darwin',802:'Darwin',804:'Darwin',
  810:'Casuarina',811:'Darwin',812:'Karama',815:'Palmerston',
  820:'Fannie Bay',821:'Darwin',822:'Howard Springs',828:'Darwin',
  829:'Darwin',830:'Palmerston',831:'Palmerston',832:'Humpty Doo',
  835:'Batchelor',836:'Katherine',837:'Katherine',838:'Katherine',
  840:'Katherine',845:'Katherine',850:'Tennant Creek',
  860:'Alice Springs',870:'Alice Springs',872:'Alice Springs',
  880:'Alice Springs',885:'Alice Springs',886:'Yulara',890:'Alice Springs',
  // WA - Perth metro
  6000:'Perth',6001:'Perth',6003:'Northbridge',6004:'East Perth',
  6005:'West Perth',6006:'North Perth',6007:'Leederville',6008:'Subiaco',
  6009:'Nedlands',6010:'Claremont',6011:'Cottesloe',6012:'Mosman Park',
  6014:'Floreat',6015:'City Beach',6016:'Mount Hawthorn',6017:'Mount Claremont',
  6018:'Karrinyup',6019:'Wembley Downs',6020:'Duncraig',6021:'Balcatta',
  6022:'Gwelup',6023:'Churchlands',6024:'Yokine',6025:'Greenwood',
  6026:'Kingsley',6027:'Joondalup',6028:'Ocean Reef',6029:'Edgewater',
  6030:'Mindarie',6031:'Clarkson',6032:'Merriwa',6033:'Alkimos',
  6034:'Yanchep',6035:'Eglinton',6036:'Butler',6037:'Two Rocks',
  6050:'Mount Lawley',6051:'Maylands',6052:'Inglewood',6053:'Bedford',
  6054:'Bayswater',6055:'Caversham',6056:'Midland',6057:'Greenmount',
  6059:'Morley',6060:'Nollamara',6061:'Westminster',6062:'Mirrabooka',
  6063:'Beechboro',6064:'Malaga',6065:'Wanneroo',6066:'Madeley',
  6069:'Ellenbrook',6070:'Mundaring',6071:'Kalamunda',6072:'Lesmurdie',
  6073:'Forrestfield',6074:'High Wycombe',6076:'Gooseberry Hill',6078:'Bullsbrook',
  6090:'Landsdale',6100:'Burswood',6101:'Lathlain',6102:'Rivervale',
  6104:'Ascot',6105:'Cloverdale',6106:'Welshpool',6107:'Beckenham',
  6108:'Thornlie',6109:'Cannington',6110:'Gosnells',6111:'Maddington',
  6112:'Forrestdale',6113:'Armadale',6114:'Kelmscott',
  6147:'Lynwood',6148:'Ferndale',6149:'Parkwood',6150:'Bull Creek',
  6151:'Booragoon',6152:'Applecross',6153:'Ardross',6154:'Brentwood',
  6155:'Canning Vale',6157:'North Fremantle',6158:'East Fremantle',
  6159:'Fremantle',6160:'Fremantle',6162:'South Fremantle',
  6163:'Spearwood',6164:'Munster',6165:'Henderson',6166:'Jandakot',
  6167:'Cockburn Central',6168:'Rockingham',6169:'Safety Bay',
  6170:'Baldivis',6171:'Port Kennedy',6172:'Secret Harbour',
  6173:'Golden Bay',6174:'Singleton',6175:'Mandurah',
  // WA - regional
  6210:'Mandurah',6220:'Bunbury',6230:'Bunbury',6280:'Busselton',
  6290:'Augusta',6300:'Northam',6320:'Albany',6330:'Albany',
  6430:'Kalgoorlie',6450:'Esperance',6530:'Geraldton',
  6710:'Exmouth',6714:'Karratha',6720:'Port Hedland',
  6725:'Broome',6728:'Derby',6730:'Kununurra',
  // TAS - Hobart
  7000:'Hobart',7001:'Hobart',7004:'Battery Point',7005:'Sandy Bay',
  7007:'Lenah Valley',7008:'New Town',7009:'Moonah',7010:'Glenorchy',
  7011:'Claremont',7012:'Berriedale',7015:'Lindisfarne',7016:'Rokeby',
  7018:'Howrah',7019:'Bellerive',7020:'Lauderdale',7026:'Sorell',
  7027:'Richmond',7030:'Brighton',7050:'Kingston',7051:'Blackmans Bay',
  7140:'New Norfolk',
  // TAS - Launceston
  7248:'Launceston',7249:'Launceston',7250:'Launceston',
  7252:'Prospect',7253:'Kings Meadows',7254:'Ravenswood',
  7255:'West Launceston',7258:'Exeter',7260:'George Town',
  // TAS - north west
  7307:'Devonport',7310:'Devonport',7315:'Devonport',
  7316:'Devonport',7320:'Burnie',7321:'Burnie',7325:'Burnie',
  7330:'Wynyard',7334:'Smithton',
};

class ShippingCalculator extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
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

  // Returns true for WA, NT, TAS postcodes (carrier-calculated + margin via Starshipit).
  // All other Australian postcodes use Shopify flat rate tiers.
  isRemoteState(postcode) {
    const pc = parseInt(String(postcode).replace(/\D/g, ''), 10);
    if (isNaN(pc)) return false;
    if (pc >= 799 && pc <= 999) return true;   // NT: 0799–0999
    if (pc >= 6000 && pc <= 6999) return true;  // WA
    if (pc >= 7000 && pc <= 7999) return true;  // TAS
    return false;
  }

  // Derives the Australian state code from a postcode so Starshipit can route correctly.
  getStateCode(postcode) {
    const pc = parseInt(String(postcode).replace(/\D/g, ''), 10);
    if (isNaN(pc)) return null;
    if (pc >= 200  && pc <= 299)  return 'ACT';
    if (pc >= 799  && pc <= 999)  return 'NT';
    if (pc >= 1000 && pc <= 2599) return 'NSW';
    if (pc >= 2600 && pc <= 2618) return 'ACT';
    if (pc >= 2619 && pc <= 2899) return 'NSW';
    if (pc >= 2900 && pc <= 2920) return 'ACT';
    if (pc >= 2921 && pc <= 2999) return 'NSW';
    if (pc >= 3000 && pc <= 3999) return 'VIC';
    if (pc >= 4000 && pc <= 4999) return 'QLD';
    if (pc >= 5000 && pc <= 5999) return 'SA';
    if (pc >= 6000 && pc <= 6999) return 'WA';
    if (pc >= 7000 && pc <= 7999) return 'TAS';
    if (pc >= 8000 && pc <= 8999) return 'VIC';
    if (pc >= 9000 && pc <= 9999) return 'QLD';
    return null;
  }

  // Flat rate tiers matching Shopify shipping settings for standard (non-WA/NT/TAS) states.
  // price is in Shopify cents, so divide by 100 before passing here.
  getFlatRate(orderTotalDollars) {
    if (orderTotalDollars <= 250) return 29;
    if (orderTotalDollars < 500) return 39;
    if (orderTotalDollars <= 1500) return 59;
    return 129;
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

    const orderTotal = (this.product.price / 100) * data.quantity;

    if (this.isRemoteState(data.zip)) {
      // WA / NT / TAS — auto-inject state and suburb for exact Starshipit routing
      data.province = this.getStateCode(data.zip);
      const pc = parseInt(String(data.zip).replace(/\D/g, ''), 10);
      if (!data.city) data.city = REMOTE_SUBURB_LOOKUP[pc] || null;
      await this.fetchStarshipitRate(data, true, orderTotal);
    } else {
      // All other states — flat rate tiers from Shopify settings
      const rate = this.getFlatRate(orderTotal);
      this.shippingRates = [{ total_price: rate }];
      this.renderResults(false);
    }
  }

  async fetchStarshipitRate(data, isRemote = false, orderTotal = 0) {
    this.setLoading(true);
    this.shippingRates = [];
    this.noShippingRates = false;
    this.errors = [];
    this.isFreeShipping = false;

    const payload = {
      rate: {
        origin: {
          suburb: 'Wetherill Park',
          city: 'Wetherill Park',
          province: 'NSW',
          postal_code: '2164',
          country: 'AU'
        },
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
        this.renderResults(isRemote);
      } else {
        this.noShippingRates = true;
        if (isRemote) {
          this.renderRemoteStateMessage(orderTotal);
        } else {
          this.renderNoRates();
        }
      }

    } catch (err) {
      this.errors = [{ details: err.message }];
      this.renderErrors();
    } finally {
      this.setLoading(false);
    }
  }

  renderResults(isRemote = false) {
    if (!this.resultsEl) return;
    if (this.isFreeShipping) {
      this.isFreeShipping = false;
    }
    const ratesHtml = this.shippingRates.map(rate => {
      const price = (rate.total_price !== undefined) ? (parseFloat(rate.total_price)).toFixed(2) : (rate.price !== undefined ? (parseFloat(rate.price)).toFixed(2) : '—');
      const label = `Your estimate: <strong>$${price}</strong>`;
      return `
        <li>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#20782C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7.75 11.9999L10.58 14.8299L16.25 9.16992" stroke="#20782C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>${label}</p>
        </li>`;
    }).join('');

    const html = `<ul class="shipping-rate">${ratesHtml}</ul>`;
    this.resultsEl.innerHTML = html;
  }

  renderRemoteStateMessage(orderTotal = 0) {
    if (!this.resultsEl) return;
    const baseRate = this.getFlatRate(orderTotal);
    this.resultsEl.innerHTML = `
      <ul class="shipping-rate">
        <li>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#20782C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7.75 11.9999L10.58 14.8299L16.25 9.16992" stroke="#20782C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>Your estimate: <strong>$${baseRate}.00</strong></p>
        </li>
      </ul>`;
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

if (!customElements.get('shipping-calculator')) {
  customElements.define('shipping-calculator', ShippingCalculator);
}
