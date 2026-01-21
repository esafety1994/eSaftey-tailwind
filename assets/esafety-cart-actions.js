// Optional: Additional JavaScript for handling form submission or interactions can be added here.
if (!customElements.get("esafety-cart-action-button")) {
  class EsafetyCartActionButton extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      // listen on the custom element so submit events still get handled
      // if the inner form is replaced by variant scripts
      this.addEventListener("submit", this.handleSubmit.bind(this));
    }

    handleSubmit(event) {
      event.preventDefault();
      const customFields = document.querySelector(".m-product-custom-field");
      if (customFields) {
        // remove any previous validation UI to avoid duplicates
        customFields
          .querySelectorAll(".custom-field-error")
          .forEach((n) => n.remove());
        customFields
          .querySelectorAll(".field-error")
          .forEach((n) => n.classList.remove("field-error"));
        const customEls = customFields.querySelectorAll(".form-field ");
        if (!customEls || customEls.length === 0) {
          console.log(
            "No .custom_field elements found inside .m-product-custom-field"
          );
        } else {
          for (const el of customEls) {
            const isRequired = el.hasAttribute && el.hasAttribute("required");
            console.log(".custom_field required:", isRequired);
            if (!isRequired) continue;

            // find the actual input/select/textarea associated with this custom field
            let fieldEl = null;
            try {
              if (el.matches && el.matches("input,textarea,select")) {
                fieldEl = el;
              } else {
                fieldEl = el.querySelector("input,textarea,select");
                if (!fieldEl) fieldEl = el.querySelector(".form-field");
                if (!fieldEl) {
                  let next = el.nextElementSibling;
                  while (
                    next &&
                    !(next.classList && next.classList.contains("form-field"))
                  ) {
                    next = next.nextElementSibling;
                  }
                  fieldEl = next;
                }
              }
            } catch (e) {
              fieldEl = null;
            }

            // check emptiness for various field types
            let empty = true;
            if (fieldEl) {
              const tag = fieldEl.tagName && fieldEl.tagName.toLowerCase();
              if (tag === "input") {
                const type = (fieldEl.type || "").toLowerCase();
                if (type === "checkbox") empty = !fieldEl.checked;
                else if (type === "radio") {
                  if (fieldEl.name) {
                    const any = customFields.querySelector(
                      `input[name="${fieldEl.name}"]:checked`
                    );
                    empty = !any;
                  } else empty = !fieldEl.checked;
                } else
                  empty = !(fieldEl.value && fieldEl.value.toString().trim());
              } else if (tag === "textarea")
                empty = !(fieldEl.value && fieldEl.value.toString().trim());
              else if (tag === "select")
                empty = !(fieldEl.value && fieldEl.value.toString().trim());
              else empty = !(fieldEl.textContent || "").toString().trim();
            } else {
              empty = true; // no field found -> treat as empty
            }

            if (empty) {
              // remove previous error for this element
              if (el.querySelectorAll)
                el.querySelectorAll(".custom-field-error").forEach((n) =>
                  n.remove()
                );
              const err = document.createElement("div");
              err.className =
                "custom-field-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm";
              err.style.color = "red";
              // try to get label text for error
              let labelText = "";
              const id = fieldEl && fieldEl.id;
              if (id) {
                const lbl = customFields.querySelector(`label[for="${id}"]`);
                if (lbl) {
                  const lblClone = lbl.cloneNode(true);
                  if (lblClone.querySelectorAll)
                    lblClone.querySelectorAll("sup").forEach((n) => n.remove());
                  labelText = (lblClone.textContent || "").trim();
                }
              }
              if (!labelText) {
                const prevLbl =
                  el.previousElementSibling &&
                  el.previousElementSibling.tagName &&
                  el.previousElementSibling.tagName.toLowerCase() === "label"
                    ? el.previousElementSibling
                    : null;
                if (prevLbl) {
                  const prevClone = prevLbl.cloneNode(true);
                  if (prevClone.querySelectorAll)
                    prevClone
                      .querySelectorAll("sup")
                      .forEach((n) => n.remove());
                  labelText = (prevClone.textContent || "").trim();
                }
              }
              err.textContent = labelText
                ? `${labelText} is required`
                : "This field is required";
              if (fieldEl && fieldEl.classList) fieldEl.classList.add("field-error");
              else if (el.classList) el.classList.add("field-error");
              if (fieldEl && fieldEl.insertAdjacentElement)
                fieldEl.insertAdjacentElement("afterend", err);
              else if (el.insertAdjacentElement)
                el.insertAdjacentElement("afterend", err);
              try {
                (fieldEl || el).focus();
              } catch (e) {}
              return; // stop submission
            }
          }
        }
      } else {
        console.log("No .m-product-custom-field container found");
      }

      let properties = {};
      if (customFields) {
        const labels = customFields.querySelectorAll("label");
        const pairs = Array.from(labels).map((label) => {
          let fieldEl = null;
          const forId = label.getAttribute && label.getAttribute("for");
          if (forId) {
            fieldEl = document.getElementById(forId);
          }
          if (!fieldEl) {
            let next = label.nextElementSibling;
            while (
              next &&
              !(next.classList && next.classList.contains("form-field"))
            ) {
              next = next.nextElementSibling;
            }
            fieldEl = next;
          }

          let value = "";
          if (fieldEl) {
            const tag = fieldEl.tagName && fieldEl.tagName.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") {
              value = fieldEl.value || "";
            } else {
              value = (fieldEl.textContent || "").trim();
            }
          }

          // remove any <sup> (or similar) from the label when extracting text
          const labelClone = label.cloneNode(true);
          if (labelClone.querySelectorAll) {
            labelClone.querySelectorAll("sup").forEach((n) => n.remove());
          }
          const cleanLabel = (labelClone.textContent || "").trim();
          return { label: cleanLabel, value };
        });

        customFields.fieldPairs = pairs;

        // build a properties object suitable for Shopify cart properties
        pairs.forEach((p) => {
          properties[p.label] = p.value || true;
        });
      }

      // Fallback: if no `.m-product-custom-field` was present or produced no properties,
      // collect values from selects, checked radios and text inputs within the product form
      // and from common swatch containers. This ensures older themes' option names
      // like "Choose Material" or "Choose Size" are captured as cart properties.
      try {
        const formEl = (event.target && event.target.closest && event.target.closest('form')) || document.querySelector('#product-act-button form') || document.querySelector('form[action*="/cart/add"]');
        const collected = {};
        if (formEl) {
          // selects (use visible option text)
          formEl.querySelectorAll('select[name]').forEach((s) => {
            const key = s.name && s.name.trim();
            if (!key) return;
            const opt = s.options && s.options[s.selectedIndex];
            const val = opt ? (opt.textContent || opt.value || '').trim() : (s.value || '').trim();
            if (val) collected[key] = val;
          });

          // checked radios
          formEl.querySelectorAll('input[type="radio"][name]').forEach((r) => {
            if (!r.checked) return;
            const key = r.name && r.name.trim();
            if (!key) return;
            let val = (r.value || '').trim();
            // prefer nearby swatch label text if present
            const wrap = r.closest && r.closest('.avp-productoptionswatchwrapper');
            if (wrap) {
              const txt = (wrap.textContent || '').trim();
              if (txt) val = txt;
            } else {
              // try label[for=]
              const id = r.id;
              if (id) {
                const lbl = document.querySelector('label[for="' + id + '"]');
                if (lbl && (lbl.textContent || '').trim()) val = lbl.textContent.trim();
              }
            }
            if (val) collected[key] = val;
          });

          // text inputs and textareas
          formEl.querySelectorAll('input[type="text"][name], textarea[name]').forEach((t) => {
            const key = t.name && t.name.trim();
            if (!key) return;
            const val = (t.value || '').trim();
            if (val) collected[key] = val;
          });
        }

        // also scan general swatch container outside the form
        const swatchContainer = document.querySelector('.ap-options__swatch-container');
        if (swatchContainer) {
          swatchContainer.querySelectorAll('input[type="radio"][name]').forEach((r) => {
            if (!r.checked) return;
            const key = r.name && r.name.trim();
            if (!key) return;
            const wrap = r.closest && r.closest('.avp-productoptionswatchwrapper');
            let val = '';
            if (wrap) val = (wrap.textContent || '').trim();
            if (!val) val = (r.value || '').trim();
            if (val) collected[key] = val;
          });
        }

        // merge collected into properties for submission if properties is empty
        if (Object.keys(properties).length === 0 && Object.keys(collected).length > 0) {
          properties = collected;
        } else {
          // merge but don't overwrite explicit properties
          Object.keys(collected).forEach((k) => { if (!properties[k]) properties[k] = collected[k]; });
        }
      } catch (e) {
        // fail silently
      }

      // derive the active form (supports cases where variant scripts replace the form)
      const form =
        (event.target &&
          event.target.closest &&
          event.target.closest("form")) ||
        this.querySelector("form");
      if (!form) return;

      // toggle loading spinner on primary cart button inside the form
      const primaryButton = form.querySelector("button.primary-cart-button");
      const setLoading = (loading) => {
        if (!primaryButton) return;
        if (loading) {
          primaryButton.disabled = true;
          primaryButton.setAttribute("aria-busy", "true");
          primaryButton.classList.add('opacity-50', 'pointer-events-none');
        } else {
          primaryButton.disabled = false;
          primaryButton.removeAttribute("aria-busy");
          primaryButton.classList.remove('opacity-50', 'pointer-events-none');
        }
      };

      setLoading(true);

      // Safely read quantity (default to 1 when no quantity input present)
      var qtyEl = form.querySelector('input[name="quantity"]');
      var qty = 1;
      try {
        if (qtyEl && qtyEl.value) qty = parseInt(qtyEl.value, 10) || 1;
      } catch (e) {
        qty = 1;
      }

      var idEl = form.querySelector('input[name="id"]');
      var variantId = idEl && idEl.value ? idEl.value : null;

      const formData = {
        items: [
          {
            id: variantId,
            quantity: qty,
            properties: properties,
          },
        ],
        sections: "esaftey-cart-drawer,cart-count",
      };

      console.log("Adding to cart", formData);

      fetch(window.Shopify.routes.root + "cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => response.json())
        .then((data) => {
          document.documentElement.dispatchEvent(
            new CustomEvent("cart:render", { detail: data, bubbles: true })
          );
          setLoading(false);
        })
        .catch((err) => {
          console.error("Add to cart failed", err);
          setLoading(false);
        });
    }

    disconnectedCallback() {}
  }
  customElements.define("esafety-cart-action-button", EsafetyCartActionButton);
}

class EsafetyCartActionsAddToCartButton extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.addBtn = this.querySelector("[data-button-type='add-to-cart']");
    this._onAdd = this.handleAdd.bind(this);
    this.addBtn.addEventListener("click", this._onAdd);
    // attach qty plus/minus handlers for circle buttons inside the qty input counter
    try {
      const counter = this.querySelector("[data-qty-input-counter]");
      if (counter) {
        this._counter = counter;
        this._qtyInput = counter.querySelector('input[name="qty"]');
        this._minusBtn = counter.querySelector("button:first-of-type");
        this._plusBtn = counter.querySelector("button:last-of-type");
        // NOTE: don't attach direct listeners to the buttons to avoid double-firing
        // we use delegated click on the counter (`this._counter`) instead
        if (this._qtyInput) {
          this._onQtyChange = this.onQtyInputChange.bind(this);
          this._qtyInput.addEventListener('change', this._onQtyChange);
          this._qtyInput.addEventListener('blur', this._onQtyChange);
        }
        // delegate clicks from inner SVG/span to the buttons so SVG clicks work
        this._onCounterClick = this.onCounterClick.bind(this);
        this._counter.addEventListener('click', this._onCounterClick);
      }
    } catch (e) {
      // fail gracefully
    }
  }

  // show/hide loading state to prevent duplicate clicks
  setLoading(loading) {
    try {
      const overlay = document.getElementById('global-spinner-overlay');
      if (loading) {
        if (this._isLoading) return;
        this._isLoading = true;
        if (this.addBtn) {
          this.addBtn.disabled = true;
          this.addBtn.classList.add('opacity-50', 'pointer-events-none');
        }
        if (this._counter) {
          this._counter.classList.add('opacity-50', 'pointer-events-none');
        }
        if (overlay) overlay.classList.remove('hidden');
      } else {
        this._isLoading = false;
        if (this.addBtn) {
          this.addBtn.disabled = false;
          this.addBtn.classList.remove('opacity-50', 'pointer-events-none');
        }
        if (this._counter) {
          this._counter.classList.remove('opacity-50', 'pointer-events-none');
        }
        if (overlay) overlay.classList.add('hidden');
      }
    } catch (e) {}
  }

  disconnectedCallback() {
    try {
      if (this.addBtn && this._onAdd)
        this.addBtn.removeEventListener("click", this._onAdd);
      // direct button listeners were not attached (delegation is used)
        if (this._counter && this._onCounterClick)
          this._counter.removeEventListener('click', this._onCounterClick);
        if (this._qtyInput && this._onQtyChange) {
          this._qtyInput.removeEventListener('change', this._onQtyChange);
          this._qtyInput.removeEventListener('blur', this._onQtyChange);
        }
    } catch (e) {}
  }

  handleAdd(event) {
    event.preventDefault();
    if (this._isLoading) return;
    const qtyElement = this.querySelector(
      "[data-qty-input-counter] .custom-number-input"
    );
    qtyElement.classList.remove("right-1/2", "opacity-0");
    qtyElement.classList.add("-right-1/2", "opacity-100");
    this.addBtn.classList.add("opacity-0");
    this.addBtn.classList.remove("opacity-100");
    // ensure qty input is visible and set to 1, then add 1 item to cart
    if (this._qtyInput) this._qtyInput.value = 1;
    const variantId = this.getVariantId();
    if (variantId) this.addToCart(variantId, 1);
    const cartActionForm = this.closest("esafety-cart-action-button");
  }
  handleMinus(event) {
    event.preventDefault();
    if (this._isLoading) return;
    if (!this._qtyInput) return;
    try {
      let val = parseInt(this._qtyInput.value, 10) || 0;
      val = Math.max(0, val - 1);
      this._qtyInput.value = val;
      const qtyElement = this.querySelector(
        "[data-qty-input-counter] .custom-number-input"
      );
      if (qtyElement && val === 0) {
        // user reduced to zero: update cart to remove item, then collapse UI to add button
        const productAttr = this.getAttribute('data-product');
        const productId = parseProductId(productAttr);
        if (productId) this.addToCart(productId, 0);
        // reset visible input to 1 for next open, toggle UI
        this._qtyInput.value = 1;
        qtyElement.classList.remove("right-1/2", "opacity-100");
        qtyElement.classList.add("-right-1/2", "opacity-0");
        this.addBtn.classList.add("opacity-100");
        this.addBtn.classList.remove("opacity-0");
        return; // done
      }
      // when qty > 0, add/update cart
      const variantId = this.getVariantId();
      if (variantId && val > 0) this.addToCart(variantId, val);
    } catch (e) {}
  }

  handlePlus(event) {
    event.preventDefault();
    if (this._isLoading) return;
    if (!this._qtyInput) return;
    try {
      let val = parseInt(this._qtyInput.value, 10) || 0;
      val = val + 1;
      this._qtyInput.value = val;
      const qtyElement = this.querySelector(
        "[data-qty-input-counter] .custom-number-input"
      );
      if (qtyElement) {
        qtyElement.classList.remove("right-1/2");
        qtyElement.classList.add("-right-1/2");
      }
      const variantId = this.getVariantId();
      if (variantId && val > 0) this.addToCart(variantId, val);
    } catch (e) {}
  }

  // Attempt to locate the current variant id from the surrounding form or input
  getVariantId() {
    try {
      // prefer an input[name="id"] within the nearest esafety-cart-action-button
      const formEl = this.closest('esafety-cart-action-button');
      if (formEl) {
        const idInput = formEl.querySelector('input[name="id"]').cloneNode
          ? formEl.querySelector('input[name="id"]')
          : null;
        if (idInput && idInput.value) return idInput.value;
      }
      // fallback: look for input inside this element
      const localId = this.querySelector && this.querySelector('input[name="id"]');
      if (localId && localId.value) return localId.value;
      // fallback: try data-product attribute
      const productAttr = this.getAttribute('data-product');
      const parsed = parseProductId(productAttr);
      return parsed;
    } catch (e) {
      return null;
    }
  }

  onCounterClick(event) {
    try {
      const btn = event.target && event.target.closest && event.target.closest('button');
      if (!btn) return;
      if (btn === this._plusBtn) this.handlePlus(event);
      else if (btn === this._minusBtn) this.handleMinus(event);
    } catch (e) {}
  }

  onQtyInputChange(event) {
    if (!this._qtyInput) return;
    if (this._isLoading) return;
    try {
      const val = parseInt(this._qtyInput.value, 10) || 0;
      const variantId = this.getVariantId();
      if (!variantId) return;
      if (val > 0) {
        this.addToCart(variantId, val);
      } else {
        // treat 0 as remove: update cart to 0 and collapse UI to add button
        this.addToCart(variantId, 0);
        const qtyElement = this.querySelector('[data-qty-input-counter] .custom-number-input');
        if (qtyElement) {
          qtyElement.classList.remove('right-1/2', 'opacity-100');
          qtyElement.classList.add('-right-1/2', 'opacity-0');
        }
        this.addBtn.classList.remove('opacity-0');
        this.addBtn.classList.add('opacity-100');
        this._qtyInput.value = 1;
      }
    } catch (e) {}
  }

  addToCart(productId, quantity) {
    console.log('Adding to cart', { productId, quantity });
    try {
      if (this.setLoading) this.setLoading(true);
      // read current cart to decide whether to update existing line or add new
      return fetch(window.Shopify.routes.root + 'cart.js')
        .then((r) => r.json())
        .then((cart) => {
          const items = (cart && cart.items) || [];
          const match = items.find((it) => String(it.id) === String(productId));
          const parsedQty = parseInt(quantity, 10);
          const qty = isNaN(parsedQty) ? 1 : parsedQty;
          if (match) {
            // update existing line to the exact quantity using cart/change.js (use line index)
            const index = items.findIndex((it) => String(it.id) === String(productId));
            const line = index >= 0 ? index + 1 : null;
            console.log('Updating cart line', { productId, qty, match, line });
            if (line) {
              return fetch(window.Shopify.routes.root + 'cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ line: line, quantity: qty, sections: 'esaftey-cart-drawer,cart-count' }),
              }).then((r) => r.json());
            }
            // fallback to update.js if line not found
            const updates = {};
            updates[match.key] = qty;
            return fetch(window.Shopify.routes.root + 'cart/update.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates: updates, sections: 'esaftey-cart-drawer,cart-count' }),
            }).then((r) => r.json());
          } else {
            // item not in cart: add with requested quantity
            const formData = {
              items: [
                { id: productId, quantity: qty },
              ],
              sections: 'esaftey-cart-drawer,cart-count',
            };
            return fetch(window.Shopify.routes.root + 'cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            }).then((r) => r.json());
          }
        })
        .then((data) => {
          try {
            document.documentElement.dispatchEvent(
              new CustomEvent('cart:render', { detail: data, bubbles: true })
            );
          } catch (e) {}
          if (this.setLoading) this.setLoading(false);
        })
        .catch((err) => {
          console.error('Cart operation failed', err);
          if (this.setLoading) this.setLoading(false);
        });
    } catch (e) {
      if (this.setLoading) this.setLoading(false);
    }
  }
}
// helper: try to parse `data-product` which may be a plain id or JSON string
function parseProductId(attr) {
  if (!attr) return null;
  if (/^\d+$/.test(attr)) return attr;
  try {
    const parsed = JSON.parse(attr);
    if (parsed && parsed.id) return parsed.id;
    if (parsed && parsed.variants && parsed.variants[0] && parsed.variants[0].id)
      return parsed.variants[0].id;
  } catch (e) {
    // not JSON
  }
  return attr;
}
customElements.define(
  "esafety-custom-add-to-cart-button",
  EsafetyCartActionsAddToCartButton
);
