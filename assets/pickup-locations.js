(function () {
  var panel = document.querySelector('[data-pickup-panel]');
  if (!panel || !window.pickupLocationsConfig) return;

  var config = window.pickupLocationsConfig;
  if (!config.token || !config.productHandle) return;

  // Shopify location name → warehouse code used in the HTML markup.
  // Each location has gone through two renames so historical names are kept
  // as fallbacks until the admin rename is fully live on prod:
  //   1. "Click & Collect"      → "Sydney Warehouse" (Satbar 2026-09-25)
  //   2. "Sydney Warehouse"     → "Sydney"           (Karan 2026-10-06)
  //   3. "Queensland Warehouse" → "Brisbane"         (Karan 2026-10-06)
  //   4. "Victoria Warehouse"   → "Melbourne"        (Karan 2026-10-06)
  // Once prod is renamed, the "...Warehouse" and "Click & Collect" keys can
  // be removed.
  var LOCATION_TO_CODE = {
    'Click & Collect': 'W1',
    'Sydney Warehouse': 'W1',
    'Sydney': 'W1',
    'Queensland Warehouse': 'QW',
    'Brisbane': 'QW',
    'Victoria Warehouse': 'VW',
    'Melbourne': 'VW'
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

      // Sydney HQ — always shows "Available" (HQ can fulfil via backorder).
      // When Sydney stock is 0 or negative (oversold), ALSO show the
      // variant's Stock Status metafield as a secondary status pill so the
      // customer sees the real delivery timing (e.g. "1-2 Days", "Back
      // Order"). Satbar's original rule (Odoo 30179, 2026-09-29) was to
      // mirror the metafield as the sole badge; Karan 2026-10-08 split it
      // so the primary badge is always "Available" and the status pill only
      // appears when stock is low/oversold.
      // For QLD/VIC we still use the simple Storefront-API-driven qty check.
      var isSydney = (code === 'W1');
      var stockStatus = (config.stockStatus || '').trim();
      var stockEl = row.querySelector('.pdp-cc-loc-stock');

      if (isSydney) {
        if (countEl) countEl.textContent = '';
        if (stockEl) {
          // Sydney badge rules (Karan 2026-10-07 standup, confirmed 2026-10-08):
          //   qty > 0  → single "Available" pill
          //              (Sydney has stock, no delivery-time pill needed)
          //   qty <= 0 → "Available" + status pill from the Stock Status
          //              metafield (so the shopper sees "1-2 Days",
          //              "Back Order", etc. because we're backordering)
          //              EXCEPT when the metafield is empty or literally
          //              "Out of Stock" — then skip the pill because it
          //              conflicts with the primary "Available" badge.
          if (qty > 0) {
            stockEl.innerHTML =
              '<span class="pdp-cc-loc-badge pdp-cc-badge-available" data-stock-badge>Available</span>';
          } else if (stockStatus && stockStatus.toLowerCase() !== 'out of stock') {
            stockEl.innerHTML =
              '<span class="pdp-cc-loc-badge pdp-cc-badge-available" data-stock-badge>Available</span>' +
              '<span class="pdp-cc-loc-badge pdp-cc-badge-status">' + stockStatus + '</span>';
          } else {
            stockEl.innerHTML =
              '<span class="pdp-cc-loc-badge pdp-cc-badge-available" data-stock-badge>Available</span>';
          }
        }
        row.dataset.stockState = 'available';
        stockedStateCount++;
      } else {
        var showAvailable = entry && qty > 0;
        if (showAvailable) {
          if (countEl) countEl.textContent = qty;
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
