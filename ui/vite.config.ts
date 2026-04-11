import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('surf-'),
        },
      },
    }),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'surfsapp',
        short_name: 'surfsapp',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
  },
})
