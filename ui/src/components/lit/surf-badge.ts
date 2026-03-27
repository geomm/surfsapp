import { LitElement, html, css } from 'lit'

class SurfBadge extends LitElement {
  static properties = {
    variant: { type: String },
    size: { type: String },
  }

  variant: 'very-good' | 'good' | 'maybe' | 'poor' | 'neutral' = 'neutral'
  size: 'sm' | 'md' = 'md'

  static styles = css`
    :host {
      display: inline-flex;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: var(--font-weight-semibold);
      white-space: nowrap;
    }
    .badge.size-sm {
      font-size: var(--font-size-xs);
      padding: var(--space-1) var(--space-2);
      border-radius: 4px;
    }
    .badge.size-md {
      font-size: var(--font-size-sm);
      padding: var(--space-1) var(--space-3);
      border-radius: 6px;
    }
    .badge.variant-very-good {
      background: var(--color-surf-very-good);
      color: white;
    }
    .badge.variant-good {
      background: var(--color-surf-good);
      color: white;
    }
    .badge.variant-maybe {
      background: var(--color-surf-maybe);
      color: var(--color-neutral-900);
    }
    .badge.variant-poor {
      background: var(--color-surf-poor);
      color: white;
    }
    .badge.variant-neutral {
      background: var(--color-neutral-200);
      color: var(--color-text-secondary);
    }
  `

  render() {
    return html`
      <span class="badge size-${this.size} variant-${this.variant}">
        <slot></slot>
      </span>
    `
  }
}

customElements.define('surf-badge', SurfBadge)

declare global {
  interface HTMLElementTagNameMap {
    'surf-badge': SurfBadge
  }
}
