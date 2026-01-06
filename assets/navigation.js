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

  function openNavSheet(trigger) {
    if (!sheet || !overlay) return;
    lastFocused = document.activeElement;
    sheet.classList.add("open");
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
    sheet.setAttribute("aria-hidden", "true");
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    var header = document.createElement("div");
    header.className = "p-4 border-b flex items-center justify-between subpanel-header";
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
  function createSubpanel(title, url, innerHtml, trigger) {
    if (!sheet) return null;
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
    panel.style.height = "100%";
    panel.style.background = "inherit";
    panel.style.pointerEvents = "auto";
    panel.style.transform = "translateX(100%)";
    panel.style.transition = "transform 260ms ease";
    panel.style.zIndex = 10;

    var header = document.createElement("div");
    header.className = "p-4 border-b flex items-center justify-between";
    header.innerHTML =
      '<button class="subpanel-back p-2">\u2190</button><div class="flex-1 px-3"><strong class="block">' +
      (title || "") +
      '</strong></div><a class="view-all text-sm underline" href="' +
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
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest(".mega-item-link");
    if (!link) return;
    var hasChildren = link.getAttribute("data-has-children");
    if (hasChildren === "true") {
      e.preventDefault();
      var idx = link.getAttribute("data-index");
      var title = link.getAttribute("data-title") || link.textContent.trim();
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
      // ensure sheet is open
      var trg = document.getElementById("shop-trigger");
      openNavSheet(trg);
      createSubpanel(title, link.getAttribute("href"), inner, trg);
    }
  });

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
