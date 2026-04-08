<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import maplibregl from 'maplibre-gl'

const props = defineProps<{
  coords: { lat: number; lon: number }
  name: string
}>()

const container = ref<HTMLDivElement | null>(null)
const failed = ref(false)
let map: maplibregl.Map | null = null

onMounted(() => {
  if (!container.value) return
  try {
    map = new maplibregl.Map({
      container: container.value,
      // MVP-only demo style. Swap for a proper hosted style in Phase 13.
      style: 'https://demotiles.maplibre.org/style.json',
      center: [props.coords.lon, props.coords.lat],
      zoom: 12,
    })
    const popup = new maplibregl.Popup({ offset: 24 }).setText(props.name)
    new maplibregl.Marker()
      .setLngLat([props.coords.lon, props.coords.lat])
      .setPopup(popup)
      .addTo(map)
  } catch (e) {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div v-if="failed" class="map-fallback">Map unavailable</div>
  <div v-else ref="container" class="beach-map"></div>
</template>

<style scoped>
.beach-map {
  width: 100%;
  height: 240px;
  border-radius: var(--radius-md, var(--space-2));
  overflow: hidden;
}

.map-fallback {
  width: 100%;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md, var(--space-2));
  background: var(--color-surface, transparent);
}
</style>
