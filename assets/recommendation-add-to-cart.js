(function () {
  function init() {
    document.addEventListener(
      "submit",
      function (e) {
        var form = e.target;
        if (!form || !form.classList || !form.classList.contains("esafety-ajax-add"))
          return;
        e.preventDefault();

        var primaryButton = form.querySelector("button.primary-cart-button") || form.querySelector('button[type="submit"]');
        var _origButtonHtml = primaryButton ? primaryButton.innerHTML : null;
        var _origButtonWidth = primaryButton ? primaryButton.style.width : null;

        var setLoading = function (loading) {
          if (!primaryButton) return;
          if (loading) {
            try {
              var rect = primaryButton.getBoundingClientRect();
              primaryButton.style.boxSizing = "border-box";
              primaryButton.style.width = rect.width + "px";
            } catch (e) {}
            primaryButton.innerHTML =
              '<svg class="animate-spin inline-block w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>';
            primaryButton.disabled = true;
            primaryButton.setAttribute("aria-busy", "true");
          } else {
            primaryButton.innerHTML = _origButtonHtml || "";
            if (_origButtonWidth) primaryButton.style.width = _origButtonWidth;
            else primaryButton.style.width = "";
            primaryButton.disabled = false;
            primaryButton.removeAttribute("aria-busy");
          }
        };

        setLoading(true);

        var idInput = form.querySelector('input[name="id"]');
        var qtyInput = form.querySelector('input[name="quantity"]');
        var id = idInput ? idInput.value : null;
        var qty = qtyInput && qtyInput.value ? parseInt(qtyInput.value, 10) : 1;

        var formData = {
          items: [
            {
              id: id,
              quantity: qty,
              properties: {},
            },
          ],
          sections: "esaftey-cart-drawer,cart-count",
        };

        var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || window.Shopify?.routes?.root || "/";

        fetch(root + "cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then(function (res) {
            if (!res.ok) throw res;
            return res.json();
          })
          .then(function (data) {
            try {
              document.documentElement.dispatchEvent(
                new CustomEvent("cart:render", { detail: data, bubbles: true })
              );
            } catch (e) {}
            setLoading(false);
          })
          .catch(function (err) {
            console.warn("Add to cart failed", err);
            setLoading(false);
          });
      },
      false
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
