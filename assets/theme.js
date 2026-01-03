document.addEventListener("DOMContentLoaded", function () {
  var header = document.getElementById("site-header");
  var spacer = document.getElementById("header-spacer");
  if (!header || !spacer) return;

  function updateSticky() {
    var fold = 250;
    var shouldBeSticky = window.scrollY > fold;

    if (shouldBeSticky && !header.classList.contains("is-sticky")) {
      // set spacer height to preserve layout
      spacer.style.display = "block";
      spacer.style.height = header.offsetHeight + "px";

      header.classList.add("is-sticky");
      header.classList.add(
        "fixed",
        "top-0",
        "left-0",
        "right-0",
        "z-50",
        "shadow-md"
      );
      header.setAttribute("aria-hidden", "false");
    } else if (!shouldBeSticky && header.classList.contains("is-sticky")) {
      spacer.style.display = "none";
      spacer.style.height = "";

      header.classList.remove("is-sticky");
      header.classList.remove(
        "fixed",
        "top-0",
        "left-0",
        "right-0",
        "z-50",
        "shadow-md"
      );
    }
  }

  // run on load and scroll/resize
  document.addEventListener("DOMContentLoaded", updateSticky);
  window.addEventListener("load", updateSticky);
  window.addEventListener("scroll", updateSticky, { passive: true });
  window.addEventListener("resize", updateSticky);
});

document.addEventListener("DOMContentLoaded", function () {
  // Sheet toggle (Shop trigger)
  var trigger = document.getElementById("shop-trigger");
  var sheet = document.getElementById("site-sheet");
  var overlay = document.getElementById("sheet-overlay");
  var closeBtn = document.getElementById("sheet-close");
  var lastFocused = null;

  function openSheet() {
    if (!sheet || !overlay) return;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
    // store last focused element to restore focus on close
    lastFocused = document.activeElement;
    // focus first focusable inside sheet
    setTimeout(function () {
      var focusable = sheet.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) focusable.focus();
    }, 10);
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("overflow-hidden");
  }

  function closeSheet() {
    if (!sheet || !overlay) return;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("overflow-hidden");
    if (lastFocused) lastFocused.focus();
  }

  if (trigger)
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      openSheet();
    });
  if (closeBtn)
    closeBtn.addEventListener("click", function () {
      closeSheet();
    });
  if (overlay)
    overlay.addEventListener("click", function () {
      closeSheet();
    });

  // close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSheet();
  });

  // Cart functionality moved to assets/cart.js

  // Accordion behavior for mega-menu
  document.querySelectorAll(".mega-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-target");
      var target = document.getElementById(targetId);
      if (!target) return;

      var isExpanded = btn.getAttribute("aria-expanded") === "true";

      // Scope: siblings only
      var scope = btn.closest("ul") || document;

      // helper to close panel
      function closePanel(p, toggleBtn) {
        if (!p) return;
        // ensure fixed height before collapsing for smooth animation
        p.style.height = p.scrollHeight + "px";
        // force reflow
        p.offsetHeight;
        p.style.height = "0px";
        p.classList.remove("open");
        if (toggleBtn) {
          toggleBtn.setAttribute("aria-expanded", "false");
          toggleBtn.querySelector("svg")?.classList.remove("rotate-180");
        }
      }

      // helper to open panel
      function openPanel(p, toggleBtn) {
        if (!p) return;
        // set to exact height to animate
        p.style.height = p.scrollHeight + "px";
        p.classList.add("open");
        if (toggleBtn) {
          toggleBtn.setAttribute("aria-expanded", "true");
          toggleBtn.querySelector("svg")?.classList.add("rotate-180");
        }
        // when transition ends, clear explicit height so content can grow/shrink naturally
        var onTransitionEnd = function (e) {
          if (e.propertyName === "height") {
            p.style.height = "auto";
            p.removeEventListener("transitionend", onTransitionEnd);
          }
        };
        p.addEventListener("transitionend", onTransitionEnd);
      }

      // Close sibling panels only
      scope
        .querySelectorAll('.mega-toggle[aria-expanded="true"]')
        .forEach(function (openBtn) {
          if (openBtn === btn) return;
          var openPanel = document.getElementById(
            openBtn.getAttribute("data-target")
          );
          closePanel(openPanel, openBtn);
        });

      if (isExpanded) {
        closePanel(target, btn);
      } else {
        openPanel(target, btn);
        // ensure ancestors adjust (open ancestor panels should have height:auto or be updated)
        window.requestAnimationFrame(function () {
          document
            .querySelectorAll('.mega-toggle[aria-expanded="true"]')
            .forEach(function (openBtn) {
              var panel = document.getElementById(
                openBtn.getAttribute("data-target")
              );
              if (panel && panel.style.height !== "auto")
                panel.style.height = panel.scrollHeight + "px";
            });
        });
      }
    });
  });
});
// Theme JavaScript for eSafety Tailwind Theme

document.addEventListener("DOMContentLoaded", function () {
  // Quantity increment/decrement handlers for `.qty-selector`
  document.addEventListener("click", function (e) {
    const dec = e.target.closest(".qty-decrement");
    const inc = e.target.closest(".qty-increment");

    if (dec || inc) {
      const btn = dec || inc;
      const container = btn.closest(".qty-selector");
      if (!container) return;
      const input = container.querySelector('input[name="quantity"]');
      if (!input) return;
      let val = parseInt(input.value, 10);
      if (isNaN(val)) val = 1;
      if (dec) {
        val = Math.max(1, val - 1);
      } else {
        val = val + 1;
      }
      input.value = String(val);
    }
  });
});
