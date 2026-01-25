/*
 * Navigation / Sheet + Subpanel controller
 * - Handles opening/closing the left sheet (mobile) and desktop subpanels
 * - Positions panels relative to the header or site content on large screens
 * - Keeps focus management and accessibility attributes
 *
 * Production: debug logging removed and transitions are handled gracefully.
 */
document.addEventListener("DOMContentLoaded", function () {
  // Elements
  var sheet = document.getElementById("site-sheet");
  var overlay = document.getElementById("sheet-overlay");
  var closeBtn = document.getElementById("sheet-close");
  var lastFocused = null;

  function focusFirst(container) {
    if (!container) return;
    var focusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  }

  function setRootActive(link) {
    try {
      var prev = document.querySelectorAll('.mega-item-link.root-active');
      if (prev && prev.length) prev.forEach(function (n) { n.classList.remove('root-active'); });
      if (link && link.classList) link.classList.add('root-active');
    } catch (e) { /* ignore */ }
  }

  // Small gap between header and panel to avoid touching header visually (panels)
  var PANEL_TOP_GAP = 0;

  // Compute the top offset (viewport pixels) for panels/sheet based on header/main/source
  // useGap: when true add a small visual gap (for panels); when false return exact header bottom (for sheet)
  function getTopOffset(sourceLink, useGap) {
    if (typeof useGap === 'undefined') useGap = true;
    try {
      var isDesktop = window.matchMedia('(min-width:1024px)').matches;
      if (!isDesktop) return 0;
      var gap = useGap ? PANEL_TOP_GAP : 0;
      // Prefer sticky header bottom when present
      var hdr = document.getElementById('site-header');
        if (hdr) {
          try {
            var hdrRect = hdr.getBoundingClientRect();
            var hdrBottom = Math.round(hdrRect.bottom || 0);
            // If rect.bottom is 0 (sometimes happens if header is visually offscreen or CSS affects measurement),
            // compute bottom from top + offsetHeight as a fallback.
            if (!hdrBottom || hdrBottom <= 1) {
              var hdrHeight = hdr.offsetHeight || hdrRect.height || 0;
              hdrBottom = Math.round((hdrRect.top || 0) + hdrHeight);
            }
            return Math.max(0, hdrBottom + gap);
          } catch (e) {
            /* ignore */
          }
      }
      // Fallback to #main top in viewport
      var mainEl = document.getElementById('main');
      if (mainEl) {
        var mainRect = mainEl.getBoundingClientRect();
        return Math.max(0, Math.floor(mainRect.top) + gap);
      }
      // Last resort: anchor to source link top
      if (sourceLink && typeof sourceLink.getBoundingClientRect === 'function') {
        var srcRect = sourceLink.getBoundingClientRect();
        return Math.max(0, Math.floor(srcRect.top) + gap);
      }
    } catch (e) {
      /* ignore */
    }
    return useGap ? PANEL_TOP_GAP : 0;
  }

  function openNavSheet(trigger) {
    if (!sheet || !overlay) return;
    lastFocused = document.activeElement;
    try {
      var content = sheet.querySelector('.sheet-content');
      var isDesktop = window.matchMedia('(min-width:1024px)').matches;
      if (!content) {
        // nothing to do
      } else if (!isDesktop) {
        // Clear any inline positioning on small screens
        content.style.marginTop = '';
        sheet.style.top = '';
        sheet.style.height = '';
      } else if (trigger && typeof trigger.getBoundingClientRect === 'function') {
        try {
          var topOffset = getTopOffset(trigger, false);
          // Anchor the sheet itself to the computed top offset so sheet-content starts
          // visually aligned with panels and header (and keep sheet-content margin reset).
          sheet.style.top = topOffset + 'px';
          sheet.style.height = 'calc(100vh - ' + topOffset + 'px)';
          content.style.marginTop = '';
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {}
    sheet.classList.add("open");
    // Ensure any previous 'collapsed-root' state is cleared when opening
    sheet.classList.remove("collapsed-root");
    // clear any previously highlighted root menu items when opening
    try {
      var prevActive =
        sheet.querySelectorAll &&
        sheet.querySelectorAll(".mega-item-link.root-active");
      if (prevActive && prevActive.length)
        prevActive.forEach(function (n) {
          n.classList.remove("root-active");
        });
    } catch (e) {
      /* ignore */
    }
    sheet.setAttribute("aria-hidden", "false");
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
    // lock background scroll when navigation sheet opens
    try { if (window && typeof window.lockScroll === 'function') window.lockScroll(); } catch(e) {}
    if (trigger && typeof trigger.setAttribute === "function")
      trigger.setAttribute("aria-expanded", "true");
    setTimeout(function () {
      focusFirst(sheet);
    }, 10);
  }

  function closeNavSheet(trigger) {
    if (!sheet || !overlay) return;
    // start close animation
    sheet.classList.remove("open");
    // hide overlay immediately so clicks don't get intercepted
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");

    // After the sheet transition finishes, clear inline top/height, restore body scroll and focus
    try {
      var content = sheet.querySelector('.sheet-content');
      var cleared = false;
      var onTransEnd = function (ev) {
        if (ev && ev.propertyName && ev.propertyName.indexOf('transform') === -1) return;
        if (cleared) return;
        cleared = true;
        try {
          if (content) content.style.marginTop = '';
        } catch (e) {}
        try {
          sheet.style.top = '';
          sheet.style.height = '';
        } catch (e) {}
        // Clear collapsed-root so next open shows default menu
        try { sheet.classList.remove("collapsed-root"); } catch (e) {}
        // remove any highlighted root items on close
        try {
          var prevActive2 = sheet.querySelectorAll && sheet.querySelectorAll(".mega-item-link.root-active");
          if (prevActive2 && prevActive2.length) prevActive2.forEach(function (n) { n.classList.remove('root-active'); });
        } catch (e) {}
        try { sheet.setAttribute("aria-hidden", "true"); } catch (e) {}
        try { if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus(); } catch (e) {}
        // restore scroll when nav sheet closed
        try { if (window && typeof window.unlockScroll === 'function') window.unlockScroll(); } catch(e) {}
        try { content.removeEventListener('transitionend', onTransEnd); } catch (e) {}
      };
      if (content) {
        content.addEventListener('transitionend', onTransEnd);
        // fallback: ensure cleanup even if transitionend doesn't fire
        setTimeout(onTransEnd, 600);
      } else {
        // no content element, cleanup immediately
        onTransEnd();
      }
    } catch (e) {
      // fallback immediate cleanup
      try { sheet.style.top = ''; sheet.style.height = ''; } catch (e) {}
      try { sheet.classList.remove("collapsed-root"); } catch (e) {}
      try { if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus(); } catch (e) {}
    }
  }

  // Direct binding if trigger exists at load
  var trigger = document.getElementById("shop-trigger");
  if (trigger) {
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      openNavSheet(trigger);
    });
    trigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        openNavSheet(trigger);
      }
    });
  }

  // Delegated click - works if trigger is rendered later
  document.addEventListener("click", function (e) {
    var trg = e.target.closest ? e.target.closest("#shop-trigger") : null;
    if (trg) {
      e.preventDefault();
      openNavSheet(trg);
    }
  });

  // Subpanel handling: open a nested panel inside the sheet showing children
  function createSubpanel(title, url, innerHtml, trigger, sourceLink) {
    if (!sheet) return null;
    // preserve prior collapsed state so deeper panel opens don't toggle it
    var priorCollapsed = sheet && sheet.classList && sheet.classList.contains('collapsed-root');
    var isDesktop =
      sourceLink && window.matchMedia("(min-width:1024px)").matches;

    if (isDesktop) {
      // Desktop: only two levels supported (1 = root panel, 2 = child panel).
      var menuRoot =
        sourceLink && sourceLink.closest
          ? sourceLink.closest(".mega-menu")
          : null;

      // Determine level by whether the source link is inside an existing desktop panel
      var level =
        sourceLink &&
        sourceLink.closest &&
        sourceLink.closest(".desktop-subpanel")
          ? 2
          : 1;

      // helper to build the DOM panel
      var buildPanel = function () {
        // choose anchor for positioning
        var anchorRect = null;
        if (level === 1) {
          anchorRect = null; // first panel fixed from left (160px)
        } else {
          // attach level-2 to the right of the level-1 panel if present
          var lvl1 = document.querySelector(".desktop-subpanel.panel-level-1");
          if (lvl1) anchorRect = lvl1.getBoundingClientRect();
          else if (menuRoot) anchorRect = menuRoot.getBoundingClientRect();
        }

        var panel = document.createElement("div");
        panel.className = "sheet-subpanel desktop-subpanel";
        panel.classList.add("panel-level-" + level);
        panel.setAttribute("role", "dialog");
        panel.style.position = "fixed";
        // Compute a consistent top offset for the panel (header / main / source fallback)
        try {
          var _topOffset = getTopOffset(sourceLink);
          panel.style.top = _topOffset + "px";
          panel.style.height = 'calc(100vh - ' + _topOffset + 'px)';
        } catch (err) {
          panel.style.top = "0";
        }
        var finalLeft = level === 1 ? 160 : anchorRect ? anchorRect.right : 160;
        panel.style.left = finalLeft + "px";
        // start collapsed and grow on open so it appears to expand to the right
        panel.style.width = "0px";
        panel.style.maxWidth = "40%";
        panel.style.height = "100vh";
        panel.style.transform = "translateX(-10px)";
        panel.style.transition = "width 180ms cubic-bezier(.2,.9,.2,1), transform 180ms cubic-bezier(.2,.9,.2,1)";
        panel.style.pointerEvents = "auto";
        panel.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
        panel.style.zIndex = 2000;
        panel.style.boxSizing = "border-box";

        var header = document.createElement("div");
        header.className = "p-4 border-b flex items-center justify-between";
        header.innerHTML =
          '<div class="flex-1 px-3"><strong class="block capitalize">' +
          (title || "") +
          '</strong></div><a class="view-all font-semibold underline capitalize" href="' +
          (url || "#") +
          '">View all</a>';

        var body = document.createElement("div");
        body.className = "subpanel-body overflow-y-auto h-full";
        try {
          var _bodyTop = (typeof _topOffset !== 'undefined' && _topOffset > 0) ? _topOffset : 56;
          body.style.height = 'calc(100vh - ' + _bodyTop + 'px)';
        } catch (err) {
          body.style.height = "calc(100vh - 56px)";
        }
        body.innerHTML = innerHtml || "";

        panel.appendChild(header);
        panel.appendChild(body);
        document.body.appendChild(panel);

        // store identifiers
        try {
          panel.dataset.srcIdx =
            sourceLink && sourceLink.getAttribute
              ? sourceLink.getAttribute("data-index") || ""
              : "";
        } catch (e) {}
        panel.dataset.level = String(level);

        // animate in: expand width and slide to final position
        requestAnimationFrame(function () {
          try {
            var desired = 360;
            var maxAllowed = Math.floor(window.innerWidth * 0.4);
            var targetWidth = Math.min(desired, Math.max(220, maxAllowed));
            panel.style.width = targetWidth + "px";
            panel.style.transform = "translateX(0)";
          } catch (e) {
            panel.style.transform = "translateX(0)";
            panel.style.width = "360px";
          }
        });

        // close button
        var close = panel.querySelector(".subpanel-close");
        if (close)
          close.addEventListener("click", function (ev) {
            ev.preventDefault();
            closeSubpanel(panel);
          });

        // outside click
        var outsideHandler = function (ev) {
          try {
            // If the click is inside this panel, ignore
            if (panel.contains(ev.target)) return;
            // If the click is inside the originating mega-menu (source markup), ignore
            if (menuRoot && menuRoot.contains(ev.target)) return;
            // If the click is inside any other desktop subpanel (e.g., level-2), treat it as inside
            if (ev.target && ev.target.closest && ev.target.closest('.desktop-subpanel')) return;
            // Otherwise, close this panel
            closeSubpanel(panel);
          } catch (err) {
            try { closeSubpanel(panel); } catch (e) {}
          }
        };
        document.addEventListener("mousedown", outsideHandler);
        panel._outsideHandler = outsideHandler;
        panel.dataset.desktop = "true";
        return panel;
      };

      // If opening level-1, ensure any level-2 panels are closed first and wait for them.
      if (level === 1) {
        // If any desktop panels exist (level-1 or level-2), immediately hide and remove them
        // so the new root's first panel can slide in cleanly.
        var anyPanels = document.querySelectorAll('.desktop-subpanel');
        if (anyPanels && anyPanels.length) {
          anyPanels.forEach(function (p) {
            try {
              // stop ongoing transitions and hide immediately
              p.style.transition = '';
              p.style.display = 'none';
              if (p._outsideHandler) document.removeEventListener('mousedown', p._outsideHandler);
              if (p.parentElement) p.parentElement.removeChild(p);
            } catch (e) {}
          });
        }
        // continue to build the requested level-1 panel immediately
      }

      // Ensure only one panel at this level. If existing panel found, handle toggle or replace.
      var existingAtLevel = document.querySelector(
        ".desktop-subpanel.panel-level-" + level
      );

      if (existingAtLevel) {
        var srcIdx =
          sourceLink && sourceLink.getAttribute
            ? sourceLink.getAttribute("data-index")
            : "";
        // toggle: if same source, close and expand sheet
        if (
          existingAtLevel.dataset &&
          existingAtLevel.dataset.srcIdx === srcIdx
        ) {
          closeSubpanel(existingAtLevel);
          try {
            if (menuRoot) {
              var active = menuRoot.querySelector(
                ".mega-item-link.root-active"
              );
              if (active) active.classList.remove("root-active");
            }
          } catch (e) {}
          // Only un-collapse the sheet when a level-1 panel is toggled.
          try { if (sheet && level === 1) sheet.classList.remove("collapsed-root"); } catch (e) {}
          // restore prior collapsed state for deeper panels
          try { if (level === 2 && priorCollapsed) sheet.classList.add('collapsed-root'); } catch (e) {}
          return existingAtLevel;
        }

        // replace: wait for close animation then create (use callback)
        var onClose = function () {
          buildPanel();
        };
        closeSubpanel(existingAtLevel, onClose);
        // ensure prior collapsed state remains when replacing
        try { if (level === 2 && priorCollapsed) sheet.classList.add('collapsed-root'); } catch (e) {}
        return null;
      }

      // no existing -> create immediately
      var created = buildPanel();
      try { if (level === 2 && priorCollapsed) sheet.classList.add('collapsed-root'); } catch (e) {}
      return created;
    }

    // Mobile / sheet behavior (unchanged)
    // container relative to sheet so panels stack
    var container = sheet.querySelector(".subpanel-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "subpanel-container";
      container.style.position = "absolute";
      container.style.background = "#f5f4f4";
      container.style.top = 0;
      container.style.left = 0;
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.pointerEvents = "none";
      var sheetContent = sheet.querySelector(".sheet-content");
      if (sheetContent) sheetContent.appendChild(container);
    }

    var panel = document.createElement("div");
    panel.className = "sheet-subpanel";
    panel.setAttribute("role", "dialog");
    panel.style.position = "absolute";
    // For mobile panels, leave top at 0 (no lg offset). If header is sticky on large screens
    // the desktop logic will handle positioning.
    panel.style.top = 0;
    panel.style.left = 0;
    panel.style.width = "100%";
    panel.style.height = "100vh";
    panel.style.background = "inherit";
    panel.style.pointerEvents = "auto";
    panel.style.transform = "translateX(100%)";
    panel.style.transition = "transform 180ms cubic-bezier(.2,.9,.2,1)";
    panel.style.zIndex = 10;

    var header = document.createElement("div");
    header.className = "p-4 border-b flex items-center justify-between";
    header.innerHTML =
      '<button class="subpanel-back p-2">\u2190</button><div class="flex-1 px-3"><strong class="block capitalize">' +
      (title || "") +
      '</strong></div><a class="view-all font-semibold underline capitalize" href="' +
      (url || "#") +
      '">View all</a>';

    var body = document.createElement("div");
    body.className = "subpanel-body overflow-y-auto h-full";
    body.innerHTML = innerHtml || "";

    panel.appendChild(header);
    panel.appendChild(body);
    container.appendChild(panel);

    // animate in
    requestAnimationFrame(function () {
      panel.style.transform = "translateX(0)";
    });

    // back button
    var back = panel.querySelector(".subpanel-back");
    if (back) {
      back.addEventListener("click", function (ev) {
        ev.preventDefault();
        closeSubpanel(panel);
      });
    }

    return panel;
  }

  // Close subpanel (desktop or mobile). Accepts optional callback executed after removal.
  function closeSubpanel(panel, callback) {
    if (!panel) {
      try { if (typeof callback === 'function') callback(); } catch (e) {}
      return;
    }
    // Desktop panel: collapse width and slide left, then remove
    if (panel.dataset && panel.dataset.desktop === "true") {
      if (panel._outsideHandler)
        document.removeEventListener("mousedown", panel._outsideHandler);
      try {
        // Ensure only width/transform animate. Make opacity changes instant.
        panel.style.transition = "width 180ms cubic-bezier(.2,.9,.2,1), transform 180ms cubic-bezier(.2,.9,.2,1), opacity 0ms linear 0ms";
        panel.style.opacity = "0"; // set instantly
        panel.style.width = "0px";
        panel.style.transform = "translateX(-30px)";
      } catch (e) {}
      var onEnd = function () {
        try {
          panel.removeEventListener("transitionend", onEnd);
        } catch (e) {}
        if (panel.parentElement) {
          var src = panel.dataset && panel.dataset.srcIdx ? panel.dataset.srcIdx : null;
          if (src) {
            var links = document.querySelectorAll('.mega-item-link[data-index="' + src + '"]');
            if (links && links.length) links.forEach(function (ln) { ln.classList.remove('root-active'); });
          }
          panel.parentElement.removeChild(panel);
        }
        try { if (typeof callback === 'function') callback(); } catch (e) {}
      };
      try {
        panel.addEventListener("transitionend", onEnd);
      } catch (e) {
        setTimeout(function () {
          if (panel.parentElement) panel.parentElement.removeChild(panel);
          try { if (typeof callback === 'function') callback(); } catch (e) {}
        }, 300);
      }
      return;
    }

    // Mobile sheet panel: slide out right then remove
    try {
      // Keep mobile close transition only on transform; make opacity instant
      panel.style.transition = "transform 180ms cubic-bezier(.2,.9,.2,1), opacity 0ms linear 0ms";
      panel.style.opacity = "0";
      panel.style.transform = "translateX(100%)";
    } catch (e) {}
    var onEndMobile = function () {
      try { panel.removeEventListener("transitionend", onEndMobile); } catch (e) {}
      var container = panel.parentElement;
      if (panel.parentElement) panel.parentElement.removeChild(panel);
      if (container && container.children.length === 0) container.remove();
      try { if (typeof callback === 'function') callback(); } catch (e) {}
    };
    try {
      panel.addEventListener("transitionend", onEndMobile);
    } catch (e) {
      setTimeout(onEndMobile, 300);
    }
  }

  

  // Delegate clicks on mega-item-link to open subpanel if item has children
  // Use capture phase so we can prevent navigation before other handlers
  // Prevent navigation on left-button mousedown for links that have subpanels
  document.addEventListener(
    "mousedown",
    function (e) {
      try {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
          return;
        var link = e.target.closest && e.target.closest(".mega-item-link");
        if (!link) return;
        var idx = link.getAttribute("data-index");
        var menuRoot = link.closest && link.closest(".mega-menu");
        var panelEl = null;
        if (menuRoot) panelEl = menuRoot.querySelector("#mega-" + idx);
        if (!panelEl) panelEl = document.getElementById("mega-" + idx);
        if (panelEl) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {
        /* ignore */
      }
    },
    true
  );

  document.addEventListener(
    "click",
    function (e) {
      var link = e.target.closest && e.target.closest(".mega-item-link");
      if (!link) return;
      // Detect whether this link should open a subpanel. Prefer explicit attribute but
      // fall back to presence of a source panel element (#mega-<idx>).
      var hasChildrenAttr = link.getAttribute("data-has-children");
      var idx = link.getAttribute("data-index");
      var menuRoot = link.closest && link.closest(".mega-menu");
      var panelEl = null;
      if (menuRoot) panelEl = menuRoot.querySelector("#mega-" + idx);
      if (!panelEl) panelEl = document.getElementById("mega-" + idx);
      var hasChildren = hasChildrenAttr === "true" || !!panelEl;
      // debug log to help diagnose unexpected navigation
      // (production) removed debug logging
      if (!hasChildren) return;
      e.preventDefault();
      e.stopPropagation();
      var title = link.getAttribute("data-title") || link.textContent.trim();
      // Determine if this is a top-level root menu item (not inside a sub-panel).
      // Only treat clicks that originate from the original `.mega-menu` markup
      // as top-level; ignore clicks from any created `.desktop-subpanel`.
      var insideMegaPanel = link && link.closest && link.closest('.mega-panel');
      var insideAnySubpanel = false;
      try { insideAnySubpanel = !!(link && link.closest && link.closest('.desktop-subpanel')); } catch (err) { insideAnySubpanel = false; }
      // Only consider mega-menu instances that are not themselves inside a created
      // desktop subpanel (dynamic panels append .mega-menu markup too). This
      // ensures clicks from panel content don't toggle collapsed-root.
      var menuAncestor = link && link.closest && link.closest('.mega-menu');
      var originatesInMegaMenu = !!menuAncestor && !(menuAncestor.closest && menuAncestor.closest('.desktop-subpanel'));
      var isTopLevelClick = originatesInMegaMenu && !(insideMegaPanel || insideAnySubpanel);
      if (isTopLevelClick && window.matchMedia("(min-width:1024px)").matches) {
        var srcIdx = link.getAttribute("data-index");
        var menuRootScope = link.closest && link.closest(".mega-menu");
        var prevActive = menuRootScope
          ? menuRootScope.querySelector(".mega-item-link.root-active")
          : null;

        if (sheet && sheet.classList.contains("collapsed-root")) {
          // If collapsed and the same menu is clicked -> close its desktop panel and expand sheet
          if (prevActive === link) {
            try {
              var allPanels = document.querySelectorAll('.desktop-subpanel');
              if (allPanels && allPanels.length) {
                for (var pi = 0; pi < allPanels.length; pi++) {
                  var pp = allPanels[pi];
                  if (pp && pp.dataset && pp.dataset.srcIdx === srcIdx) closeSubpanel(pp);
                }
              }
            } catch (e) {}
            try { setRootActive(null); } catch (e) {}
            sheet.classList.remove("collapsed-root");
            return; // don't open subpanel now, just expand
          }
          // If collapsed and a different menu clicked -> close previous panel, highlight new one and continue to open its subpanel
          if (prevActive && prevActive !== link) {
            try {
              var prevIdx = prevActive.getAttribute && prevActive.getAttribute('data-index');
              var panels2 = document.querySelectorAll('.desktop-subpanel');
              if (panels2 && panels2.length) {
                for (var pj = 0; pj < panels2.length; pj++) {
                  var pp2 = panels2[pj];
                  if (pp2 && pp2.dataset && pp2.dataset.srcIdx === prevIdx) closeSubpanel(pp2);
                }
              }
            } catch (e) {}
            try { prevActive.classList.remove('root-active'); } catch (e) {}
          }
          setRootActive(link);
        } else {
          // Not collapsed: collapse to icons-only when clicking a root
          if (sheet) sheet.classList.add("collapsed-root");
          // mark active
          if (menuRootScope) {
            var sibs = menuRootScope.querySelectorAll('.mega-item-link.root-active');
            sibs.forEach(function (s) {
              if (s !== link) s.classList.remove('root-active');
            });
          }
          setRootActive(link);
        }
      }
      // Prefer the panel inside the same mega-menu instance as the clicked link
      var menuRoot = link.closest && link.closest(".mega-menu");
      var panelEl = null;
      if (menuRoot) panelEl = menuRoot.querySelector("#mega-" + idx);
      if (!panelEl) panelEl = document.getElementById("mega-" + idx);
      if (!panelEl) {
        // no source panel found for this index
      }
      var inner = panelEl ? panelEl.innerHTML : "";
      var shopTrig = document.getElementById("shop-trigger");
      // prefer the non-navigating data-href if present (we moved real URLs into data-href for parents)
      var linkHref =
        link.getAttribute("data-href") || link.getAttribute("href");
      // On large screens open next to parent, otherwise open sheet (mobile)
      if (window.matchMedia("(min-width:1024px)").matches) {
        createSubpanel(title, linkHref, inner, null, link);
      } else {
        openNavSheet(shopTrig);
        createSubpanel(title, linkHref, inner, shopTrig, link);
      }
    },
    true
  );

  // Close handlers
  if (closeBtn)
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeNavSheet(trigger);
    });
  if (overlay)
    overlay.addEventListener("click", function () {
      closeNavSheet(trigger);
    });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNavSheet(trigger);
  });
});

// Expose for debugging or other scripts
window.navigation = window.navigation || {};
window.navigation.open = function () {
  var t = document.getElementById("shop-trigger");
  return t && t.click();
};
