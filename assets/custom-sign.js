document.addEventListener("DOMContentLoaded", function () {
  //step counter
  const selectedSteps = new Set();

  //orientation selection set default
  function insertOrientationPlaceholder() {
    const orientationSelect = document.querySelector(
      'select[name="Orientation"]',
    );

    if (orientationSelect) {
      const alreadyExists = Array.from(orientationSelect.options).some(
        (opt) => opt.value === "" && opt.disabled,
      );

      if (!alreadyExists) {
        const placeholderOption = document.createElement("option");
        placeholderOption.textContent = "Please select one";
        placeholderOption.value = "";
        placeholderOption.disabled = true;
        placeholderOption.selected = true;

        orientationSelect.insertBefore(
          placeholderOption,
          orientationSelect.firstChild,
        );
        orientationSelect.selectedIndex = 0;
      }
    }
  }

  function goToNextAccordionStep(currentElement) {
    const currentAccordion = currentElement.closest(".accordion-wrapper");
    if (!currentAccordion) return;

    // Close current accordion
    const currentContent = currentAccordion.querySelector(".accordion-content");
    const currentIcon = currentAccordion.querySelector(".accordion-icon svg");
    currentContent.classList.remove("open");
    currentContent.style.maxHeight = "0px";
    if (currentIcon) currentIcon.style.transform = "rotate(0deg)";

    // Open next accordion
    const allAccordions = Array.from(
      document.querySelectorAll(".accordion-wrapper"),
    );
    const currentIndex = allAccordions.findIndex(
      (acc) => acc === currentAccordion,
    );
    const nextAccordion = allAccordions[currentIndex + 1];

    if (nextAccordion) {
      const nextContent = nextAccordion.querySelector(".accordion-content");
      const nextIcon = nextAccordion.querySelector(".accordion-icon svg");
      nextContent.classList.add("open");
      nextContent.style.maxHeight = "2000px";
      if (nextIcon) nextIcon.style.transform = "rotate(180deg)";
    }
  }

  function setupAccordionStepAutoAdvance() {
    // Listen to radios
    document
      .querySelectorAll('.accordion-wrapper input[type="radio"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          if (radio.checked) {
            const wrapper = radio.closest(".accordion-wrapper");
            const header = wrapper?.querySelector(".accordion-header");
            const headerText = header?.textContent.trim() || "";

            // Extract step number using regex (e.g., "Step 1" → 1)
            const match = headerText.match(/Step\s+(\d+)/i);
            const stepNumber = match ? parseInt(match[1]) : null;

            if (stepNumber) {
              selectedSteps.add(stepNumber);
            }

            // Check if all 3 steps have been selected
            if (selectedSteps.size === 2) {
              //test
              updateSizeOptions();
            }
            if (selectedSteps.size === 3) {
              document
                .querySelectorAll(".price-wrapper, .main-product__block-price")
                .forEach((el) => {
                  el.style.display = "block";
                });
              document
                .querySelectorAll(".price-config-notice")
                .forEach((el) => {
                  el.style.display = "none";
                });
            }
            goToNextAccordionStep(radio);
          }
        });
      });

    // Listen to selects
    document.querySelectorAll(".accordion-wrapper select").forEach((select) => {
      select.addEventListener("change", () => {
        goToNextAccordionStep(select);
      });
    });
  }

  let productSwiper;
  let currentThumbs = [];

  /** Initializes Swiper with custom thumbnail pagination */
  function initProductSwiper(thumbs) {
    productSwiper = new Swiper(".product-swiper", {
      loop: false,
      slidesPerView: 1,
      spaceBetween: 10,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
        renderBullet: function (index, className) {
          return `<span class="${className}">
                    <img src="${thumbs[index]}" alt="Thumbnail ${index + 1}" />
                  </span>`;
        },
      },
    });
  }

  
  function updateSwiperFromSwatches() {
    const swatchWrappers = document.querySelectorAll(".apo-swatch-wrapper");
    const swiperWrapper = document.querySelector(".swiper-wrapper");
    const thumbs = [];

    if (!swatchWrappers.length || !swiperWrapper) return;

    // 🧠 Get main image (change selector as needed)
    const mainImageEl = document.querySelector(".product-main-image img"); // Adjust selector
    const mainImageSrc = mainImageEl?.src || "";

    // 🔄 Clear wrapper
    while (swiperWrapper.firstChild) {
      swiperWrapper.removeChild(swiperWrapper.firstChild);
    }

    // ✅ Add main image first
    if (mainImageSrc) {
      const mainSlide = document.createElement("div");
      mainSlide.className = "swiper-slide";

      const mainImg = document.createElement("img");
      mainImg.src = mainImageSrc;
      mainImg.alt = "Main Product Image";

      mainSlide.appendChild(mainImg);
      swiperWrapper.appendChild(mainSlide);

      thumbs.push(mainImageSrc);
    }

    // 🖼️ Add swatch images
    swatchWrappers.forEach((wrapper) => {
      const img = wrapper.querySelector("img");
      if (img && img.src) {
        const slide = document.createElement("div");
        slide.className = "swiper-slide";

        const swatchImg = document.createElement("img");
        swatchImg.src = img.src;
        swatchImg.alt = "Swatch Slide";

        slide.appendChild(swatchImg);
        swiperWrapper.appendChild(slide);

        thumbs.push(img.src);
      }
    });

    // 🔁 Skip if images didn't change
    if (JSON.stringify(currentThumbs) === JSON.stringify(thumbs)) return;
    currentThumbs = thumbs;

    // 🔄 Re-init Swiper
    if (productSwiper) {
      productSwiper.destroy(true, true);
      productSwiper = null;
    }

    initProductSwiper(thumbs);
    setupSwatchClickToSwiper();
  }

  /** Make swatches clickable to change Swiper slides */
  function setupSwatchClickToSwiper() {
    const swatches = document.querySelectorAll(".apo-swatch-wrapper");
    swatches.forEach((swatch, index) => {
      swatch.addEventListener("click", () => {
        if (productSwiper) productSwiper.slideTo(index + 1);
      });
    });
  }


  /** Add dynamic style for accordion */
  function injectAccordionStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .accordion-wrapper {
        border-bottom: 1px solid #ccc;
        margin-bottom: 10px;
      }
    `;
    document.head.appendChild(style);
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
          document
            .querySelectorAll(`input[name="${name}"]`)
            .forEach((radio) => {
              const circle =
                radio.parentElement.querySelector(".custom-circle");
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

  /** Move variant picker after swatches */
  function moveVariantPicker() {
    const variantPicker = document.querySelector(
      ".custom-sign-wrapper",
    );
    const swatchContainer = document.querySelector(
      ".avp-option.ap-options__swatch-container",
    );
    if (variantPicker && swatchContainer) {
      swatchContainer.parentNode.insertBefore(
        variantPicker,
        swatchContainer.nextSibling,
      );
    }
  }

  /** Create accordion structure around swatches */
  function createAccordionForSwatchContainer() {
    const swatchContainer = document.querySelector(
      ".avp-option.ap-options__swatch-container",
    );
    if (!swatchContainer || swatchContainer.closest(".accordion-wrapper"))
      return;

    const wrapper = document.createElement("div");
    wrapper.className = "accordion-wrapper";

    const header = document.createElement("div");
    header.className = "accordion-header";
    header.innerHTML = `
      <span class="step-title">Step 1: Choose Standard Template</span>
      <span class="accordion-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </span>`;

    const content = document.createElement("div");
    content.className = "accordion-content open";
    content.style.maxHeight = "2000px";

    swatchContainer.parentNode.insertBefore(wrapper, swatchContainer);
    wrapper.append(header, content);
    content.appendChild(swatchContainer);
    header.querySelector("svg").style.transform = "rotate(180deg)";

    header.addEventListener("click", () => {
      const isOpen = content.classList.toggle("open");
      content.style.maxHeight = isOpen ? content.scrollHeight + "px" : "0px";
      header.querySelector("svg").style.transform = isOpen
        ? "rotate(180deg)"
        : "rotate(0deg)";
    });
  }

  /** Insert Step 4 and 5 inside app container after .custom-sign-wrapper */
  function insertSteps4And5IntoApp() {
    const app = document.querySelector('.avpoptions-container__v2');
    if (!app) return;

    // Determine insertion point: immediately after .custom-sign-wrapper if present
    const custom = app.querySelector('.custom-sign-wrapper');
    let insertAfter = custom || null;

    // helper to check existing step inside app
    const hasStepInApp = (num) => {
      return !!app.querySelector('.accordion-wrapper .step-title') && Array.from(app.querySelectorAll('.accordion-wrapper .step-title')).some(t => /step\s*' + num + '/i.test(t.textContent || ''));
    };

    // create function to build wrapper
    const build = (stepNum, title) => {
      // avoid duplicate anywhere under app
      if (app.querySelector(`.accordion-wrapper[data-step="${stepNum}"]`) || Array.from(app.querySelectorAll('.accordion-wrapper .step-title')).some(t => /step\s*' + stepNum + '/i.test(t.textContent || ''))) return null;

      const wrapper = document.createElement('div');
      wrapper.className = 'accordion-wrapper';
      wrapper.setAttribute('data-step', String(stepNum));

      const header = document.createElement('div');
      header.className = 'accordion-header';
      header.innerHTML = `
        <span class="step-title">Step ${stepNum}: ${title}</span>
        <span class="accordion-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>`;

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'accordion-content-wrapper';
      const content = document.createElement('div');
      content.className = 'accordion-content';
      content.style.maxHeight = '0px';
      contentWrapper.appendChild(content);

      wrapper.appendChild(header);
      wrapper.appendChild(contentWrapper);

      header.addEventListener('click', () => {
        const isOpen = content.classList.toggle('open');
        wrapper.classList.toggle('accordion-open', isOpen);
        if (isOpen && stepNum === 5) {
          content.style.maxHeight = '375px';
        } else {
          content.style.maxHeight = isOpen ? content.scrollHeight + 'px' : '0px';
        }
        const svg = header.querySelector('svg'); if (svg) svg.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      });

      return wrapper;
    };

    // Build step 4
    const step4 = build(4, 'Choose Orientation');
    if (step4) {
      if (insertAfter && insertAfter.parentNode) insertAfter.parentNode.insertBefore(step4, insertAfter.nextSibling);
      else app.appendChild(step4);
      // move select container into step 4
      const selectContainer = document.querySelector('.avp-option.ap-options__select-container') || document.querySelector('.ap-options__select-container');
      if (selectContainer && !selectContainer.closest('.accordion-wrapper')) {
        step4.querySelector('.accordion-content').appendChild(selectContainer);
      }
      insertAfter = step4;
    }

    // Build step 5
    const step5 = build(5, 'Add Text Messages And any other comments');
    if (step5) {
      if (insertAfter && insertAfter.parentNode) insertAfter.parentNode.insertBefore(step5, insertAfter.nextSibling);
      else app.appendChild(step5);
      // move textarea and file containers into step 5
      document.querySelectorAll('.ap-options__textarea-container, .ap-options__file-container').forEach(el => {
        if (el && !el.closest('.accordion-wrapper')) step5.querySelector('.accordion-content').appendChild(el);
      });
    }
  }

  /** Create accordions for other customization steps */
  function createAccordionSteps() {
    const steps = [
      { name: "Choose Orientation", step: 4, selector: "Choose Orientation" },
      { name: "Add Text Messages And any other comments", step: 5 },
    ];

    steps.forEach(({ name, step, selector }) => {
      const selectorValue = selector || name;
      let parent = null;
      if (step !== 4) {
        const variantButton = document.querySelector(
          `variant-button[data-option-name="${selectorValue}"]`,
        );
        if (variantButton) parent = variantButton.closest(".m-product-option");
      }

      const wrapper = document.createElement("div");
      wrapper.className = "accordion-wrapper";

      const header = document.createElement("div");
      header.className = "accordion-header";
      header.innerHTML = `
        <span class="step-title">Step ${step}: ${name}</span>
        <span class="accordion-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>`;

      const content = document.createElement("div");
      content.className = "accordion-content";
      content.style.maxHeight = "0px";

      if ((step !== 5 && parent) || (step !== 4 && parent)) {
        content.appendChild(parent.cloneNode(true));
        parent.replaceWith(wrapper);
      } else {
        const specAnchor = document.querySelector(".spec-anchor");
        specAnchor.parentNode.insertBefore(wrapper, specAnchor);
      }
      wrapper.appendChild(header);
      wrapper.appendChild(content);

      if (step === 4) {
        const selectContainer = document.querySelector(
          ".ap-options__select-container",
        );
        if (selectContainer) content.appendChild(selectContainer);
      }

      if (step === 5) {
        document
          .querySelectorAll(
            ".ap-options__textarea-container, .ap-options__file-container",
          )
          .forEach((el) => content.appendChild(el));
      }

      header.addEventListener("click", () => {
        const isOpen = content.classList.toggle("open");
        if (isOpen && step === 5) {
          content.style.maxHeight = "375px";
        } else {
          content.style.maxHeight = isOpen ? "2000px" : "0px";
        }
        header.querySelector("svg").style.transform = isOpen
          ? "rotate(180deg)"
          : "rotate(0deg)";
      });
    });
  }

  /** Change main image based on swatch selection */
  function setupSwatchImageSwap() {
    const swatchContainer = document.querySelector(
      ".avp-option.ap-options__swatch-container",
    );
    const mainImage = document.querySelector(".m-product-media .m-image img");
    if (!swatchContainer || !mainImage) return;

    swatchContainer
      .querySelectorAll('input[type="radio"][name="Template"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          if (radio.checked) {
            const swatchLabel = radio.closest("label");
            const imgElement = swatchLabel?.querySelector(
              ".avp-productoptionswatch-box img",
            );
            if (imgElement?.src) {
              mainImage.src = imgElement.src;
            }
          }
        });

        if (radio.checked) radio.dispatchEvent(new Event("change"));
      });
  }

  /** Wrap accordion content */
  function wrapAccordionContent() {
    document.querySelectorAll(".accordion-content").forEach((content) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("accordion-content-wrapper");

      content.parentNode.insertBefore(wrapper, content);
      wrapper.appendChild(content);
    });
  }

  /** Initialize all custom features after swatches are available */
  function onSwatchReady() {
    // Ensure steps 4 & 5 are inserted inside the app container (after custom-sign-wrapper)
    if (typeof insertSteps4And5IntoApp === 'function') insertSteps4And5IntoApp();
    injectAccordionStyles();
    moveVariantPicker();
    injectCirclesAndListeners();
    createAccordionForSwatchContainer();
    createAccordionSteps();
    setupAccordionStepAutoAdvance();
    setupSwatchImageSwap();
    updateSwiperFromSwatches();
    insertOrientationPlaceholder();
    wrapAccordionContent();
    
    document
      .querySelectorAll('input[name="Choose Material"]')
      .forEach((input) => {
        input.addEventListener("change", updateSizeOptions);
      });
    // When "Step 1" is changed, update materials
    document
      .querySelectorAll('input[name="Step 1: Choose Standard Template"]')
      .forEach((input) => {
        input.addEventListener(
          "change",
          updateMaterialOptionsBasedOnStandardTemplate,
        );
      });

    // Initial check in case already selected
    updateMaterialOptionsBasedOnStandardTemplate();
  }

  /** Wait for dynamic content if swatches not present yet */
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

  function updateMaterialOptionsBasedOnStandardTemplate() {
    const selectedRadio = document.querySelector(
      'input[type="radio"][name="Step 1: Choose Standard Template"]:checked',
    );
    if (!selectedRadio) {
      console.warn("No selection yet for Step 1");
      return;
    }

    const selectedValue = selectedRadio.value.trim();
    //console.log("Selected value:", selectedValue);

    // Find the variant-button container for 'Choose Material'
    const materialVariantButton = document.querySelector(
      'variant-button[data-option-name="Choose Material"]',
    );
    if (!materialVariantButton) {
      console.warn("Choose Material variant-button not found");
      return;
    }

    // Within that container, find all .m-product-option--node elements
    materialVariantButton
      .querySelectorAll(".m-product-option--node")
      .forEach((node) => {
        const value = node.getAttribute("data-value");
        if (selectedValue === "Brushed Silver" && value !== "ACP") {
          node.classList.add("m-product-option--node__unavailable");
        } else {
          node.classList.remove("m-product-option--node__unavailable");
        }
      });
  }

  function updateSizeOptions() {
    // Get the selected material radio input's value (trimmed)
    const selectedMaterial = document
      .querySelector('input[name="Choose Material"]:checked')
      ?.value?.trim();

    // Uncheck all size options on material change — reset size selection
    const sizeInputs = document.querySelectorAll('input[name="Choose Size"]');
    sizeInputs.forEach((input) => {
      input.checked = false;
    });

    // If no material selected, exit early
    if (!selectedMaterial) {
      return;
    }

    // Get all product variants from the global meta object
    const variants = window.meta?.product?.variants || [];

    // Build a set of valid sizes for the selected material
    const validSizes = new Set();

    variants.forEach((variant) => {
      if (!variant.public_title) return;

      // Split variant title like "Material / Size"
      const parts = variant.public_title.split(" / ").map((p) => p.trim());

      // Only process if exactly two parts: material and size
      if (parts.length !== 2) return;

      const [material, size] = parts;

      // Case-insensitive match of selected material to variant material
      if (material.toLowerCase() === selectedMaterial.toLowerCase()) {
        validSizes.add(size);
      }
    });

    // Select all size option nodes (assumed to have data-option-position="2")
    const sizeOptionNodes = document.querySelectorAll(
      'div.m-product-option--node[data-option-position="2"]',
    );

    sizeOptionNodes.forEach((node) => {
      const input = node.querySelector("input");
      const sizeValue = node.getAttribute("data-value")?.trim();

      if (!sizeValue || !input) return;

      if (validSizes.has(sizeValue)) {
        // Enable this size option
        node.classList.remove("m-product-option--node__unavailable");
        input.removeAttribute("disabled");
      } else {
        // Disable this size option
        node.classList.add("m-product-option--node__unavailable");
        input.setAttribute("disabled", "disabled");
      }
    });
  }
});
