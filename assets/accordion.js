;(function(){
  function initAccordion(root){
    if (!root) root = document;
    var els = root.querySelectorAll('.sidebar-faq-q');
    els.forEach(function(el){
      if (el.__esafetyAccordionAttached) return;
      el.__esafetyAccordionAttached = true;

      // click toggler
      el.addEventListener('click', function(e){
        var container = el.closest('.sidebar-faq-qa');
        if (!container) return;
        var answer = container.querySelector('.sidebar-faq-a');
        var isOpen = container.classList.contains('open') || el.getAttribute('aria-expanded') === 'true';
        var openIcon = el.querySelector('.open-qa-icon');
        var closeIcon = el.querySelector('.close-qa-icon');
        var textIcon = el.querySelector('.sidebar-faq-icon');
        if (isOpen){
          container.classList.remove('open');
          if (answer) answer.hidden = true;
          el.setAttribute('aria-expanded','false');
          if (openIcon) openIcon.style.display = '';
          if (closeIcon) closeIcon.style.display = 'none';
          if (textIcon) {
            // don't replace SVG content — only change text when no SVG present
            try {
              if (!(textIcon.querySelector && textIcon.querySelector('svg'))) textIcon.textContent = '+';
            } catch(e){}
          }
        } else {
          container.classList.add('open');
          if (answer) answer.hidden = false;
          el.setAttribute('aria-expanded','true');
          if (openIcon) openIcon.style.display = 'none';
          if (closeIcon) closeIcon.style.display = '';
          if (textIcon) {
            try {
              if (!(textIcon.querySelector && textIcon.querySelector('svg'))) textIcon.textContent = '-';
            } catch(e){}
          }
        }
      });

      // ensure aria
      if (!el.hasAttribute('aria-expanded')) el.setAttribute('aria-expanded','false');

      // set initial state of icons/answer based on container class or aria
      try {
          var containerInit = el.closest('.sidebar-faq-qa');
          if (containerInit){
            var ans = containerInit.querySelector('.sidebar-faq-a');
            var openI = el.querySelector('.open-qa-icon');
            var closeI = el.querySelector('.close-qa-icon');
            var textI = el.querySelector('.sidebar-faq-icon');
            var opened = containerInit.classList.contains('open') || el.getAttribute('aria-expanded') === 'true';
            if (ans) ans.hidden = !opened;
            if (openI) openI.style.display = opened ? 'none' : '';
            if (closeI) closeI.style.display = opened ? '' : 'none';
            if (textI) {
              try {
                if (!(textI.querySelector && textI.querySelector('svg'))) textI.textContent = opened ? '-' : '+';
              } catch(e){}
            }
          }
      } catch(e){ /* ignore */ }
    });
  }

  window.esafetyAccordionInit = function(root){ try { initAccordion(root); } catch(e){ console.warn(e); } };
  window.toggleFaqOpen = function(btn){ try { if (!btn) return; if (typeof btn === 'string') btn = document.querySelector(btn); var container = btn.closest('.sidebar-faq-qa'); if (!container) return; var q = container.querySelector('.sidebar-faq-q'); if (q) q.click(); } catch(e){} };

  // initialize now
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ window.esafetyAccordionInit(document); }); else window.esafetyAccordionInit(document);

  // Observe DOM for dynamically added FAQ items (e.g., built by product-details.js)
  try {
    var observer = new MutationObserver(function(mutations){
      var needsInit = false;
      mutations.forEach(function(m){
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(function(node){
            if (!(node instanceof Element)) return;
            if (node.matches && node.matches('.sidebar-faq-q') ) needsInit = true;
            if (node.querySelector && node.querySelector('.sidebar-faq-q')) needsInit = true;
          });
        }
      });
      if (needsInit) window.esafetyAccordionInit(document);
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch(e){ /* ignore */ }
})();
