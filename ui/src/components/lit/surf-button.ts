import { LitElement, html, css } from 'lit';

class SurfButton extends LitElement {
  static properties = {
    variant: { type: String },
    size: { type: String },
    disabled: { type: Boolean },
    type: { type: String },
  };

  declare variant: 'primary' | 'secondary' | 'ghost';
  declare size: 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare type: 'button' | 'submit';

  constructor() {
    super();
    this.variant = 'primary';
    this.size = 'md';
    this.disabled = false;
    this.type = 'button';
  }

  static styles = css`
    :host {
      display: inline-flex;
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      font-family: inherit;
      font-weight: var(--font-weight-medium);
      transition:
        opacity 150ms ease,
        background 150ms ease,
        box-shadow 150ms ease;
      white-space: nowrap;
    }
    button:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    /* sizes */
    button.size-sm {
      height: var(--space-8);
      font-size: var(--font-size-sm);
      padding: 0 var(--space-3);
    }
    button.size-md {
      height: var(--space-10);
      font-size: var(--font-size-md);
      padding: 0 var(--space-4);
    }
    button.size-lg {
      height: var(--space-12);
      font-size: var(--font-size-lg);
      padding: 0 var(--space-6);
    }

    /* variants */
    button.variant-primary {
      background: var(--color-primary);
      color: white;
      border-radius: 8px;
    }
    button.variant-primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    button.variant-secondary {
      background: transparent;
      color: var(--color-ocean-800);
      border: 1px solid var(--color-ocean-800);
      border-radius: 8px;
    }
    button.variant-secondary:hover:not(:disabled) {
      background: var(--color-ocean-50);
    }

    button.variant-ghost {
      background: transparent;
      color: var(--color-text-secondary);
      border-radius: 8px;
    }
    button.variant-ghost:hover:not(:disabled) {
      background: var(--color-neutral-100);
    }
  `;

  render() {
    return html`
      <button
        part="button"
        class="variant-${this.variant} size-${this.size}"
        type="${this.type}"
        ?disabled="${this.disabled}"
      >
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('surf-button', SurfButton);

declare global {
  interface HTMLElementTagNameMap {
    'surf-button': SurfButton;
  }
}
