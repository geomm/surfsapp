import { LitElement, html, css } from 'lit'

class SurfDisclosure extends LitElement {
  static properties = {
    summary: { type: String },
    open: { type: Boolean, reflect: true },
  }

  declare summary: string
  declare open: boolean

  constructor() {
    super()
    this.summary = ''
    this.open = false
  }

  static styles = css`
    :host {
      display: block;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      min-height: 44px;
      padding: var(--space-3);
      font-size: var(--font-size-md);
      cursor: pointer;
      user-select: none;
    }
    .summary-text {
      flex: 1;
      font-weight: 500;
    }
    .chevron {
      display: inline-flex;
      transition: transform 200ms ease;
    }
    :host([open]) .chevron {
      transform: rotate(90deg);
    }
    .body {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height 200ms ease, opacity 200ms ease;
    }
    :host([open]) .body {
      max-height: 1000px;
      opacity: 1;
    }
    .body-inner {
      padding: var(--space-3);
      border-top: 1px solid var(--color-border);
    }
  `

  private toggle() {
    this.open = !this.open
    this.dispatchEvent(
      new CustomEvent('toggle', {
        detail: { open: this.open },
        bubbles: true,
        composed: true,
      }),
    )
  }

  render() {
    return html`
      <div class="header" @click="${this.toggle}">
        <span class="summary-text">
          <slot name="summary">${this.summary}</slot>
        </span>
        <span class="chevron">
          <surf-icon name="chevron-right" size="20"></surf-icon>
        </span>
      </div>
      <div class="body">
        <div class="body-inner">
          <slot></slot>
        </div>
      </div>
    `
  }
}

customElements.define('surf-disclosure', SurfDisclosure)

declare global {
  interface HTMLElementTagNameMap {
    'surf-disclosure': SurfDisclosure
  }
}
