// Track which steps have been selected
let selectedSteps = new Set();

document.addEventListener("DOMContentLoaded", function () {
  if (document.querySelector(".avpoptions-container__v2")) {
    onSwatchReady();
  } else {
    const observer = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === 1 &&
            (node.classList.contains("avpoptions-container__v2") ||
              node.querySelector(".avpoptions-container__v2"))
          ) {
            onSwatchReady();
            observer.disconnect();
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
});

function onSwatchReady() {
  moveVariantPicker();
  moveProductPriceAboveQty();
  attachAccordionDelegation();
  createAccordionForSwatchContainer();
  insertSteps4And5IntoApp();
  setupAccordionStepAutoAdvance();
  // Wire material change -> repopulate sizes
  document.querySelectorAll('select[name="Choose Material"], input[name="Choose Material"]').forEach((el) => {
    el.addEventListener('change', () => {
      try { updateSizeOptions(); } catch (e) {}
    });
  });
  // ensure size select change updates hidden variant
  document.addEventListener('change', (e) => {
    const sel = e.target;
    if (sel && sel.matches && sel.matches('select[name="Choose Size"]')) {
      const hid = document.getElementById('custom-sign-selected-variant');
      if (hid) { hid.value = sel.value; hid.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  // initial population
  try { updateSizeOptions(); } catch (e) {}
  // Wire price updates from hidden variant id
  try { wireVariantPriceUpdates(); } catch (e) {}
}

// Update `#custom-sign-price-inc` and `#custom-sign-price-ex` when hidden variant id changes
function wireVariantPriceUpdates() {
  const hid = document.getElementById('custom-sign-selected-variant');
  if (!hid) return;

  const format = (cents) => {
    if (cents == null) return '';
    // Shopify.formatMoney expects integer cents in many themes
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      try { return window.Shopify.formatMoney(Number(cents)); } catch (e) {}
    }
    const n = Number(cents) / 100;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, style: 'currency', currency: (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD' });
  };

  const setForVariantId = (variantId) => {
    if (!variantId) return;
    const variants = window.meta?.product?.variants || [];
    const v = variants.find(x => String(x.id) === String(variantId) || String(x.id) === String(Number(variantId)));
    const incEl = document.getElementById('custom-sign-price-inc');
    const exEl = document.getElementById('custom-sign-price-ex');
    if (!v) {
      if (incEl) incEl.textContent = '';
      if (exEl) exEl.textContent = '';
      return;
    }
    const priceCents = v.price != null ? v.price : v.price_cents || v.price_in_cents || null;
    let compareCents = v.compare_at_price != null ? v.compare_at_price : v.compare_at_price_cents || null;
    // If no compare_at_price provided, set compare to 90% of the price (10% less)
    if ((compareCents === null || compareCents === undefined) && priceCents != null) {
      const pn = Number(priceCents);
      if (!Number.isNaN(pn)) compareCents = Math.round(pn * 0.9);
    }
    if (incEl) incEl.textContent = format(priceCents);
    if (exEl) exEl.textContent = compareCents ? format(compareCents) : '';
  };

  hid.addEventListener('change', (e) => {
    setForVariantId(e.target.value);
  });

  // initial
  setForVariantId(hid.value);
}



/** Create accordion structure around swatches */
function createAccordionForSwatchContainer() {
  const swatchContainer = document.querySelector(
    ".avp-option.ap-options__swatch-container",
  );
  if (!swatchContainer || swatchContainer.closest(".accordion-wrapper")) return;
  const wrapper = createAccordionDOM(1, "Choose Standard Template", true);
  // insert wrapper before swatch and move swatch into content
  swatchContainer.parentNode.insertBefore(wrapper, swatchContainer);
  const content = wrapper.querySelector(".accordion-content");
  content.appendChild(swatchContainer);
  // Open step 1 by default
  openAccordionByStep(wrapper);
  injectCirclesAndListeners();
}

/** Create an accordion DOM node factory
 *  step: number
 *  title: string
 *  open: boolean
 *  returns wrapper element with data-step attribute
 */
function createAccordionDOM(step, title, open = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "accordion-wrapper";
  if (step) wrapper.setAttribute("data-step", String(step));

  const header = document.createElement("div");
  header.className = "accordion-header";
  header.innerHTML = `
      <span class="step-title">Step ${step}: ${title}</span>
      <span class="accordion-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </span>`;

  const contentWrapper = document.createElement("div");
  contentWrapper.className = "accordion-content-wrapper";
  const content = document.createElement("div");
  content.className = "accordion-content";
  content.style.maxHeight = open
    ? step === 5
      ? "375px"
      : content.scrollHeight + "px"
    : "0px";
  if (open) content.classList.add("open");
  if (open && header.querySelector("svg"))
    header.querySelector("svg").style.transform = "rotate(180deg)";

  contentWrapper.appendChild(content);
  wrapper.appendChild(header);
  wrapper.appendChild(contentWrapper);
  return wrapper;
}

/** Open an accordion by step number (or wrapper element) and ensure max-height is correct */
function openAccordionByStep(stepOrWrapper) {
  const wrapper =
    typeof stepOrWrapper === "number"
      ? document.querySelector(
          `.accordion-wrapper[data-step="${stepOrWrapper}"]`,
        )
      : stepOrWrapper;
  if (!wrapper) return;
  const content = wrapper.querySelector(".accordion-content");
  if (!content) return;
  content.classList.add("open");
  wrapper.classList.add("accordion-open");
  const stepAttr = Number(wrapper.getAttribute("data-step")) || null;
  if (stepAttr === 5) content.style.maxHeight = "375px";
  else {
    // Try to set to exact scrollHeight, fallback to a large value
    const h = content.scrollHeight || 2000;
    content.style.maxHeight = h + "px";
  }
  const svg = wrapper.querySelector(".accordion-header svg");
  if (svg) svg.style.transform = "rotate(180deg)";

  // Recalculate after images load or shortly after to account for late-rendered content
  setTimeout(() => {
    if (content.classList.contains("open"))
      content.style.maxHeight = (content.scrollHeight || 2000) + "px";
  }, 250);
  // also listen for images inside
  content.querySelectorAll("img").forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", () => {
        if (content.classList.contains("open"))
          content.style.maxHeight = (content.scrollHeight || 2000) + "px";
      });
    }
  });
}

// Delegated click handler so server-rendered accordions work without per-node bindings
function attachAccordionDelegation() {
  if (window.__accordionDelegationAttached) return;
  document.body.addEventListener("click", (e) => {
    const header = e.target.closest && e.target.closest(".accordion-header");
    if (!header) return;
    const wrapper = header.closest(".accordion-wrapper");
    if (!wrapper) return;
    const content = wrapper.querySelector(".accordion-content");
    if (!content) return;
    const isOpen = content.classList.toggle("open");
    wrapper.classList.toggle("accordion-open", isOpen);
    // cap step 5 height
    const stepAttr = Number(wrapper.getAttribute("data-step")) || null;
    if (isOpen && stepAttr === 5) content.style.maxHeight = "375px";
    else content.style.maxHeight = isOpen ? content.scrollHeight + "px" : "0px";
    const svg = header.querySelector("svg");
    if (svg) svg.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
  });
  window.__accordionDelegationAttached = true;
}

/** Move variant picker after swatches */
function moveVariantPicker() {
  const variantPicker = document.querySelector(".custom-sign-wrapper");
  const swatchContainer = document.querySelector(
    ".avp-option.ap-options__swatch-container",
  );
  if (variantPicker && swatchContainer) {
    const parent = swatchContainer.parentNode;
    const ref = swatchContainer.nextSibling;
    // Move each child of the wrapper to immediately after the swatch container
    while (variantPicker.firstChild) {
      parent.insertBefore(variantPicker.firstChild, ref);
    }
    // Remove the now-empty wrapper if it was only a container
    if (variantPicker.parentNode) variantPicker.parentNode.removeChild(variantPicker);
  }
}

// Move `#product-price` to just before the parent of `.qty-selector` if present
function moveProductPriceAboveQty() {
  try {
    const priceEl = document.getElementById('product-price');
    if (!priceEl) return;
    const qty = document.querySelector('.qty-selector');
    if (!qty || !qty.parentNode || !qty.parentNode.parentNode) return;
    const parent = qty.parentNode;
    // If already immediately before the parent, nothing to do
    if (parent.previousSibling === priceEl) return;
    parent.parentNode.insertBefore(priceEl, parent);
  } catch (e) {
    /* no-op */
  }
}

/** Insert Step 4 and 5 inside app container after .custom-sign-wrapper */
function insertSteps4And5IntoApp() {
  const app = document.querySelector(".avpoptions-container__v2");
  if (!app) return;

  // Determine insertion point: immediately after .custom-sign-wrapper if present
  const custom = app.querySelector(".custom-sign-wrapper");
  let insertAfter = custom || null;

  // helper to check existing step inside app
  const hasStepInApp = (num) => {
    return (
      !!app.querySelector(".accordion-wrapper .step-title") &&
      Array.from(app.querySelectorAll(".accordion-wrapper .step-title")).some(
        (t) => /step\s*' + num + '/i.test(t.textContent || ""),
      )
    );
  };

  // create function to build wrapper
  const build = (stepNum, title) => {
    if (app.querySelector(`.accordion-wrapper[data-step="${stepNum}"]`))
      return null;
    return createAccordionDOM(stepNum, title, false);
  };

  // Build step 4
  const step4 = build(4, "Choose Orientation");
  if (step4) {
    if (insertAfter && insertAfter.parentNode)
      insertAfter.parentNode.insertBefore(step4, insertAfter.nextSibling);
    else app.appendChild(step4);
    const selectContainer =
      document.querySelector(".avp-option.ap-options__select-container") ||
      document.querySelector(".ap-options__select-container");
    if (selectContainer && !selectContainer.closest(".accordion-wrapper")) {
      step4.querySelector(".accordion-content").appendChild(selectContainer);
    }
    insertAfter = step4;
  }

  // Build step 5
  const step5 = build(5, "Add Text Messages And any other comments");
  if (step5) {
    if (insertAfter && insertAfter.parentNode)
      insertAfter.parentNode.insertBefore(step5, insertAfter.nextSibling);
    else app.appendChild(step5);
    document
      .querySelectorAll(
        ".ap-options__textarea-container, .ap-options__file-container",
      )
      .forEach((el) => {
        if (el && !el.closest(".accordion-wrapper"))
          step5.querySelector(".accordion-content").appendChild(el);
      });
  }
}

/** Add visual circles to radio buttons and manage state */
function injectCirclesAndListeners() {
  document
    .querySelectorAll(".avp-productoptionswatchwrapper")
    .forEach((label) => {
      const input = label.querySelector('input[type="radio"]');
      if (input && !label.querySelector(".custom-circle")) {
        const circle = document.createElement("span");
        circle.className = "custom-circle";
        label.insertBefore(circle, input.nextSibling);
      }
    });

  document
    .querySelectorAll('.avp-productoptionswatchwrapper input[type="radio"]')
    .forEach((input) => {
      input.addEventListener("change", () => {
        const name = input.name;
        document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
          const circle = radio.parentElement.querySelector(".custom-circle");
          if (circle) circle.classList.remove("filled");
        });
        const selectedCircle =
          input.parentElement.querySelector(".custom-circle");
        if (selectedCircle) selectedCircle.classList.add("filled");
      });

      if (input.checked) {
        input.dispatchEvent(new Event("change"));
      }
    });
}

function setupAccordionStepAutoAdvance() {
  // Listen to radios: read numeric data-step from the wrapper and advance to the next numeric step
  document.querySelectorAll('.accordion-wrapper input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      // ignore programmatic changes
      if (!e.isTrusted) return;
      if (!radio.checked) return;
      const wrapper = radio.closest('.accordion-wrapper');
      const stepAttr = Number(wrapper?.getAttribute('data-step'));
      const advanceArg = isFinite(stepAttr) ? stepAttr : radio;
      if (isFinite(stepAttr)) selectedSteps.add(stepAttr);
      goToNextAccordionStep(advanceArg);
    });
  });

  // Listen to selects: use wrapper data-step when present
  document.querySelectorAll('.accordion-wrapper select').forEach((select) => {
    select.addEventListener('change', (e) => {
      // ignore programmatic changes (only advance on real user interaction)
      if (!e.isTrusted) return;
      const wrapper = select.closest('.accordion-wrapper');
      const stepAttr = Number(wrapper?.getAttribute('data-step'));
      if (isFinite(stepAttr)) goToNextAccordionStep(stepAttr);
      else goToNextAccordionStep(select);
    });
  });
}

function goToNextAccordionStep(currentElementOrStep) {
  console.log("goToNextAccordionStep called with:", currentElementOrStep);
  // Determine numeric current step
  let currentStep = null;
  if (typeof currentElementOrStep === 'number') currentStep = currentElementOrStep;
  else if (currentElementOrStep && currentElementOrStep.closest) {
    const wrapper = currentElementOrStep.closest('.accordion-wrapper');
    currentStep = Number(wrapper?.getAttribute('data-step'));
  }
  if (!isFinite(currentStep)) return;

  const container = document.querySelector('.avpoptions-container__v2') || document.body;

  // Close current accordion (if present by data-step)
  const currentAccordion = container.querySelector(`.accordion-wrapper[data-step="${currentStep}"]`);
  if (currentAccordion) {
    const currentContent = currentAccordion.querySelector('.accordion-content');
    const currentIcon = currentAccordion.querySelector('.accordion-icon svg');
    if (currentContent) { currentContent.classList.remove('open'); currentContent.style.maxHeight = '0px'; }
    if (currentIcon) currentIcon.style.transform = 'rotate(0deg)';
  }

  // If we just finished Step 1, reveal the theme product price area
  if (currentStep === 1) {
    const productPriceEl = document.getElementById('product-price');
    if (productPriceEl && productPriceEl.classList) productPriceEl.classList.remove('hidden');
  }

  // Prefer next numeric step (currentStep + 1), otherwise pick the smallest step > currentStep
  let nextAccordion = container.querySelector(`.accordion-wrapper[data-step="${currentStep + 1}"]`);
  if (!nextAccordion) {
    const candidates = Array.from(container.querySelectorAll('.accordion-wrapper[data-step]'))
      .map(acc => ({ el: acc, step: Number(acc.getAttribute('data-step')) }))
      .filter(x => isFinite(x.step) && x.step > currentStep)
      .sort((a, b) => a.step - b.step);
    if (candidates.length) nextAccordion = candidates[0].el;
  }

  // DOM fallback: next wrapper in DOM order
  if (!nextAccordion) {
    const domAccords = Array.from(container.querySelectorAll('.accordion-wrapper'));
    const idx = domAccords.indexOf(currentAccordion);
    if (idx >= 0 && idx + 1 < domAccords.length) nextAccordion = domAccords[idx + 1];
  }

  if (nextAccordion) {
    const nextContent = nextAccordion.querySelector('.accordion-content');
    const nextIcon = nextAccordion.querySelector('.accordion-icon svg');
    if (nextContent) {
      nextContent.classList.add('open');
      const nextStepAttr = Number(nextAccordion.getAttribute('data-step')) || null;
      if (nextStepAttr === 5) nextContent.style.maxHeight = '375px';
      else nextContent.style.maxHeight = (nextContent.scrollHeight || 2000) + 'px';
    }
    if (nextIcon) nextIcon.style.transform = 'rotate(180deg)';
  }
}

// Populate size selects based on selected material and map options to variant ids
function updateSizeOptions() {
  const matSelect = document.querySelector('select[name="Choose Material"]');
  let selectedMaterial = '';
  if (matSelect) selectedMaterial = (matSelect.options[matSelect.selectedIndex]?.text || '').trim();
  if (!selectedMaterial) {
    const matRadio = document.querySelector('input[name="Choose Material"]:checked');
    if (matRadio) selectedMaterial = (matRadio.value || '').trim();
  }
  // If still no material, try variant-button checked node text
  if (!selectedMaterial) {
    const vbChecked = document.querySelector('variant-button[data-option-name="Choose Material"] .m-product-option--node input:checked');
    if (vbChecked) selectedMaterial = (vbChecked.getAttribute('data-value') || vbChecked.value || '').trim();
  }
  if (!selectedMaterial) return;

  const variants = window.meta?.product?.variants || [];
  const sizeMap = []; // { size, variantId }
  const seen = new Set();
  variants.forEach((v) => {
    let material = '';
    let size = '';
    if (v.options && v.options.length >= 2) {
      material = String(v.options[0]).trim();
      size = String(v.options[1]).trim();
    } else if (v.option1 || v.option2) {
      material = (v.option1 || '').trim();
      size = (v.option2 || '').trim();
    } else if (v.public_title && v.public_title.includes(' / ')) {
      const parts = v.public_title.split(' / ').map(p => p.trim());
      material = parts[0] || '';
      size = parts[1] || '';
    }
    if (!material || !size) return;
    if (material.toLowerCase() === selectedMaterial.toLowerCase()) {
      if (!seen.has(size)) { seen.add(size); sizeMap.push({ size, id: String(v.id) }); }
    }
  });

  // Update all size selects
  document.querySelectorAll('select[name="Choose Size"]').forEach((select) => {
    const prev = select.value;
    select.innerHTML = '';
    sizeMap.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id; // store variant id as option value
      opt.textContent = s.size;
      select.appendChild(opt);
    });
    if (sizeMap.length === 1) {
      select.value = sizeMap[0].id;
      const hid = document.getElementById('custom-sign-selected-variant');
      if (hid) { hid.value = sizeMap[0].id; hid.dispatchEvent(new Event('change', { bubbles: true })); }
    } else if (prev) {
      const found = Array.from(select.options).find(o => o.value === prev);
      if (found) select.value = prev;
      else if (sizeMap.length > 0) {
        // default to first available variant id
        select.value = sizeMap[0].id;
        const hid = document.getElementById('custom-sign-selected-variant');
        if (hid) { hid.value = sizeMap[0].id; hid.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    }
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Update node-based size inputs if present (enable/disable)
  document.querySelectorAll('div.m-product-option--node[data-option-position="2"]').forEach((node) => {
    const input = node.querySelector('input');
    const val = (node.getAttribute('data-value') || input?.value || '').trim();
    if (!val) return;
    const enabled = sizeMap.some(s => s.size === val || s.id === val);
    if (enabled) { node.classList.remove('m-product-option--node__unavailable'); if (input) input.removeAttribute('disabled'); }
    else { node.classList.add('m-product-option--node__unavailable'); if (input) input.setAttribute('disabled','disabled'); }
  });
}
