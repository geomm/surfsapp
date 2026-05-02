import { LitElement, html, css } from 'lit';

class SurfBottomSheet extends LitElement {
  static properties = {
    open: { type: Boolean },
    title: { type: String },
  };

  declare open: boolean;
  declare title: string;

  constructor() {
    super();
    this.open = false;
    this.title = '';
  }

  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  static styles = css`
    :host {
      display: contents;
    }

    .backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 100;
    }
    .backdrop.visible {
      display: block;
    }

    .sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border-radius: 16px 16px 0 0;
      max-height: 85vh;
      overflow-y: auto;
      padding: var(--space-4);
      padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
      z-index: 101;
      transform: translateY(100%);
      transition: transform 250ms ease;
    }
    .sheet.open {
      transform: translateY(0);
    }

    .handle {
      width: 32px;
      height: 4px;
      background: var(--color-neutral-300);
      border-radius: 2px;
      margin: 0 auto var(--space-3);
    }

    .sheet-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      margin: 0 0 var(--space-3);
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this._keydownHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            this._dispatchClose();
          }
        };
        document.addEventListener('keydown', this._keydownHandler);
      } else {
        if (this._keydownHandler) {
          document.removeEventListener('keydown', this._keydownHandler);
          this._keydownHandler = null;
        }
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
  }

  private _dispatchClose() {
    this.dispatchEvent(new CustomEvent('sheet-close', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="backdrop${this.open ? ' visible' : ''}" @click="${this._dispatchClose}"></div>
      <div class="sheet${this.open ? ' open' : ''}">
        <div class="handle"></div>
        ${this.title ? html`<p class="sheet-title">${this.title}</p>` : ''}
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('surf-bottom-sheet', SurfBottomSheet);

declare global {
  interface HTMLElementTagNameMap {
    'surf-bottom-sheet': SurfBottomSheet;
  }
}
