import { LitElement, html } from 'lit'

class SurfTest extends LitElement {
  render() {
    return html`<p>Lit works</p>`
  }
}

customElements.define('surf-test', SurfTest)

declare global {
  interface HTMLElementTagNameMap {
    'surf-test': SurfTest
  }
}
