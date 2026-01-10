document.addEventListener("Searchanise.Loaded", function () {
  (function ($) {
    $(document).on("Searchanise.ResultsUpdated", function (event, container) {
      console.log("Searchanise results updated:", container);

      // Helper to escape HTML
      function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

      console.log('Searchanise.ResultsUpdated handler running. container:', container);
      // Find all result list items with original product id
      try { console.log('Locating #snize_results li[data-original-product-id]...'); } catch(e){}
      try {
        var $results = $("#snize_results li[data-original-product-id]");
        console.log('Found result items:', $results.length);
        if ($results.length === 0) { console.log('No snize result items found - exiting handler.'); return; }

        // Inject a small stylesheet to hide .snize-description once per page
        if (!document.getElementById('searchanise-custom-styles')) {
          var style = document.createElement('style');
          style.id = 'searchanise-custom-styles';
          style.innerHTML = '.snize-description{display:none !important;}';
          document.head.appendChild(style);
        }

        $results.each(function () {
          var $li = $(this);
          var prodId = $li.attr('data-original-product-id');
          console.log('Processing li element, data-original-product-id=', prodId);
          if (!prodId) return;

          // If we've already enhanced this li, skip
          if ($li.data('tags-rendered')) return;
          if ($li.data('tags-rendered')) { console.log('Skipping already enhanced li for', prodId); return; }
          $li.data('tags-rendered', true);

          // Build fetch URL. Searchanise may supply numeric ID or handle — try both.
          // If prodId looks like a number, we need to fetch by handle. To avoid extra lookups,
          // first try using Shopify's /products/<id>.js will not work for numeric id; so try handle path if present.
          var fetchByHandle = null;
          // prodId may be in format 'gid://shopify/Product/1234567890' or numeric or handle
          if (/Product\//.test(prodId)) {
            var m = prodId.match(/Product\/(\d+)$/);
            if (m) { fetchByHandle = '/products/' + m[1] + '.js'; }
          }
          // If prodId seems like a handle (contains letters or hyphen), try handle endpoint
          if (!fetchByHandle && /[a-zA-Z\-]/.test(prodId)) {
            fetchByHandle = '/products/' + prodId + '.js';
          }

          // As a fallback, try data attribute product-handle attribute on the li
          if (!fetchByHandle && $li.attr('data-product-handle')) {
            fetchByHandle = '/products/' + $li.attr('data-product-handle') + '.js';
          }

          // If still unknown, try to find an anchor inside the li that links to the product
          if (!fetchByHandle) {
            var $anchor = $li.find('a[href*="/products/"]').first();
            if ($anchor && $anchor.length) {
              var href = $anchor.attr('href');
              try {
                var regex = /\/products\/([^\/?#]+)/i;
                var m = regex.exec(href);
                if (m && m[1]) {
                  var mHandle = decodeURIComponent(m[1]);
                  fetchByHandle = '/products/' + mHandle + '.js';
                  console.log('Derived handle from anchor href:', mHandle, '->', fetchByHandle);
                }
              } catch (e) {
                console.warn('Error parsing anchor href for handle', href, e);
              }
            }
          }

          if (!fetchByHandle) {
            console.warn('Could not determine product fetch endpoint for', prodId, 'data-product-handle=', $li.attr('data-product-handle'));
            // cannot determine endpoint; skip
            return;
          }

          console.log('Will fetch product JSON from:', fetchByHandle, 'for li id:', prodId);

          // Fetch product JSON and render tags element above .snize-overhidden inside this li
          $.getJSON(fetchByHandle).done(function (product) {
            console.log('Fetched product JSON for', prodId, product && (product.handle || product.id || product.title));
            try {
              // Determine tags and discount (reuse logic similar to product-tabs)
              var tags = product.tags || product.tags || [];
              var isNew = false;
              if (Array.isArray(tags)) {
                tags.forEach(function (t) {
                  var td = t.toString().toLowerCase().trim();
                  if (td === 'new' || td === 'new-arrival' || td === 'new arrival' || td === 'newarrival') {
                    isNew = true;
                  }
                });
              } else if (typeof tags === 'string') {
                var parts = tags.split(',');
                parts.forEach(function (t) {
                  var td = t.toString().toLowerCase().trim();
                  if (td === 'new' || td === 'new-arrival' || td === 'new arrival' || td === 'newarrival') {
                    isNew = true;
                  }
                });
              }

              var compare_price = product.compare_at_price_max || (product.variants && product.variants[0] && product.variants[0].compare_at_price) || 0;
              var selling_price = product.price || (product.variants && product.variants[0] && product.variants[0].price) || 0;
              // Ensure numeric
              var cpNum = parseFloat(compare_price) || 0;
              var spNum = parseFloat(selling_price) || 0;
              var discount_pct = 0;
              if (cpNum > 0 && cpNum > spNum) {
                discount_pct = Math.round(((cpNum - spNum) * 100) / cpNum);
              }

              // Build badges HTML using Tailwind-style classes (inline - we'll insert under .snize-thumbnail)
              var badgesHtml = '';
              if (discount_pct > 0) {
                badgesHtml = '<div class="searchanise-badges mb-2"><span class="bg-primary-yellow text-black rounded-full text-sm font-semibold px-3 py-1">-' + discount_pct + '%</span></div>';
              } else if (isNew) {
                badgesHtml = '<div class="searchanise-badges mb-2"><span class="bg-black text-primary-yellow rounded-full text-sm font-semibold px-3 py-1">NEW</span></div>';
              }

              // Determine product URL (use published URL if present)
              var prodUrl = product.url || ('/products/' + (product.handle || ''));

              // Determine image URL (featured image or first image)
              var imgUrl = '';
              if (product.featured_image && product.featured_image.src) imgUrl = product.featured_image.src;
              else if (product.images && product.images.length) imgUrl = product.images[0] || '';

              // Format price display
              var priceDisplay = '';
              if (product.price_min && product.price_max && product.price_min === product.price_max) {
                priceDisplay = (product.price_min / 100).toFixed(2);
              } else if (product.variants && product.variants[0] && product.variants[0].price) {
                priceDisplay = (product.variants[0].price / 100).toFixed(2);
              } else if (product.price) {
                priceDisplay = product.price;
              }

              // Choose a variant id for add-to-cart (first available)
              var variantId = (product.variants && product.variants[0] && product.variants[0].id) ? product.variants[0].id : null;

              // Prepare tags array (up to 3)
              var allTags = product.tags || [];
              if (typeof allTags === 'string') allTags = allTags.split(',');
              allTags = (allTags || []).slice(0,3);

              // Build full product-card HTML (replace entire li contents)
              var fullCard = '';
              // Use the theme's detailed structure; copy core elements and inject dynamic values
              var hoverImg = (product.images && product.images[1]) ? product.images[1] : (product.images && product.images[0]) ? product.images[0] : imgUrl;
              var comparePriceDisplay = (cpNum>0) ? ( (cpNum/100).toFixed(2) ) : '';
              fullCard += '<article class="product-card flex flex-col overflow-hidden transition-transform transform p-1.5 h-[580px] md:h-full max-w-sm m-auto 2xl:max-w-none" style="background-color:#ffffff;border:1px solid #D6D4D4;border-radius:0;padding:0.375rem;">';
              fullCard += '  <div class="relative overflow-hidden">';
              fullCard += '    <div class="block relative w-full z-10 group" style="padding-bottom:100%;">';
              fullCard += '      <div class="image-skeleton absolute inset-0 z-30 flex items-center justify-center bg-gray-200" style="display:none;">';
              fullCard += '        <div class="w-24 h-24 bg-gray-300 rounded animate-pulse"></div>';
              fullCard += '      </div>';
              // left badges (discount/new)
              if (badgesHtml) {
                fullCard += '      <div class="badges absolute top-3 left-3 z-40 flex flex-col items-end gap-2">' + badgesHtml + '</div>';
              }
              // right action button placeholder (keeps parity with theme)
              fullCard += '      <div class="badges absolute top-3 right-3 z-40 flex flex-col items-end gap-2">';
              fullCard += '        <button data-quotify-cart="" data-shop="" type="button" class="p-1 transition-all duration-200 ease-in-out flex items-center justify-center rounded-full size-10 hover:text-white hover:bg-black ">';
              fullCard += '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="size-6 cursor-pointer"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>';
              fullCard += '        </button>';
              fullCard += '      </div>';

              // link + images
              fullCard += '      <a href="' + escapeHtml(prodUrl) + '" class="absolute inset-0 z-20 block">';
              if (hoverImg) {
                fullCard += '        <img data-hover-src="' + escapeHtml(hoverImg) + '" alt="' + escapeHtml(product.title) + '" class="absolute inset-0 w-full h-full object-cover transition-all duration-300 opacity-0 group-hover:!opacity-100 group-hover:scale-105 z-20 hover-image" loading="lazy" src="' + escapeHtml(imgUrl) + '">';
              } else {
                fullCard += '        <img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(product.title) + '" class="absolute inset-0 w-full h-full object-cover" loading="lazy">';
              }
              fullCard += '      </a>';
              fullCard += '    </div>';
              fullCard += '  </div>';

              // tags badges
              if (allTags && allTags.length) {
                fullCard += '  <div class="flex flex-wrap gap-3 py-2">';
                allTags.forEach(function(t){ fullCard += '<span class="text-sm px-3 py-2 rounded-full font-medium" style="background:#f3f4f6;color:#111;">' + escapeHtml(t.trim()) + '</span>'; });
                fullCard += '  </div>';
              }

              fullCard += '  <div class="flex flex-col gap-2 flex-grow" style="padding:15px;">';
              fullCard += '    <a href="' + escapeHtml(prodUrl) + '" class="font-bold" style="font-size:18px;color:#000000;font-weight:500;">' + escapeHtml(product.title) + '</a>';

              fullCard += '    <div id="product-stock-badge" class="text-gray-600">';
              if (product.available) {
                fullCard += '<span class="flex py-1 text-sm gap-1 items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="size-6 text-green-700"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg><span class="text-green-700">While Stock Lasts</span></span>';
              }
              fullCard += '    </div>';

              fullCard += '    <div class="grid gap-2 my-4 items-center" style="font-size:14px;color:#000;">';
              fullCard += '      <span class="font-semibold flex justify-between"><span class="flex flex-wrap items-center justify-start gap-1.5"><span>$' + escapeHtml(priceDisplay) + '</span><span class="text-sm">(inc. GST)</span></span><span><span class="text-bg-light-red line-through flex flex-wrap ml-4 justify-end"><span>$' + escapeHtml(comparePriceDisplay || '') + '</span><span class="ml-2 text-sm">(inc. GST)</span></span></span></span>';
              fullCard += '    </div>';

              // add to cart form (uses first variant id)
              fullCard += '  <div class="flex justify-center my-2">';
              fullCard += '    <form method="post" action="/cart/add" class="shopify-product-form">';
              if (variantId) fullCard += '<input type="hidden" name="id" value="' + escapeHtml(variantId) + '">';
              fullCard += '      <div class="flex items-center space-x-4">';
              fullCard += '        <div class="qty-selector items-center space-x-1 border p-2 rounded-lg">';
              fullCard += '          <button type="button" class="cursor-pointer qty-decrease">-</button>';
              fullCard += '          <input type="number" name="quantity" value="1" min="1" class="qty-input w-6 text-center">';
              fullCard += '          <button type="button" class="cursor-pointer qty-increase">+</button>';
              fullCard += '        </div>';
              fullCard += '        <button type="submit" class="primary-cart-button w-full m-auto justify-center quick-add-btn">Add to Cart</button>';
              fullCard += '      </div>';
              fullCard += '      <input type="hidden" name="product-id" value="' + escapeHtml(prodId) + '">';
              fullCard += '    </form>';
              fullCard += '  </div>';

              fullCard += '</article>';

              // Replace entire li contents with our card
              try {
                $li.empty();
                // ensure the li also carries the theme's Tailwind classes for layout
                try {
                  $li.addClass('product-card flex flex-col overflow-hidden transition-transform transform p-1.5 h-[580px] md:h-full max-w-sm m-auto 2xl:max-w-none');
                } catch(e) { /* older jQuery may not accept bracketed class names; ignore */ }
                $li.append(fullCard);
                console.log('Replaced li contents with product-card for', prodId);

                // Attach handlers for qty and add-to-cart
                (function($container, vId){
                  var $decrease = $container.find('.qty-decrease');
                  var $increase = $container.find('.qty-increase');
                  var $input = $container.find('.qty-input');
                  var $btn = $container.find('.add-to-cart-btn');
                  var $form = $container.find('form');
                  if (!$btn.length && $form.length) $btn = $form.find('button[type="submit"]');

                  $decrease.on('click', function(){
                    var val = parseInt($input.val(),10) || 1; if (val>1) $input.val(val-1);
                  });
                  $increase.on('click', function(){
                    var val = parseInt($input.val(),10) || 1; $input.val(val+1);
                  });
                  $input.on('change', function(){ if (parseInt($input.val(),10) < 1) $input.val(1); });

                  if ($form && $form.length) {
                    $form.on('submit', function(e){
                      e.preventDefault();
                      var qty = parseInt($input.val(),10) || 1;
                      if (!vId) { console.warn('No variant id available for add-to-cart', prodId); return; }
                      var $submit = $(this).find('button[type="submit"]');
                      $submit.prop('disabled', true).text('Adding...');
                      fetch('/cart/add.js', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: vId, quantity: qty })
                      }).then(function(res){ return res.json(); }).then(function(resp){
                        console.log('Add to cart success', resp);
                        $submit.text('Added');
                        setTimeout(function(){ $submit.prop('disabled', false).text('Add to Cart'); }, 1200);
                      }).catch(function(err){
                        console.error('Add to cart failed', err);
                        $submit.prop('disabled', false).text('Add to Cart');
                      });
                    });
                  } else if ($btn && $btn.length) {
                    $btn.on('click', function(){
                      var qty = parseInt($input.val(),10) || 1;
                      if (!vId) { console.warn('No variant id available for add-to-cart', prodId); return; }
                      $btn.prop('disabled', true).text('Adding...');
                      fetch('/cart/add.js', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: vId, quantity: qty })
                      }).then(function(res){ return res.json(); }).then(function(resp){
                        console.log('Add to cart success', resp);
                        $btn.text('Added');
                        setTimeout(function(){ $btn.prop('disabled', false).text('Add to cart'); }, 1200);
                      }).catch(function(err){
                        console.error('Add to cart failed', err);
                        $btn.prop('disabled', false).text('Add to cart');
                      });
                    });
                  }
                })($li, variantId);

              } catch (e) {
                console.error('Failed to replace li contents for', prodId, e);
              }
            } catch (e) {
              console.error('Error processing product tags for', product, e);
            }
          }).fail(function (jqxhr, status, err) {
            console.error('Failed to fetch product JSON from', fetchByHandle, 'status:', status, 'err:', err);
          });
        });
      } catch (err) {
        console.error('snize tag injection error', err);
      }
    });
  })(window.Searchanise.$);
});
