import { LitElement, html, css } from 'lit';

class SurfCard extends LitElement {
  static properties = {
    clickable: { type: Boolean },
    padding: { type: String },
  };

  declare clickable: boolean;
  declare padding: 'sm' | 'md' | 'lg';

  constructor() {
    super();
    this.clickable = false;
    this.padding = 'lg';
  }

  static styles = css`
    :host {
      display: block;
    }
    .card {
      background: var(--color-surface);
      border: 0px solid var(--color-border);
      border-radius: var(--space-2);
      box-shadow: rgb(0 0 0 / 27%) 0px 1px 3px;
      position: relative;
    }
    .card.padding-sm {
      padding: var(--space-3);
    }
    .card.padding-md {
      padding: var(--space-4);
    }
    .card.padding-lg {
      padding: var(--space-6);
    }
    .card.clickable {
      cursor: pointer;
      transition: box-shadow 150ms ease;
    }
    .card.clickable:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
  `;

  private handleClick() {
    if (this.clickable) {
      this.dispatchEvent(new CustomEvent('card-click', { bubbles: true, composed: true }));
    }
  }

  render() {
    const classes = `card padding-${this.padding}${this.clickable ? ' clickable' : ''}`;
    return html`
      <div class="${classes}" @click="${this.handleClick}">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('surf-card', SurfCard);

declare global {
  interface HTMLElementTagNameMap {
    'surf-card': SurfCard;
  }
}
