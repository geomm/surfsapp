<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useBeachStore } from '../stores/beachStore'
import { db } from '../db'
import type { Beach } from '../types/beach'
import { degreesToCompass } from '../utils/compass'
import { formatRelativeTime } from '../utils/time'
import ViewSwitcherFab from '../components/ViewSwitcherFab.vue'
import { useOnlineStatus } from '../composables/useOnlineStatus'

const beachStore = useBeachStore()
const router = useRouter()
const { isOnline } = useOnlineStatus()
const container = ref<HTMLDivElement | null>(null)
const selectedBeach = ref<Beach | null>(null)
const sheetOpen = ref(false)
const locating = ref(false)
const locateError = ref(false)
const windOverlayOn = ref(false)
let map: maplibregl.Map | null = null
let beachesPlotted = false
let hasPersistedCamera = false
let persistTimer: ReturnType<typeof setTimeout> | null = null
let locateErrorTimer: ReturnType<typeof setTimeout> | null = null
let arrowImage: HTMLImageElement | null = null
let userLocationMarker: maplibregl.Marker | null = null

const BEACH_SOURCE_ID = 'beaches'
const BEACH_CIRCLE_LAYER = 'beach-markers'
const BEACH_LABEL_LAYER = 'beach-marker-labels'
const CLUSTER_CIRCLE_LAYER = 'beach-clusters'
const CLUSTER_COUNT_LAYER = 'beach-cluster-count'
const WIND_ARROW_LAYER = 'beach-wind-arrows'
const ARROW_IMAGE_ID = 'arrow'
const MAP_CENTER_KEY = 'mapCenter'
const MAP_ZOOM_KEY = 'mapZoom'
const WIND_OVERLAY_KEY = 'mapWindOverlay'
const PERSIST_DEBOUNCE_MS = 400

// Upward-pointing arrow (north) baseline. windDirection is meteorological: the bearing
// wind is coming FROM (e.g. 0° = northerly wind, blowing southward). The arrow should
// show where the wind is going, so we rotate by windDirection + 180° — an N wind (0°)
// then points down (180°) toward the south.
const ARROW_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
  '<path d="M20 4 L32 30 L20 24 L8 30 Z" fill="#1a5a8a" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>' +
  '</svg>'
const ARROW_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(ARROW_SVG)}`

function loadArrowImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(40, 40)
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load wind arrow image'))
    img.src = ARROW_DATA_URL
  })
}

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
    .map((b) => {
      const properties: Record<string, unknown> = {
        id: b.id,
        name: b.name,
        region: b.region,
        label: b.currentLabel ?? 'neutral',
        score: b.currentScore,
        lastUpdated: b.lastUpdated,
      }
      // Omit wind props when null so ['has', 'windSpeed'/'windDirection'] filter
      // correctly excludes features without forecast data from the wind-arrow layer.
      if (b.windSpeed != null) properties.windSpeed = b.windSpeed
      if (b.windDirection != null) properties.windDirection = b.windDirection
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [b.coords.lon, b.coords.lat] },
        properties,
      }
    })
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

  mapInstance.on('click', BEACH_CIRCLE_LAYER, (e) => {
    const feature = e.features?.[0]
    if (!feature) return
    const beachId = feature.properties?.id
    if (typeof beachId !== 'string') return
    const beach = beachStore.beaches.find((b) => b.id === beachId)
    if (!beach) return
    selectedBeach.value = beach
    sheetOpen.value = true
  })

  mapInstance.on('mouseenter', BEACH_CIRCLE_LAYER, () => {
    mapInstance.getCanvas().style.cursor = 'pointer'
  })
  mapInstance.on('mouseleave', BEACH_CIRCLE_LAYER, () => {
    mapInstance.getCanvas().style.cursor = ''
  })

  if (arrowImage && !mapInstance.hasImage(ARROW_IMAGE_ID)) {
    mapInstance.addImage(ARROW_IMAGE_ID, arrowImage)
  }
  if (mapInstance.hasImage(ARROW_IMAGE_ID)) {
    mapInstance.addLayer({
      id: WIND_ARROW_LAYER,
      type: 'symbol',
      source: BEACH_SOURCE_ID,
      filter: ['all', ['!', ['has', 'point_count']], ['has', 'windSpeed'], ['has', 'windDirection']],
      layout: {
        'icon-image': ARROW_IMAGE_ID,
        'icon-rotate': ['+', ['get', 'windDirection'], 180],
        'icon-size': ['interpolate', ['linear'], ['get', 'windSpeed'], 0, 0.5, 30, 1.0],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-offset': [0, -28],
        visibility: windOverlayOn.value ? 'visible' : 'none',
      },
      paint: {
        'icon-opacity': 0.85,
      },
    })
  }
}

function hasForecast(b: Beach): boolean {
  return (
    b.swellHeight != null &&
    b.swellPeriod != null &&
    b.swellDirection != null &&
    b.windSpeed != null &&
    b.windDirection != null
  )
}

function swellText(b: Beach): string {
  return `${(b.swellHeight as number).toFixed(1)}m · ${Math.round(b.swellPeriod as number)}s · ${degreesToCompass(b.swellDirection as number)}`
}

function windText(b: Beach): string {
  return `${Math.round(b.windSpeed as number)} km/h ${degreesToCompass(b.windDirection as number)}`
}

const selectedBadgeVariant = computed(() => selectedBeach.value?.currentLabel ?? 'neutral')
const selectedStaleness = computed(() => {
  const b = selectedBeach.value
  if (!b?.lastUpdated) return 'No data yet'
  return formatRelativeTime(b.lastUpdated)
})

function onSheetClose() {
  sheetOpen.value = false
  selectedBeach.value = null
}

function openSelectedDetail() {
  const b = selectedBeach.value
  if (!b) return
  sheetOpen.value = false
  router.push({ name: 'beach-detail', params: { id: b.id } })
}

function backToList() {
  router.push('/')
}

function showLocateError() {
  locateError.value = true
  if (locateErrorTimer !== null) clearTimeout(locateErrorTimer)
  locateErrorTimer = setTimeout(() => {
    locateError.value = false
    locateErrorTimer = null
  }, 4000)
}

function toggleWindOverlay() {
  windOverlayOn.value = !windOverlayOn.value
  if (map && map.getLayer(WIND_ARROW_LAYER)) {
    map.setLayoutProperty(WIND_ARROW_LAYER, 'visibility', windOverlayOn.value ? 'visible' : 'none')
  }
  db.settings.put({ key: WIND_OVERLAY_KEY, value: windOverlayOn.value }).catch((err) => {
    console.error('Failed to persist wind overlay state', err)
  })
}

function handleLocateMe() {
  if (locating.value) return
  if (!navigator.geolocation) {
    showLocateError()
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false
      if (!map) return
      const { longitude, latitude } = position.coords
      if (userLocationMarker) {
        userLocationMarker.setLngLat([longitude, latitude])
      } else {
        const el = document.createElement('div')
        el.setAttribute(
          'style',
          [
            'width: 18px',
            'height: 18px',
            'border-radius: 50%',
            'background: #1a73e8',
            'border: 3px solid #ffffff',
            'box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.35), 0 1px 3px rgba(0, 0, 0, 0.3)',
            'box-sizing: border-box',
          ].join(';'),
        )
        userLocationMarker = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(map)
      }
      map.easeTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 11),
      })
    },
    () => {
      locating.value = false
      showLocateError()
    },
    { timeout: 10000 },
  )
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

  const [centerRec, zoomRec, windRec, loadedArrow] = await Promise.all([
    db.settings.get(MAP_CENTER_KEY).catch(() => undefined),
    db.settings.get(MAP_ZOOM_KEY).catch(() => undefined),
    db.settings.get(WIND_OVERLAY_KEY).catch(() => undefined),
    loadArrowImage().catch(() => null),
  ])
  const centerVal = centerRec?.value
  const zoomVal = zoomRec?.value
  const persistedCenter = isValidCenter(centerVal) ? centerVal : null
  const persistedZoom = isValidZoom(zoomVal) ? zoomVal : null
  hasPersistedCamera = persistedCenter !== null && persistedZoom !== null
  windOverlayOn.value = typeof windRec?.value === 'boolean' ? windRec.value : false
  arrowImage = loadedArrow

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
  if (locateErrorTimer !== null) {
    clearTimeout(locateErrorTimer)
    locateErrorTimer = null
  }
  if (userLocationMarker) {
    userLocationMarker.remove()
    userLocationMarker = null
  }
  if (map) {
    map.remove()
    map = null
  }
  beachesPlotted = false
  hasPersistedCamera = false
  arrowImage = null
  locating.value = false
  locateError.value = false
})
</script>

<template>
  <main class="map-view">
    <div ref="container" class="map-canvas"></div>
    <div v-if="!isOnline" class="offline-map-banner" role="status" aria-live="polite">
      <p class="offline-map-banner__text">
        Map needs internet — tiles won't load. Your cached beach data is still available on the list view.
      </p>
      <surf-button variant="secondary" size="sm" class="offline-map-banner__button" @click="backToList">
        Back to list
      </surf-button>
    </div>
    <button
      type="button"
      class="locate-btn"
      :class="{ 'locate-btn--locating': locating }"
      :aria-busy="locating"
      aria-label="Centre map on my location"
      @click="handleLocateMe"
    >
      <surf-icon name="locate-fixed" :size="20"></surf-icon>
    </button>
    <button
      type="button"
      class="wind-btn"
      :class="{ 'wind-btn--active': windOverlayOn }"
      :aria-pressed="windOverlayOn"
      aria-label="Toggle wind direction overlay"
      @click="toggleWindOverlay"
    >
      <surf-icon name="wind" :size="20"></surf-icon>
    </button>
    <div v-if="locateError" class="locate-error" role="status" aria-live="polite">
      Can't access your location
    </div>
    <ViewSwitcherFab />
    <surf-bottom-sheet :open="sheetOpen" @sheet-close="onSheetClose">
      <div v-if="selectedBeach" class="preview">
        <div class="preview-head">
          <div class="preview-info">
            <h2 class="preview-name">{{ selectedBeach.name }}</h2>
            <p class="preview-region">{{ selectedBeach.region }}</p>
          </div>
          <surf-badge :variant="selectedBadgeVariant">
            <template v-if="selectedBeach.currentScore !== null">{{ selectedBeach.currentScore }}%</template>
            <template v-else>No data</template>
          </surf-badge>
        </div>
        <div v-if="hasForecast(selectedBeach)" class="preview-conditions">
          <span class="preview-cond">
            <surf-icon name="waves" size="16"></surf-icon>
            <span>{{ swellText(selectedBeach) }}</span>
          </span>
          <span class="preview-cond">
            <surf-icon name="wind" size="16"></surf-icon>
            <span>{{ windText(selectedBeach) }}</span>
          </span>
        </div>
        <div v-else class="preview-no-forecast">No forecast data</div>
        <p class="preview-staleness">{{ selectedStaleness }}</p>
        <div class="preview-footer">
          <surf-button variant="primary" @click="openSelectedDetail">View details</surf-button>
        </div>
      </div>
    </surf-bottom-sheet>
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

.offline-map-banner {
  position: absolute;
  top: 0;
  top: env(safe-area-inset-top);
  left: 0;
  right: 0;
  z-index: 850;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  background: var(--color-surf-maybe);
  color: #ffffff;
  padding: var(--space-3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.offline-map-banner__text {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  flex: 1;
}

.offline-map-banner__button {
  flex-shrink: 0;
}

.locate-btn {
  position: absolute;
  top: var(--space-3);
  top: calc(var(--space-3) + env(safe-area-inset-top));
  right: var(--space-3);
  right: calc(var(--space-3) + env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid var(--color-ocean-800);
  color: var(--color-ocean-800);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 800;
}

.locate-btn:active {
  transform: scale(0.96);
}

.locate-btn--locating {
  pointer-events: none;
}

.locate-btn--locating surf-icon {
  opacity: 0.5;
}

.wind-btn {
  position: absolute;
  top: calc(var(--space-3) + env(safe-area-inset-top) + 52px);
  right: var(--space-3);
  right: calc(var(--space-3) + env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid var(--color-ocean-800);
  color: var(--color-ocean-800);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 800;
}

.wind-btn:active {
  transform: scale(0.96);
}

.wind-btn--active {
  background: var(--color-ocean-800);
  color: #ffffff;
}

.locate-error {
  position: absolute;
  top: calc(var(--space-3) + env(safe-area-inset-top) + 104px);
  right: calc(var(--space-3) + env(safe-area-inset-right));
  background: var(--color-surf-maybe);
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md, 6px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 800;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.preview-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.preview-region {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.preview-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.preview-cond {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.preview-no-forecast {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.preview-staleness {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.preview-footer {
  display: flex;
  padding-top: var(--space-2);
}

.preview-footer surf-button {
  display: block;
  width: 100%;
}

.preview-footer surf-button::part(button) {
  width: 100%;
}
</style>
