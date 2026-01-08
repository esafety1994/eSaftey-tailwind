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

  function openNavSheet(trigger) {
    if (!sheet || !overlay) return;
    lastFocused = document.activeElement;
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
    if (trigger && typeof trigger.setAttribute === "function")
      trigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("overflow-hidden");
    setTimeout(function () {
      focusFirst(sheet);
    }, 10);
  }

  function closeNavSheet(trigger) {
    if (!sheet || !overlay) return;
    sheet.classList.remove("open");
    // Clear collapsed-root so next open shows default menu
    sheet.classList.remove("collapsed-root");
    // remove any highlighted root items on close
    try {
      var prevActive2 =
        sheet.querySelectorAll &&
        sheet.querySelectorAll(".mega-item-link.root-active");
      if (prevActive2 && prevActive2.length) prevActive2.forEach(function (n) { n.classList.remove('root-active'); });
    } catch (e) {
      /* ignore */
    }
    sheet.setAttribute("aria-hidden", "true");
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    var header = document.createElement("div");
    header.className =
      "p-4 border-b flex items-center justify-between subpanel-header";
    document.body.classList.remove("overflow-hidden");
    if (lastFocused && typeof lastFocused.focus === "function")
      lastFocused.focus();
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
        panel.style.top = "0";
        var finalLeft = level === 1 ? 160 : anchorRect ? anchorRect.right : 160;
        panel.style.left = finalLeft + "px";
        panel.style.width = "360px";
        panel.style.maxWidth = "40%";
        panel.style.height = "100vh";
        panel.style.transform = "translateX(-30px)";
        panel.style.transition = "transform 260ms ease";
        panel.style.pointerEvents = "auto";
        panel.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
        panel.style.zIndex = 2000;

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
        body.style.height = "calc(100vh - 56px)";
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

        // animate in
        requestAnimationFrame(function () {
          panel.style.transform = "translateX(0)";
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
          if (
            !panel.contains(ev.target) &&
            !(menuRoot && menuRoot.contains(ev.target))
          )
            closeSubpanel(panel);
        };
        document.addEventListener("mousedown", outsideHandler);
        panel._outsideHandler = outsideHandler;

        panel.dataset.desktop = "true";
        return panel;
      };

      // Ensure only one panel at this level. If existing panel found, handle toggle or replace.
      var existingAtLevel = document.querySelector(
        ".desktop-subpanel.panel-level-" + level
      );

      // If opening level-1, close any level-2 panels first
      if (level === 1) {
        var level2 = document.querySelectorAll(
          ".desktop-subpanel.panel-level-2"
        );
        if (level2 && level2.length)
          level2.forEach(function (p) {
            closeSubpanel(p);
          });
      }

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
          if (sheet) sheet.classList.remove("collapsed-root");
          return existingAtLevel;
        }

        // replace: wait for close animation then create
        var onClose = function () {
          try {
            existingAtLevel.removeEventListener("transitionend", onClose);
          } catch (e) {}
          buildPanel();
        };
        try {
          existingAtLevel.addEventListener("transitionend", onClose);
        } catch (e) {}
        closeSubpanel(existingAtLevel);
        return null;
      }

      // no existing -> create immediately
      return buildPanel();
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
    panel.style.top = 0;
    panel.style.left = 0;
    panel.style.width = "100%";
    panel.style.height = "100vh";
    panel.style.background = "inherit";
    panel.style.pointerEvents = "auto";
    panel.style.transform = "translateX(100%)";
    panel.style.transition = "transform 260ms ease";
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

  function closeSubpanel(panel) {
    if (!panel) return;
    if (panel.dataset && panel.dataset.desktop === "true") {
      // desktop: animate closed then remove and cleanup outside click handler
      if (panel._outsideHandler)
        document.removeEventListener("mousedown", panel._outsideHandler);
      // animate back to closed offset and remove after transition
      try {
        panel.style.transform = "translateX(-30px)";
      } catch (e) {}
      var onEnd = function () {
        try {
          panel.removeEventListener("transitionend", onEnd);
        } catch (e) {}
            if (panel.parentElement) {
              // clear any root-active on the source link for this panel
              var src = panel.dataset && panel.dataset.srcIdx ? panel.dataset.srcIdx : null;
              if (src) {
                var links = document.querySelectorAll('.mega-item-link[data-index="' + src + '"]');
                if (links && links.length) links.forEach(function (ln) { ln.classList.remove('root-active'); });
              }
            }
            if (panel.parentElement) panel.parentElement.removeChild(panel);
      };
      try {
        panel.addEventListener("transitionend", onEnd);
      } catch (e) {
        setTimeout(function () {
          if (panel.parentElement) panel.parentElement.removeChild(panel);
        }, 300);
      }
      return;
    }

    panel.style.transform = "translateX(100%)";
    panel.addEventListener("transitionend", function onEnd() {
      panel.removeEventListener("transitionend", onEnd);
      var container = panel.parentElement;
      if (panel.parentElement) panel.parentElement.removeChild(panel);
      // remove container if empty
      if (container && container.children.length === 0) container.remove();
    });
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
      try {
        console.debug(
          "[navigation] click idx=",
          idx,
          "hasChildrenAttr=",
          hasChildrenAttr,
          "panelEl=",
          !!panelEl
        );
      } catch (e) {}
      if (!hasChildren) return;
      e.preventDefault();
      e.stopPropagation();
      var title = link.getAttribute("data-title") || link.textContent.trim();
      // Determine if this is a top-level root menu item (not inside a sub-panel)
      var isTopLevelClick = !(
        link &&
        link.closest &&
        link.closest(".mega-panel")
      );
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
      if (!panelEl)
        console.debug(
          "[navigation] no source panel found for",
          idx,
          "inside",
          menuRoot
        );
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
