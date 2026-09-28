(function () {
  var panel = document.querySelector('[data-pickup-panel]');
  if (!panel || !window.pickupLocationsConfig) return;

  var config = window.pickupLocationsConfig;
  if (!config.token || !config.productHandle) return;

  // Shopify location name → warehouse code used in the HTML markup.
  // "Click & Collect" and "Sydney Warehouse" both resolve to W1 during the
  // Shopify admin location rename (Odoo task "Change Click & Collect to
  // Sydney Warehouse", Satbar 2026-09-25). Once rename is fully deployed
  // the "Click & Collect" key can be removed.
  var LOCATION_TO_CODE = {
    'Click & Collect': 'W1',
    'Sydney Warehouse': 'W1',
    'Queensland Warehouse': 'QW',
    'Victoria Warehouse': 'VW'
  };

  var stateCountEl = document.querySelector('[data-cc-state-count]');
  var locationRows = panel.querySelectorAll('[data-location]');
  var cache = new Map();
  var didFetch = false;

  function gqlUrl() {
    return 'https://' + config.shopDomain + '/api/' + (config.apiVersion || '2025-10') + '/graphql.json';
  }

  function extractVariantIdFromGid(gid) {
    return String(gid).split('/').pop();
  }

  function fetchAllVariants() {
    if (didFetch) return Promise.resolve();
    didFetch = true;

    var query = 'query($handle: String!) {' +
      '  product(handle: $handle) {' +
      '    variants(first: 100) {' +
      '      nodes {' +
      '        id' +
      '        storeAvailability(first: 20) {' +
      '          edges {' +
      '            node {' +
      '              available' +
      '              quantityAvailable' +
      '              pickUpTime' +
      '              location { name }' +
      '            }' +
      '          }' +
      '        }' +
      '      }' +
      '    }' +
      '  }' +
      '}';

    return fetch(gqlUrl(), {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': config.token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query: query, variables: { handle: config.productHandle } })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var variants = (data && data.data && data.data.product && data.data.product.variants && data.data.product.variants.nodes) || [];
        variants.forEach(function (v) {
          var id = extractVariantIdFromGid(v.id);
          var edges = (v.storeAvailability && v.storeAvailability.edges) || [];
          cache.set(id, edges.map(function (e) { return e.node; }));
        });
      })
      .catch(function (err) {
        console.warn('[pickup-locations] Fetch failed:', err);
        didFetch = false;
      });
  }

  function renderPanel(availability) {
    var stockedStateCount = 0;

    locationRows.forEach(function (row) {
      var code = row.dataset.location;
      var countEl = row.querySelector('[data-stock-count]');
      var badgeEl = row.querySelector('[data-stock-badge]');
      var shopifyName = Object.keys(LOCATION_TO_CODE).find(function (name) {
        return LOCATION_TO_CODE[name] === code;
      });
      var entry = (availability || []).find(function (a) {
        return a.location && a.location.name === shopifyName;
      });

      var qty = entry ? (entry.quantityAvailable || 0) : 0;
      // Raw quantity always stored so downstream code (shipping calculator)
      // can compare against the shopper's ordered quantity, not just the
      // available/unavailable flag.
      row.dataset.stockQuantity = String(qty);

      // Sydney HQ bypass — always show "Available" regardless of the actual
      // per-warehouse inventory. Sydney fulfills any order via source or
      // backorder, so the badge mirrors the product-level availability
      // rather than the warehouse-specific stock count. Same rule that
      // checkout-routing pickup-filter uses (Odoo task "For Sydney
      // Warehouse the stock status must match the product's stock status",
      // Satbar 2026-09-25).
      var isSydney = (code === 'W1');
      var showAvailable = isSydney || (entry && qty > 0);

      if (showAvailable) {
        if (countEl) countEl.textContent = isSydney ? '' : qty;
        if (badgeEl) {
          badgeEl.className = 'pdp-cc-loc-badge pdp-cc-badge-available';
          badgeEl.textContent = 'Available';
        }
        row.dataset.stockState = 'available';
        stockedStateCount++;
      } else {
        if (countEl) countEl.textContent = '';
        if (badgeEl) {
          badgeEl.className = 'pdp-cc-loc-badge pdp-cc-badge-unavailable';
          badgeEl.textContent = 'Not available';
        }
        row.dataset.stockState = 'unavailable';
      }
    });

    if (stateCountEl) stateCountEl.textContent = stockedStateCount;
  }

  function updateForVariant(variantId) {
    if (!variantId) return;
    var id = String(variantId);
    fetchAllVariants().then(function () {
      var availability = cache.get(id) || [];
      renderPanel(availability);
    });
  }

  function getSelectedVariantId() {
    // URL is authoritative — theme's variant picker does a full page navigation
    // with ?variant=xxx on each variant change, so URL always reflects current variant.
    try {
      var urlVariant = new URL(window.location.href).searchParams.get('variant');
      if (urlVariant) return urlVariant;
    } catch (e) {}
    // Fallback to Liquid-rendered initial ID
    if (config.initialVariantId) return config.initialVariantId;
    // Final fallback: hidden form input
    var input = document.querySelector('form input[name="id"]');
    return input && input.value ? input.value : null;
  }

  updateForVariant(getSelectedVariantId());

  // Safety net for any theme that DOES switch variants without full page reload.
  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'id') {
      updateForVariant(e.target.value);
    }
  });
})();
