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
              if (fieldEl && fieldEl.classList)
                fieldEl.classList.add("field-error");
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

      // derive the active form (supports cases where variant scripts replace the form)
      const form =
        (event.target &&
          event.target.closest &&
          event.target.closest("form")) ||
        this.querySelector("form");
      if (!form) return;

      // toggle loading spinner on primary cart button inside the form
      const primaryButton = form.querySelector("button.primary-cart-button");
      const _origButtonHtml = primaryButton ? primaryButton.innerHTML : null;
      const _origButtonWidth = primaryButton ? primaryButton.style.width : null;
      const setLoading = (loading) => {
        if (!primaryButton) return;
        if (loading) {
          // Lock width to avoid layout shift when replacing content with spinner
          try {
            const rect = primaryButton.getBoundingClientRect();
            primaryButton.style.boxSizing = "border-box";
            primaryButton.style.width = rect.width + "px";
          } catch (e) {}
          primaryButton.innerHTML =
            '<svg class="animate-spin inline-block w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>';
          primaryButton.disabled = true;
          primaryButton.setAttribute("aria-busy", "true");
        } else {
          // restore original content and width
          primaryButton.innerHTML = _origButtonHtml || "";
          if (_origButtonWidth) primaryButton.style.width = _origButtonWidth;
          else primaryButton.style.width = "";
          primaryButton.disabled = false;
          primaryButton.removeAttribute("aria-busy");
        }
      };

      setLoading(true);

      const formData = {
        items: [
          {
            id: form.querySelector('input[name="id"]').value,
            quantity: form.querySelector('input[name="quantity"]').value,
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
