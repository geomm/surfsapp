import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.scss'
import 'maplibre-gl/dist/maplibre-gl.css'
import './components/lit/index'
import { useBeachStore } from './stores/beachStore'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(router)

// Hydrate favourites from IndexedDB before mounting so the first render
// reflects persisted state and HomeView's fetchBeaches sees them.
const beachStore = useBeachStore(pinia)
beachStore.hydrateFavourites().finally(() => {
  app.mount('#app')
})
