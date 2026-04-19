<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useBeachStore } from '../stores/beachStore'
import type { Beach } from '../types/beach'
import ViewSwitcherFab from '../components/ViewSwitcherFab.vue'

const beachStore = useBeachStore()
const container = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
let markers: maplibregl.Marker[] = []
let beachesPlotted = false

function plotBeaches(beaches: Beach[]) {
  if (!map || beachesPlotted || beaches.length === 0) return
  const valid = beaches.filter(
    (b) => Number.isFinite(b.coords?.lat) && Number.isFinite(b.coords?.lon),
  )
  if (valid.length === 0) return

  for (const beach of valid) {
    const marker = new maplibregl.Marker()
      .setLngLat([beach.coords.lon, beach.coords.lat])
      .addTo(map)
    markers.push(marker)
  }

  const bounds = new maplibregl.LngLatBounds()
  for (const beach of valid) {
    bounds.extend([beach.coords.lon, beach.coords.lat])
  }
  map.fitBounds(bounds, { padding: 48, animate: false })
  beachesPlotted = true
}

onMounted(async () => {
  if (beachStore.beaches.length === 0) {
    beachStore.fetchBeaches()
  }

  if (!container.value) return
  map = new maplibregl.Map({
    container: container.value,
    style: 'https://demotiles.maplibre.org/style.json',
    center: [23.7275, 37.9838],
    zoom: 5,
  })

  map.on('load', () => {
    plotBeaches(beachStore.beaches)
  })
})

watch(
  () => beachStore.beaches,
  (beaches) => {
    if (map?.loaded()) {
      plotBeaches(beaches)
    } else if (map) {
      map.once('load', () => plotBeaches(beaches))
    }
  },
)

onBeforeUnmount(() => {
  for (const m of markers) m.remove()
  markers = []
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <main class="map-view">
    <div ref="container" class="map-canvas"></div>
    <ViewSwitcherFab />
  </main>
</template>

<style scoped>
.map-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.map-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
