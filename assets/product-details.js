(function(){
  // Minimal module: attach direct click handlers to any .show-full-desc button
  function onClickScroll(e) {
    var btn = e.currentTarget;
    var controls = btn.getAttribute('aria-controls');
    var target = controls ? document.getElementById(controls) : document.getElementById('product-details-target');
    if (!target) return;

    // toggle aria-expanded and arrow rotation for this button
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    // keep icon static: do not toggle rotation for show-full-desc / See full FAQ

    // use scroll helper that accounts for sticky headers and offsets
    scrollToElement(target);
    // After scrolling, activate the Description tab if present inside the target's root
    try {
      var root = target.closest && target.closest('.product-details-expandable');
      if (!root) root = document.querySelector('.product-details-expandable');
      if (root) {
        var descBtn = root.querySelector('.tab-btn[data-tab="description"]');
        if (descBtn) activateTab(root, 'description');
      }
    } catch (err) { console.warn(err); }
  }

  function init() {
    document.querySelectorAll('.show-full-desc').forEach(function(btn){
      // remove any previous handler to avoid duplicates
      btn.removeEventListener('click', onClickScroll);
      btn.addEventListener('click', onClickScroll);
    });

    // Initialize tabs: set Description active by default and wire tab buttons
    document.querySelectorAll('.product-details-expandable').forEach(function(root){
      // wire tab button clicks for this root
      root.querySelectorAll('.tab-btn').forEach(function(b){
        b.addEventListener('click', function(e){
          var tabName = b.getAttribute('data-tab');
          activateTab(root, tabName);
        });
      });

      activateTab(root, 'description');
      // build FAQ preview for this root (if a preview container exists)
      try { buildFaqPreview(root); } catch (err) { /* ignore */ }
    });
  }

  function activateTab(root, tabName) {
    if (!root) return;
    var btns = root.querySelectorAll('.tab-btn');
    btns.forEach(function(b){
      var t = b.getAttribute('data-tab');
      var panel = root.querySelector('[data-panel="'+t+'"]');
      if (t === tabName) {
        b.classList.add('text-primary','bg-black');
        b.classList.remove('text-gray-700');
        b.classList.remove('hover:text-black');
        b.classList.remove('bg-white','border','border-gray-200');
        b.setAttribute('aria-selected','true');
        if (panel) panel.classList.remove('hidden');
        // ensure preview is initialized when showing description or shipping
        if (t === 'description' || t === 'shipping') setupDescPreviewForPanel(root, t);
      } else {
        b.classList.remove('text-primary','bg-black');
        b.classList.add('text-gray-700');
        b.classList.add('hover:text-black');
        b.classList.add('bg-white','border','border-gray-200');
        b.setAttribute('aria-selected','false');
        if (panel) panel.classList.add('hidden');
      }
    });
  }

  function setupDescPreviewForPanel(root, panelName) {
    if (!root) return;
    var panel = root.querySelector('[data-panel="' + panelName + '"]');
    if (!panel) return;
    var preview = panel.querySelector('.desc-preview');
    var btn = panel.querySelector('.desc-toggle');
    if (!preview || !btn) return;

    btn.removeEventListener('click', toggleDesc);
    btn.addEventListener('click', toggleDesc);

    // reset to measure full height
    preview.style.maxHeight = '';
    var fullH = preview.scrollHeight;
    var collapsedH = 360;
    var fade = preview.querySelector('.fade');

    if (fullH <= collapsedH) {
      btn.style.display = 'none';
      if (fade) fade.style.display = 'none';
      preview.style.maxHeight = '';
      btn.setAttribute('aria-expanded','false');
    } else {
      btn.style.display = '';
      if (btn.getAttribute('aria-expanded') === 'true') {
        preview.style.maxHeight = fullH + 'px';
        if (fade) fade.style.display = 'none';
        btn.textContent = 'Read less';
      } else {
        preview.style.maxHeight = collapsedH + 'px';
        if (fade) fade.style.display = '';
        btn.textContent = 'Read more';
      }
    }
  }

  function toggleDesc(e) {
    var btn = e.currentTarget;
    var panel = btn.closest('[data-panel]');
    if (!panel) return;
    var preview = panel.querySelector('.desc-preview');
    var fade = preview && preview.querySelector('.fade');
    if (!preview) return;
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      // collapse
      preview.style.maxHeight = '360px';
      if (fade) fade.style.display = '';
      btn.setAttribute('aria-expanded','false');
      btn.textContent = 'Read more';
    } else {
      // expand
      preview.style.maxHeight = preview.scrollHeight + 'px';
      if (fade) fade.style.display = 'none';
      btn.setAttribute('aria-expanded','true');
      btn.textContent = 'Read less';
    }
  }

  /* Build a small FAQ preview (first 2 Q/A) from rendered rich_text in the FAQ panel */
  function buildFaqPreview(root){
    if (!root) return;
    // preview may be rendered in a different section (moved by theme). Try to find it nearby, otherwise fall back to document.
    var section = root.closest('.product-info-tabs');
    var preview = (section && section.querySelector('.product-faq-preview')) || document.querySelector('.product-faq-preview');
    if (!preview) return;
    var wrapper = preview.querySelector('.sidebar-faq-qa-wrapper');
    if (!wrapper) return;
    var faqPanel = root.querySelector('[data-panel="faq"]');
    if (!faqPanel) { wrapper.innerHTML=''; return; }
    var faqContent = faqPanel.querySelector('.faq-section') || faqPanel;

    var paragraphs = Array.from(faqContent.querySelectorAll('p'));
    var pairs = [];
    for (var i=0;i<paragraphs.length;i++){
      var p = paragraphs[i];
      var bold = p.querySelector('b, strong');
      if (bold) {
        var q = bold.textContent.trim();
        // answer is the remainder of this paragraph plus following non-question paragraphs
        var pText = p.textContent.trim();
        var answer = pText.replace(bold.textContent,'').trim();
        var j = i+1;
        while (j<paragraphs.length && !paragraphs[j].querySelector('b, strong')){
          answer += (answer ? '\n' : '') + paragraphs[j].textContent.trim();
          j++;
        }
        pairs.push({question:q, answer: answer});
        i = j-1;
      }
      if (pairs.length>=2) break;
    }

    // fallback: try bold elements globally
    if (pairs.length===0){
      var bolds = Array.from(faqContent.querySelectorAll('b, strong'));
      for (var k=0;k<bolds.length;k++){
        var b = bolds[k];
        var q = b.textContent.trim();
        var ans = '';
        var next = b.parentElement.nextElementSibling;
        if (next) ans = next.textContent.trim();
        pairs.push({question:q, answer:ans});
        if (pairs.length>=2) break;
      }
    }

    // populate wrapper
    wrapper.innerHTML = '';
    if (pairs.length===0){
      preview.style.display = 'none';
      return;
    }
    preview.style.display = '';
    pairs.forEach(function(p){
      var item = document.createElement('div');
      item.className = 'sidebar-faq-qa border border-gray-200 my-2 rounded-md';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebar-faq-q w-full text-left px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-900 focus:outline-none';
      btn.setAttribute('aria-expanded','false');
      btn.innerHTML = '<span class="flex-1">' + (p.question || '') + '</span>' + '<span class="sidebar-faq-icon ml-3 text-gray-500 text-lg font-medium border rounded-full w-6 h-6 flex items-center justify-center">+</span>';
      // handler will be attached by the standalone accordion script; do not add duplicate handler here

      var ansEl = document.createElement('div');
      ansEl.className = 'sidebar-faq-a px-4 py-3 text-sm text-gray-700';
      ansEl.hidden = true;
      // preserve newlines in answers
      ansEl.textContent = p.answer || '';

      item.appendChild(btn);
      item.appendChild(ansEl);
      wrapper.appendChild(item);
    });

    // accordion init removed — accordion.js will auto-detect new nodes

    // wire See full FAQ anchor: anchor might be outside the original section
    var anchor = preview.querySelector('[data-action="open-full-faq"]') || document.querySelector('[data-action="open-full-faq"]');
    if (anchor){
      try { anchor.removeEventListener('click', openFullFaq); } catch(e){}
      anchor.addEventListener('click', function(e){ openFullFaq(e, root); });
    }
  }

  

  function openFullFaq(e, root){
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (!root) root = document.querySelector('.product-details-expandable');
      if (root) activateTab(root, 'faq');
      var target = document.getElementById('product-details-target');
      if (target){ scrollToElement(target); }
    } catch(err){ console.warn(err); }
  }

  // Expose a global helper for inline anchors to open the Shipping & Return tab
  window.shippingAnchor = function(e){
    if (e && e.preventDefault) e.preventDefault();
    try {
      var target = document.getElementById('product-details-target');
      if (!target) return;
      var root = target.closest && target.closest('.product-details-expandable');
      if (!root) root = document.querySelector('.product-details-expandable');
      if (root) activateTab(root, 'shipping');
      scrollToElement(target);
    } catch(err){ console.warn(err); }
    // Return false to support inline `onclick="shippingAnchor()"` preventing default navigation
    return false;
  };

  // Scroll helper that offsets by a sticky header height (if present)
  function getHeaderOffset(){
    try {
      var header = document.querySelector('[data-sticky-header]') || document.querySelector('.site-header') || document.querySelector('header') || document.querySelector('.header');
      if (header && header.offsetHeight) return header.offsetHeight;
    } catch(e){}
    return 0;
  }

  window.triggerShippingEstimate = function(e){
    if (e && e.preventDefault) e.preventDefault();
    try {
      var ship = document.querySelector('.shipping-calculator');
      if (ship) {
        // ensure close button inside calculator will close it
        try {
          var closeBtn = ship.querySelector('.shipping-cal-close');
          if (closeBtn) {
            closeBtn.removeEventListener('click', function(){});
            closeBtn.addEventListener('click', function(ev){
              ev && ev.preventDefault && ev.preventDefault();
              ship.classList.remove('open');
            });
          }
        } catch (err) {}

        // open the shipping calculator as a drawer
        ship.classList.add('open');
      } else {
        console.warn('No .shipping-calculator element found to open');
      }
    } catch (err) {
      console.warn('triggerShippingEstimate error', err);
    }
    // return false so inline `onclick="triggerShippingEstimate(event)"` prevents navigation
    return false;
  }
  
  function scrollToElement(target, extraOffset){
    if (!target) return;
    var headerOffset = (typeof extraOffset === 'number') ? extraOffset : getHeaderOffset();
    var rect = target.getBoundingClientRect();
    var breathing = 50; // small breathing room in pixels
    var top = window.pageYOffset + rect.top - headerOffset - breathing;
    window.scrollTo({ top: top, behavior: 'smooth' });
    setTimeout(function(){ try { target.focus({preventScroll:true}); } catch (err){} }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
