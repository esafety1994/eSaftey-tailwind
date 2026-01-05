class AccordionTab extends HTMLElement {
  constructor() {
    super();
    this._onClick = this._onClick.bind(this);
  }

  connectedCallback() {
    this.header = this.querySelector('[data-header]');
    this.content = this.querySelector('[data-content]');
    this.icon = this.querySelector('[data-icon]');

    if (!this.header || !this.content) return;

    // ensure icon has transform utilities so rotate classes work
    if (this.icon && !this.icon.classList.contains('transform')) {
      this.icon.classList.add('transform');
    }

    // prepare content for height animation
    this.content.classList.add('overflow-hidden', 'transition-all');

    const isOpen = this.hasAttribute('open');
    this.header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      this.content.style.display = 'block';
      // allow natural height after opening transition
      requestAnimationFrame(() => {
        this.content.style.maxHeight = this.content.scrollHeight + 'px';
        const cleanup = () => {
          this.content.style.maxHeight = '';
          this.content.removeEventListener('transitionend', cleanup);
        };
        this.content.addEventListener('transitionend', cleanup);
      });
      if (this.icon) this.icon.classList.add('rotate-180');
    } else {
      this.content.style.display = 'none';
      this.content.style.maxHeight = '0px';
    }

    this.header.addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    if (this.header) this.header.removeEventListener('click', this._onClick);
  }

  _onClick() {
    const open = this.hasAttribute('open');
    if (open) this._close(); else this._open();
    this.toggleAttribute('open');
  }

  _open() {
    this.header.setAttribute('aria-expanded', 'true');
    if (this.icon) this.icon.classList.add('rotate-90');

    this.content.style.removeProperty('display');
    this.content.style.display = 'block';
    // from 0 to full height
    this.content.style.maxHeight = '0px';
    requestAnimationFrame(() => {
      this.content.style.maxHeight = this.content.scrollHeight + 'px';
    });
    const done = () => {
      this.content.style.removeProperty('max-height');
      this.content.removeEventListener('transitionend', done);
    };
    this.content.addEventListener('transitionend', done);
  }

  _close() {
    this.header.setAttribute('aria-expanded', 'false');
    if (this.icon) this.icon.classList.remove('rotate-90');

    // animate from current height to 0
    this.content.style.maxHeight = this.content.scrollHeight + 'px';
    requestAnimationFrame(() => {
      this.content.style.maxHeight = '0px';
    });
    const done = () => {
      this.content.style.display = 'none';
      this.content.style.removeProperty('max-height');
      this.content.removeEventListener('transitionend', done);
    };
    this.content.addEventListener('transitionend', done);
  }
}

customElements.define('accordion-tab', AccordionTab);
