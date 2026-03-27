import { LitElement, html, css } from 'lit'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import {
  Waves,
  Heart,
  MapPin,
  Wind,
  Star,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide'

type IconNode = [string, Record<string, string>]

const ICONS: Record<string, IconNode[]> = {
  waves: Waves as unknown as IconNode[],
  heart: Heart as unknown as IconNode[],
  'map-pin': MapPin as unknown as IconNode[],
  wind: Wind as unknown as IconNode[],
  star: Star as unknown as IconNode[],
  'chevron-right': ChevronRight as unknown as IconNode[],
  'arrow-left': ArrowLeft as unknown as IconNode[],
  'refresh-cw': RefreshCw as unknown as IconNode[],
}

function buildSvgChildren(nodes: IconNode[]): string {
  return nodes
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return `<${tag} ${attrStr}/>`
    })
    .join('')
}

class SurfIcon extends LitElement {
  static properties = {
    name: { type: String },
    size: { type: Number },
    color: { type: String },
  }

  name = ''
  size = 24
  color = 'currentColor'

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      display: block;
    }
  `

  render() {
    const iconNodes = ICONS[this.name]
    if (!iconNodes) {
      if (this.name) {
        console.warn(`surf-icon: unknown icon "${this.name}"`)
      }
      return html``
    }

    return html`
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${this.size}"
        height="${this.size}"
        viewBox="0 0 24 24"
        fill="none"
        stroke="${this.color}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >${unsafeSVG(buildSvgChildren(iconNodes))}</svg>
    `
  }
}

customElements.define('surf-icon', SurfIcon)

declare global {
  interface HTMLElementTagNameMap {
    'surf-icon': SurfIcon
  }
}
