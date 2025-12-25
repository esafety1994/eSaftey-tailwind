class VariantPicker extends HTMLElement {
    constructor() {
        super();
    }

    get sectionId() {
        return this.dataset.sectionId;
    }

    connectedCallback() {
       this.variantSelector = this.querySelectorAll('input[type="radio"]');
       this.handleChange = this.onVariantChange.bind(this);

       this.variantSelector.forEach((selector) => {
           selector.addEventListener('change', this.handleChange);
       });
       // also update active label styles immediately when selection changes
       this.variantSelector.forEach((selector) => {
           selector.addEventListener('change', function () { updateActiveOptionStyles(); });
       });
    }

    disconnectedCallback() {
        this.variantSelector.forEach((selector) => {
           selector.removeEventListener('change', this.handleChange);
       });
    };
    onVariantChange(event) {
        const input = event.currentTarget;
        const url = `${window.location.pathname}?variant=${input.value}&section_id=${this.sectionId}`;
        const target = document.querySelector('.product-container');
        // show loading overlay + fade
        if (target) {
            target.classList.add('is-loading');
            if (!target.querySelector('.product-loading-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'product-loading-overlay';
                overlay.innerHTML = '<div class="spinner"></div>';
                target.appendChild(overlay);
            }
        }

        fetch(url)
            .then((response) => response.text())
            .then((html) => { 
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const newContent = tempDiv.querySelector('.product-container');
                if (newContent && target) {
                    // perform a smooth replacement: fade out already done via CSS; replace content then fade in
                    target.innerHTML = newContent.innerHTML;
                    try { document.dispatchEvent(new Event('product:content:replaced')); } catch (e) {}
                    // remove loading state after a short delay to allow re-init
                    setTimeout(function () {
                        if (target) {
                            target.classList.remove('is-loading');
                            const ov = target.querySelector('.product-loading-overlay');
                            if (ov) ov.parentNode.removeChild(ov);
                        }
                    }, 120);
                } else {
                    console.warn('VariantPicker: product-container not found in response or on page');
                    if (target) {
                        target.classList.remove('is-loading');
                        const ov = target.querySelector('.product-loading-overlay');
                        if (ov) ov.parentNode.removeChild(ov);
                    }
                }
                const newUrl = new URL(url, window.location.origin);
                newUrl.searchParams.delete('section_id');
                window.history.pushState({}, '', newUrl.toString());
            })
            .catch((error) => {
                console.error('Error fetching variant data:', error);
                if (target) {
                    target.classList.remove('is-loading');
                    const ov = target.querySelector('.product-loading-overlay');
                    if (ov) ov.parentNode.removeChild(ov);
                }
            });
        console.log('Selected Variant ID:', url);
    }
}

customElements.define('variant-picker', VariantPicker);

// Toggle Tailwind classes on labels for checked radio inputs so active option
// visually matches hover styles (uses existing Tailwind classes).
function updateActiveOptionStyles() {
    try {
        document.querySelectorAll('.product-container input[type="radio"]').forEach(function (input) {
            var lbl = document.querySelector('label[for="' + input.id + '"]');
            if (!lbl) return;
            // Toggle a high-specificity class to enforce the active border
            if (input.checked) {
                lbl.classList.add('swatch-active');
                lbl.classList.add('scale-110');
                lbl.classList.add('shadow-lg');
            } else {
                lbl.classList.remove('swatch-active');
                lbl.classList.remove('scale-110');
                lbl.classList.remove('shadow-lg');
            }
        });
    } catch (e) { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', updateActiveOptionStyles);
document.addEventListener('product:content:replaced', updateActiveOptionStyles);