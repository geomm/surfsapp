import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023'
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [192, 512]
    },
    assetName: (type, size) => {
      switch (type) {
        case 'transparent':
          return `pwa-${size.width}x${size.height}.png`
        case 'maskable':
          return `pwa-maskable-${size.width}x${size.height}.png`
        case 'apple':
          return `apple-touch-icon-${size.width}x${size.height}.png`
      }
    }
  },
  images: ['public/logo.svg']
})
