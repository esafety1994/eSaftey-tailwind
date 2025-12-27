document.addEventListener('DOMContentLoaded', function () {
  // Sheet toggle (Shop trigger)
  var trigger = document.getElementById('shop-trigger');
  var sheet = document.getElementById('site-sheet');
  var overlay = document.getElementById('sheet-overlay');
  var closeBtn = document.getElementById('sheet-close');
  var lastFocused = null;

  function openSheet() {
    if (!sheet || !overlay) return;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden','false');
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    // store last focused element to restore focus on close
    lastFocused = document.activeElement;
    // focus first focusable inside sheet
    setTimeout(function(){
      var focusable = sheet.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }, 10);
    if (trigger) trigger.setAttribute('aria-expanded','true');
    document.body.classList.add('overflow-hidden');
  }

  function closeSheet() {
    if (!sheet || !overlay) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden','true');
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    if (trigger) trigger.setAttribute('aria-expanded','false');
    document.body.classList.remove('overflow-hidden');
    if (lastFocused) lastFocused.focus();
  }

  if (trigger) trigger.addEventListener('click', function(e){ e.preventDefault(); openSheet(); });
  if (closeBtn) closeBtn.addEventListener('click', function(){ closeSheet(); });
  if (overlay) overlay.addEventListener('click', function(){ closeSheet(); });

  // close on Escape
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeSheet();
  });

  // Accordion behavior for mega-menu
  document.querySelectorAll('.mega-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var targetId = btn.getAttribute('data-target');
      var target = document.getElementById(targetId);
      if (!target) return;

      var isExpanded = btn.getAttribute('aria-expanded') === 'true';

      // Scope: siblings only
      var scope = btn.closest('ul') || document;

      // helper to close panel
      function closePanel(p, toggleBtn){
        if (!p) return;
        // ensure fixed height before collapsing for smooth animation
        p.style.height = p.scrollHeight + 'px';
        // force reflow
        p.offsetHeight;
        p.style.height = '0px';
        p.classList.remove('open');
        if (toggleBtn){
          toggleBtn.setAttribute('aria-expanded','false');
          toggleBtn.querySelector('svg')?.classList.remove('rotate-180');
        }
      }

      // helper to open panel
      function openPanel(p, toggleBtn){
        if (!p) return;
        // set to exact height to animate
        p.style.height = p.scrollHeight + 'px';
        p.classList.add('open');
        if (toggleBtn){
          toggleBtn.setAttribute('aria-expanded','true');
          toggleBtn.querySelector('svg')?.classList.add('rotate-180');
        }
        // when transition ends, clear explicit height so content can grow/shrink naturally
        var onTransitionEnd = function(e){
          if (e.propertyName === 'height'){
            p.style.height = 'auto';
            p.removeEventListener('transitionend', onTransitionEnd);
          }
        };
        p.addEventListener('transitionend', onTransitionEnd);
      }

      // Close sibling panels only
      scope.querySelectorAll('.mega-toggle[aria-expanded="true"]').forEach(function(openBtn){
        if (openBtn === btn) return;
        var openPanel = document.getElementById(openBtn.getAttribute('data-target'));
        closePanel(openPanel, openBtn);
      });

      if (isExpanded) {
        closePanel(target, btn);
      } else {
        openPanel(target, btn);
        // ensure ancestors adjust (open ancestor panels should have height:auto or be updated)
        window.requestAnimationFrame(function(){
          document.querySelectorAll('.mega-toggle[aria-expanded="true"]').forEach(function(openBtn){
            var panel = document.getElementById(openBtn.getAttribute('data-target'));
            if (panel && panel.style.height !== 'auto') panel.style.height = panel.scrollHeight + 'px';
          });
        });
      }
    });
  });
});
// Theme JavaScript for eSafety Tailwind Theme

document.addEventListener('DOMContentLoaded', function() {
  // Quick View functionality
  const quickViewButtons = document.querySelectorAll('.quick-view-btn');

  quickViewButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const productHandle = this.getAttribute('data-product-handle');

      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-4 border-b">
            <button class="float-right text-gray-500 hover:text-gray-700 close-modal">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            <h2 class="text-xl font-semibold">Quick View</h2>
          </div>
          <div class="p-4">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-2 text-gray-600">Loading product...</p>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Load product data via AJAX
      fetch(`/products/${productHandle}.js`)
        .then(response => response.json())
        .then(product => {
          const modalContent = modal.querySelector('.p-4:last-child');
          modalContent.innerHTML = `
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                ${product.featured_image ? `<img src="${product.featured_image}" alt="${product.title}" class="w-full rounded-lg">` : '<div class="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">No Image</div>'}
              </div>
              <div>
                <h3 class="text-2xl font-bold mb-2">${product.title}</h3>
                <div class="text-xl font-semibold mb-4">${product.price}</div>
                <p class="text-gray-600 mb-4">${product.description}</p>
                <form method="post" action="/cart/add">
                  <input type="hidden" name="id" value="${product.variants[0].id}">
                  <input type="hidden" name="quantity" value="1">
                  <button type="submit" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    Add to Cart
                  </button>
                </form>
              </div>
            </div>
          `;
        })
        .catch(error => {
          console.error('Error loading product:', error);
          const modalContent = modal.querySelector('.p-4:last-child');
          modalContent.innerHTML = '<p class="text-center text-red-600">Error loading product. Please try again.</p>';
        });

      // Close modal functionality
      modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
          modal.remove();
        }
      });
    });
  });

  // Handle cart form submissions with AJAX
  const cartForms = document.querySelectorAll('form[action="/cart/add"]');

  cartForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const button = this.querySelector('button[type="submit"]');
      const originalText = button.textContent;

      button.textContent = 'Adding...';
      button.disabled = true;

      fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        button.textContent = 'Added!';
        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        button.classList.add('bg-green-600', 'hover:bg-green-700');

        // Update cart count if you have one
        // updateCartCount();

        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
          button.classList.remove('bg-green-600', 'hover:bg-green-700');
          button.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }, 2000);
      })
      .catch(error => {
        console.error('Error adding to cart:', error);
        button.textContent = 'Error';
        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        button.classList.add('bg-red-600', 'hover:bg-red-700');

        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
          button.classList.remove('bg-red-600', 'hover:bg-red-700');
          button.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }, 2000);
      });
    });
  });
});