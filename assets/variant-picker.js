class VariantPicker extends HTMLElement {
  constructor() {
    super();
  }

  get sectionId() {
    return this.dataset.sectionId;
  }

  connectedCallback() {
    this.variantSelector = this.querySelectorAll('input[type="radio"], select');
    this.handleChange = this.onVariantChange.bind(this);

    // parse variants JSON if provided on the element
    try {
      this.variants = this.dataset.variants ? JSON.parse(this.dataset.variants) : [];
    } catch (e) {
      this.variants = [];
    }

    this.variantSelector.forEach((selector) => {
      selector.addEventListener("change", this.handleChange);
    });
    // also update active label styles immediately when selection changes (only radios)
    this.querySelectorAll('input[type="radio"]').forEach((selector) => {
      selector.addEventListener("change", function () {
        updateActiveOptionStyles();
      });
    });
    // also update visible selected option names
    try {
      updateSelectedOptionNames(this);
    } catch (e) {}
    // update selected option names whenever an option changes
    this.variantSelector.forEach((selector) => {
      selector.addEventListener("change", () => {
        try {
          updateSelectedOptionNames(this);
        } catch (e) {}
      });
    });
  }

  disconnectedCallback() {
    this.variantSelector.forEach((selector) => {
      selector.removeEventListener("change", this.handleChange);
    });
  }
  onVariantChange(event) {
    const input = event.currentTarget;
    // Compute the full selected option values and try to resolve the correct
    // variant id for the current combination. Fall back to the input value
    // if we can't resolve a match.
    let resolvedVariantId = input.value;
    try {
      // collect selected option display values per option fieldset
      const optionFieldsets = this.querySelectorAll('.variant-picker__option');
      const selectedValues = Array.from(optionFieldsets).map((fs) => {
        const sel = fs.querySelector('select');
        if (sel) return (sel.options[sel.selectedIndex]?.text || '').trim();
        const checked = fs.querySelector('input[type="radio"]:checked');
        const candidate = checked || fs.querySelector('input[type="radio"]');
        if (candidate) {
          const lbl = document.querySelector('label[for="' + candidate.id + '"]');
          return lbl ? lbl.textContent.trim() : (candidate.value || '').trim();
        }
        return '';
      });

      if (this.variants && this.variants.length && selectedValues.length) {
        const match = this.variants.find((v) => {
          const vopts = v.options || [v.option1, v.option2, v.option3].filter(Boolean);
          if (!vopts || !vopts.length) return false;
          for (let i = 0; i < selectedValues.length; i++) {
            const sel = (selectedValues[i] || '').toString().trim().toLowerCase();
            const vo = (vopts[i] || '').toString().trim().toLowerCase();
            if (sel !== vo) return false;
          }
          return true;
        });
        if (match && match.id) resolvedVariantId = String(match.id);
      }
    } catch (e) {
      // fallback to input.value
    }

    // Notify other modules immediately about the selected variant so they
    // can update UI optimistically before the AJAX replacement completes.
    try {
      document.dispatchEvent(
        new CustomEvent("product:variant:changing", {
          detail: { variantId: resolvedVariantId },
        }),
      );
    } catch (e) {
      /* ignore */
    }

    const url = `${window.location.pathname}?variant=${resolvedVariantId}&section_id=${this.sectionId}`;
    const target = document.querySelector(".product-container");
    // show loading overlay + fade
    if (target) {
      target.classList.add("is-loading");
      if (!target.querySelector(".product-loading-overlay")) {
        const overlay = document.createElement("div");
        overlay.className = "product-loading-overlay";
        overlay.innerHTML = '<div class="spinner"></div>';
        target.appendChild(overlay);
      }
    }

    fetch(url)
      .then((response) => response.text())
      .then((html) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const newContent = tempDiv.querySelector(".product-container");

        // Selective updates: gallery, price, sku, and the product form's variant id
        try {
          // Update gallery if present
          const newGallery = tempDiv.querySelector("#esProductGlide");
          const galleryTarget = document.getElementById("esProductGlide");
          if (newGallery && galleryTarget) {
            // preserve and update start index attribute if provided
            var newStart = newGallery.getAttribute("data-start-index");
            if (newStart !== null)
              galleryTarget.setAttribute("data-start-index", newStart);
            galleryTarget.innerHTML = newGallery.innerHTML;
            // update thumbnails if present in response
            var newThumbs = tempDiv.querySelector("#esProductThumbs");
            var thumbsTarget = document.getElementById("esProductThumbs");
            if (newThumbs && thumbsTarget)
              thumbsTarget.innerHTML = newThumbs.innerHTML;
            try {
              document.dispatchEvent(
                new CustomEvent("product:content:replaced", {
                  detail: { root: galleryTarget },
                }),
              );
            } catch (e) {}
          }

          // Update price
          const newPrice = tempDiv.querySelector("#product-price");
          const priceTarget = document.getElementById("product-price");
          if (newPrice && priceTarget) {es
            priceTarget.innerHTML = newPrice.innerHTML;
          }

          // Update SKU
          const newSku = tempDiv.querySelector("#product-sku");
          const skuTarget = document.getElementById("product-sku");
          if (newSku && skuTarget) {
            skuTarget.innerHTML = newSku.innerHTML;
          }

          // Update stock badge
          const newStock = tempDiv.querySelector("#product-stock-badge");
          const stockTarget = document.getElementById("product-stock-badge");
          if (newStock && stockTarget) {
            stockTarget.innerHTML = newStock.innerHTML;
          }

          // Update backorder text
          const newBackorder = tempDiv.querySelector("#product-backorder-text");
          const backorderTarget = document.getElementById(
            "product-backorder-text",
          );
          if (newBackorder && backorderTarget) {
            backorderTarget.innerHTML = newBackorder.innerHTML;
          }

          // Update act button (add-to-cart + qty form)
          const newAct = tempDiv.querySelector("#product-act-button");
          const actTarget = document.getElementById("product-act-button");
          if (newAct && actTarget) {
            actTarget.innerHTML = newAct.innerHTML;
          }

          // Update sticky cart block if present in fetched HTML
          const newSticky = tempDiv.querySelector("[data-sticky-cart]");
          const stickyTarget = document.querySelector("[data-sticky-cart]");
          if (newSticky && stickyTarget) {
            stickyTarget.innerHTML = newSticky.innerHTML;
          }

          // Update form hidden variant id (first matching form input)
          const newVariantInput = tempDiv.querySelector(
            'form input[name="id"]',
          );
          const existingVariantInput = document.querySelector(
            'form input[name="id"]',
          );
          if (newVariantInput && existingVariantInput) {
            existingVariantInput.value = newVariantInput.value;
          }
        } catch (err) {
          console.warn("VariantPicker: selective update failed", err);
        }

        // Emit a global replacement event so other modules (sticky cart, swatches)
        // can synchronise with the newly-fetched content. Use the newContent
        // if available (it's the fetched .product-container), otherwise fall
        // back to the existing target in the DOM.
        try {
          document.dispatchEvent(
            new CustomEvent("product:content:replaced", {
              detail: { root: newContent || target },
            }),
          );
        } catch (e) {
          /* ignore */
        }

        // Remove loading overlay after a short delay to allow re-init
        setTimeout(function () {
          if (target) {
            target.classList.remove("is-loading");
            const ov = target.querySelector(".product-loading-overlay");
            if (ov) ov.parentNode.removeChild(ov);
          }
        }, 120);

        const newUrl = new URL(url, window.location.origin);
        newUrl.searchParams.delete("section_id");
        window.history.pushState({}, "", newUrl.toString());
      })
      .catch((error) => {
        console.error("Error fetching variant data:", error);
        if (target) {
          target.classList.remove("is-loading");
          const ov = target.querySelector(".product-loading-overlay");
          if (ov) ov.parentNode.removeChild(ov);
        }
      });
    console.log("Selected Variant ID:", url);
  }
}

customElements.define("variant-picker", VariantPicker);

// Toggle Tailwind classes on labels for checked radio inputs so active option
// visually matches hover styles (uses existing Tailwind classes).
function updateActiveOptionStyles() {
  try {
    document
      .querySelectorAll('.product-container input[type="radio"]')
      .forEach(function (input) {
        var lbl = document.querySelector('label[for="' + input.id + '"]');
        if (!lbl) return;
        // Toggle a high-specificity class to enforce the active border
        if (input.checked) {
          lbl.classList.add("swatch-active");
          lbl.classList.add("scale-110");
          lbl.classList.add("shadow-lg");
        } else {
          lbl.classList.remove("swatch-active");
          lbl.classList.remove("scale-110");
          lbl.classList.remove("shadow-lg");
        }
      });
  } catch (e) {
    /* ignore */
  }
}

function updateSelectedOptionNames(context) {
  // context: either the variant-picker element or document
  const root = context || document;
  try {
    const optionFieldsets = root.querySelectorAll(".variant-picker__option");
    optionFieldsets.forEach(function (fs) {
      const legend = fs.querySelector("legend");
      const display = fs.querySelector(".variant-selected-name");
      if (!display || !legend) return;
      const optionLabel = (legend.textContent || "").trim();
      const optionNameLower = optionLabel.toLowerCase();
      // only show for size or color options
      if (
        !(
          optionNameLower.indexOf("size") !== -1 ||
          optionNameLower.indexOf("colour") !== -1 ||
          optionNameLower.indexOf("color") !== -1
        )
      ) {
        display.textContent = "";
        return;
      }
      // prefer select within this fieldset, otherwise look for radios
      const sel = fs.querySelector("select");
      if (sel) {
        const so = sel.options[sel.selectedIndex];
        display.textContent = so ? so.text.trim() : "";
        return;
      }
      // find the checked input within this fieldset (or globally by name)
      const input = fs.querySelector('input[type="radio"]');
      if (!input) {
        display.textContent = "";
        return;
      }
      const optionName = input.getAttribute("name");
      const checked =
        fs.querySelector('input[name="' + optionName + '"]:checked') ||
        document.querySelector('input[name="' + optionName + '"]:checked');
      if (checked) {
        const lbl = document.querySelector('label[for="' + checked.id + '"]');
        display.textContent = lbl
          ? lbl.textContent.trim()
          : checked.value || "";
      } else {
        display.textContent = "";
      }
    });
  } catch (e) {
    /* ignore */
  }
}

document.addEventListener("DOMContentLoaded", updateActiveOptionStyles);
document.addEventListener("product:content:replaced", updateActiveOptionStyles);
document.addEventListener("DOMContentLoaded", function () {
  updateSelectedOptionNames(document);
});
document.addEventListener("product:content:replaced", function () {
  updateSelectedOptionNames(document);
});
