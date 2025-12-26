(function(){
  // Minimal module: attach direct click handlers to any .show-full-desc button
  function onClickScroll(e) {
    var btn = e.currentTarget;
    console.log('show-full-desc clicked', btn);
    var controls = btn.getAttribute('aria-controls');
    var target = controls ? document.getElementById(controls) : document.getElementById('product-details-target');
    console.log('scroll target:', target);
    if (!target) return;

    // toggle aria-expanded and arrow rotation for this button
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    var svg = btn.querySelector('svg');
    if (svg) svg.classList.toggle('rotate-180');

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function(){ try { target.focus({preventScroll:true}); } catch (e) {} }, 300);
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
        // ensure description preview is initialized when showing description
        if (t === 'description') setupDescPreview(root);
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

  function setupDescPreview(root) {
    if (!root) return;
    var preview = root.querySelector('.desc-preview');
    var btn = root.querySelector('.desc-toggle');
    if (!preview || !btn) return;

    // remove previous listener to avoid duplicates
    btn.removeEventListener('click', toggleDesc);
    btn.addEventListener('click', toggleDesc);

    // reset to measure full height
    preview.style.maxHeight = '';
    var fullH = preview.scrollHeight;
    var collapsedH = 360;
    var fade = preview.querySelector('.fade');

    if (fullH <= collapsedH) {
      // content small enough — hide toggle and fade
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
    var root = btn.closest('.product-details-expandable');
    if (!root) return;
    var preview = root.querySelector('.desc-preview');
    var fade = preview && preview.querySelector('.fade');
    if (!preview) return;
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      // collapse
      preview.style.maxHeight = '160px';
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
