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
  // Sheet toggle and mega-menu accordion are handled in assets/navigation.js
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
