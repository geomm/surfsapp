<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useBeachStore } from '../stores/beachStore'
import { db } from '../db'
import type { Beach } from '../types/beach'
import ViewSwitcherFab from '../components/ViewSwitcherFab.vue'

const beachStore = useBeachStore()
const container = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
let beachesPlotted = false
let hasPersistedCamera = false
let persistTimer: ReturnType<typeof setTimeout> | null = null

const BEACH_SOURCE_ID = 'beaches'
const BEACH_CIRCLE_LAYER = 'beach-markers'
const BEACH_LABEL_LAYER = 'beach-marker-labels'
const CLUSTER_CIRCLE_LAYER = 'beach-clusters'
const CLUSTER_COUNT_LAYER = 'beach-cluster-count'
const MAP_CENTER_KEY = 'mapCenter'
const MAP_ZOOM_KEY = 'mapZoom'
const PERSIST_DEBOUNCE_MS = 400

function isValidCenter(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'number' &&
    typeof v[1] === 'number' &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Math.abs(v[0]) <= 180 &&
    Math.abs(v[1]) <= 90
  )
}

function isValidZoom(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 24
}

type LabelKey = 'very-good' | 'good' | 'maybe' | 'poor' | 'neutral'
type ResolvedColors = Record<LabelKey, string> & { cluster: string }

function resolveLabelColors(): ResolvedColors {
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => {
    const v = styles.getPropertyValue(name).trim()
    return v.length > 0 ? v : fallback
  }
  return {
    'very-good': read('--color-surf-very-good', '#2d9e5f'),
    good: read('--color-surf-good', '#1a72c4'),
    maybe: read('--color-surf-maybe', '#d4a017'),
    poor: read('--color-surf-poor', '#c0392b'),
    neutral: read('--color-neutral-300', '#dee2e6'),
    cluster: read('--color-ocean-700', '#1a5a8a'),
  }
}

function toFeatureCollection(beaches: Beach[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = beaches
    .filter((b) => Number.isFinite(b.coords?.lat) && Number.isFinite(b.coords?.lon))
    .map((b) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [b.coords.lon, b.coords.lat] },
      properties: {
        id: b.id,
        name: b.name,
        region: b.region,
        label: b.currentLabel ?? 'neutral',
        score: b.currentScore,
        windSpeed: b.windSpeed ?? null,
        windDirection: b.windDirection ?? null,
        lastUpdated: b.lastUpdated,
      },
    }))
  return { type: 'FeatureCollection', features }
}

function addBeachLayers(mapInstance: maplibregl.Map, data: GeoJSON.FeatureCollection<GeoJSON.Point>) {
  const colors = resolveLabelColors()

  mapInstance.addSource(BEACH_SOURCE_ID, {
    type: 'geojson',
    data,
    cluster: true,
    clusterMaxZoom: 8,
    clusterRadius: 50,
  })

  mapInstance.addLayer({
    id: CLUSTER_CIRCLE_LAYER,
    type: 'circle',
    source: BEACH_SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': colors.cluster,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 30, 28],
    },
  })

  mapInstance.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: 'symbol',
    source: BEACH_SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 13,
      'text-font': ['Noto Sans Regular'],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#ffffff',
    },
  })

  mapInstance.addLayer({
    id: BEACH_CIRCLE_LAYER,
    type: 'circle',
    source: BEACH_SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 18,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-color': [
        'match',
        ['get', 'label'],
        'very-good', colors['very-good'],
        'good', colors.good,
        'maybe', colors.maybe,
        'poor', colors.poor,
        colors.neutral,
      ],
    },
  })

  mapInstance.addLayer({
    id: BEACH_LABEL_LAYER,
    type: 'symbol',
    source: BEACH_SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': [
        'case',
        ['!=', ['get', 'score'], null],
        ['to-string', ['get', 'score']],
        '—',
      ],
      'text-size': 13,
      'text-font': ['Noto Sans Regular'],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#ffffff',
    },
  })

  mapInstance.on('click', CLUSTER_CIRCLE_LAYER, (e) => {
    const features = mapInstance.queryRenderedFeatures(e.point, { layers: [CLUSTER_CIRCLE_LAYER] })
    const feature = features[0]
    if (!feature) return
    const clusterId = feature.properties?.cluster_id as number | undefined
    if (clusterId === undefined) return
    const source = mapInstance.getSource(BEACH_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source) return
    source.getClusterExpansionZoom(clusterId).then((zoom) => {
      if (feature.geometry.type !== 'Point') return
      mapInstance.easeTo({
        center: feature.geometry.coordinates as [number, number],
        zoom,
      })
    })
  })

  mapInstance.on('mouseenter', CLUSTER_CIRCLE_LAYER, () => {
    mapInstance.getCanvas().style.cursor = 'pointer'
  })
  mapInstance.on('mouseleave', CLUSTER_CIRCLE_LAYER, () => {
    mapInstance.getCanvas().style.cursor = ''
  })
}

function plotBeaches(beaches: Beach[]) {
  if (!map || beachesPlotted) return
  const data = toFeatureCollection(beaches)
  if (data.features.length === 0) return

  addBeachLayers(map, data)

  if (!hasPersistedCamera) {
    const bounds = new maplibregl.LngLatBounds()
    for (const feature of data.features) {
      bounds.extend(feature.geometry.coordinates as [number, number])
    }
    map.fitBounds(bounds, { padding: 48, animate: false })
  }
  beachesPlotted = true
}

function schedulePersistCamera() {
  if (!map) return
  if (persistTimer !== null) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    if (!map) return
    const center = map.getCenter()
    const zoom = map.getZoom()
    db.settings
      .put({ key: MAP_CENTER_KEY, value: [center.lng, center.lat] })
      .catch((err) => {
        console.error('Failed to persist mapCenter to IndexedDB', err)
      })
    db.settings.put({ key: MAP_ZOOM_KEY, value: zoom }).catch((err) => {
      console.error('Failed to persist mapZoom to IndexedDB', err)
    })
  }, PERSIST_DEBOUNCE_MS)
}

onMounted(async () => {
  if (beachStore.beaches.length === 0) {
    beachStore.fetchBeaches()
  }

  if (!container.value) return

  const [centerRec, zoomRec] = await Promise.all([
    db.settings.get(MAP_CENTER_KEY).catch(() => undefined),
    db.settings.get(MAP_ZOOM_KEY).catch(() => undefined),
  ])
  const centerVal = centerRec?.value
  const zoomVal = zoomRec?.value
  const persistedCenter = isValidCenter(centerVal) ? centerVal : null
  const persistedZoom = isValidZoom(zoomVal) ? zoomVal : null
  hasPersistedCamera = persistedCenter !== null && persistedZoom !== null

  if (!container.value) return
  map = new maplibregl.Map({
    container: container.value,
    style: 'https://demotiles.maplibre.org/style.json',
    center: hasPersistedCamera && persistedCenter ? persistedCenter : [23.7275, 37.9838],
    zoom: hasPersistedCamera && persistedZoom !== null ? persistedZoom : 5,
  })

  map.on('load', () => {
    plotBeaches(beachStore.beaches)
  })

  map.on('moveend', schedulePersistCamera)
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
  if (persistTimer !== null) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (map) {
    map.remove()
    map = null
  }
  beachesPlotted = false
  hasPersistedCamera = false
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
