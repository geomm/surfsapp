<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBeachStore } from '../stores/beachStore'
import type { Beach } from '../types/beach'
import { degreesToCompass } from '../utils/compass'
import { formatRelativeTime, isStale } from '../utils/time'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { useInstallPrompt } from '../composables/useInstallPrompt'
import FilterSheet from '../components/FilterSheet.vue'

const beachStore = useBeachStore()
const router = useRouter()
const scrollRoot = ref<HTMLElement | null>(null)
const filterSheetOpen = ref(false)

function openBeach(b: Beach) {
  router.push({ name: 'beach-detail', params: { id: b.id } })
}

const { isPulling, pullDistance, isRefreshing, trigger } = usePullToRefresh(scrollRoot, {
  threshold: 60,
  onRefresh: () => beachStore.fetchBeaches(),
})

const { canInstall, promptInstall } = useInstallPrompt()

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

function hhmm(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function bestWindow(b: Beach): string | null {
  if (!b.bestWindowStart || !b.bestWindowEnd) return null
  return `Best: ${hhmm(b.bestWindowStart)}–${hhmm(b.bestWindowEnd)}`
}

onMounted(() => {
  beachStore.fetchBeaches()
})

function retry() {
  trigger()
}

function badgeVariant(beach: Beach): string {
  return beach.currentLabel ?? 'neutral'
}

function stalenessText(b: Beach): string {
  if (!b.lastUpdated) return 'No data yet'
  return formatRelativeTime(b.lastUpdated)
}

function stalenessWarn(b: Beach): boolean {
  return !!b.lastUpdated && isStale(b.lastUpdated, 6)
}

function isFavourite(b: Beach): boolean {
  return beachStore.favourites.has(b.id)
}

function toggleFav(b: Beach) {
  beachStore.toggleFavourite(b.id)
}
</script>

<template>
  <div ref="scrollRoot" class="home">
    <header class="header">
      <h1 class="title">surfsapp</h1>
      <button
        type="button"
        class="fav-filter-btn"
        :class="{ 'fav-filter-btn-on': beachStore.showFavouritesOnly }"
        :aria-label="beachStore.showFavouritesOnly ? 'Show all beaches' : 'Show favourites only'"
        :aria-pressed="beachStore.showFavouritesOnly"
        @click="beachStore.toggleFavouritesFilter()"
      >
        <surf-icon name="heart"></surf-icon>
      </button>
      <button
        type="button"
        class="filter-btn"
        aria-label="Open filters"
        @click="filterSheetOpen = true"
      >
        <surf-icon name="sliders-horizontal"></surf-icon>
        <span v-if="beachStore.activeFilterCount > 0" class="filter-badge" aria-hidden="true"></span>
      </button>
      <button
        v-if="canInstall"
        class="install-btn"
        type="button"
        aria-label="Install app"
        @click="promptInstall"
      >
        <surf-icon name="download"></surf-icon>
      </button>
      <button
        class="refresh-btn"
        :class="{ 'refresh-btn-spinning': isRefreshing }"
        type="button"
        aria-label="Refresh"
        :disabled="isRefreshing"
        @click="retry"
      >
        <surf-icon name="refresh-cw"></surf-icon>
      </button>
    </header>

    <div
      v-if="isPulling || isRefreshing"
      class="ptr-indicator"
      :class="{ 'ptr-spinning': isRefreshing }"
      :style="{ height: (isRefreshing ? 48 : pullDistance) + 'px' }"
    >
      <surf-icon name="refresh-cw"></surf-icon>
    </div>

    <main class="content">
      <ul
        v-if="beachStore.loading"
        class="beach-list skeleton-list"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading beaches"
      >
        <li v-for="n in 4" :key="'sk-' + n" class="beach-item">
          <div class="skeleton-card" aria-hidden="true">
            <div class="skeleton-card-head">
              <div class="skeleton-info">
                <div class="skeleton-bar sk-title"></div>
                <div class="skeleton-bar sk-region"></div>
              </div>
              <div class="skeleton-bar sk-badge"></div>
            </div>
            <div class="skeleton-bar sk-conditions"></div>
          </div>
        </li>
      </ul>

      <div v-else-if="beachStore.error" class="empty-state" role="alert">
        <surf-icon name="cloud-off" size="48"></surf-icon>
        <h2 class="empty-title">Can't load beaches</h2>
        <p class="empty-subtext">Check your connection and try again.</p>
        <p class="error-detail">{{ beachStore.error }}</p>
        <surf-button @click="retry">Retry</surf-button>
      </div>

      <div
        v-else-if="
          beachStore.showFavouritesOnly &&
          beachStore.selectedRegions.size === 0 &&
          beachStore.selectedDifficulties.size === 0 &&
          beachStore.displayedBeaches.length === 0
        "
        class="empty-state"
      >
        <surf-icon name="heart" size="48"></surf-icon>
        <h2 class="empty-title">No favourites yet</h2>
        <p class="empty-subtext">Tap the heart on any beach to save it here</p>
        <surf-button variant="secondary" @click="beachStore.toggleFavouritesFilter()">
          Show all beaches
        </surf-button>
      </div>

      <div
        v-else-if="
          beachStore.beaches.length > 0 &&
          beachStore.displayedBeaches.length === 0 &&
          beachStore.activeFilterCount > 0 &&
          (beachStore.selectedRegions.size > 0 || beachStore.selectedDifficulties.size > 0)
        "
        class="empty-state"
      >
        <surf-icon name="sliders-horizontal" size="48"></surf-icon>
        <h2 class="empty-title">No beaches match your filters</h2>
        <p class="empty-subtext">Try removing a filter or clearing them all</p>
        <surf-button variant="secondary" @click="beachStore.clearFilters()">
          Clear filters
        </surf-button>
      </div>

      <ul v-else class="beach-list">
        <li v-for="beach in beachStore.displayedBeaches" :key="beach.id" class="beach-item">
          <surf-card clickable @click="openBeach(beach)">
            <div class="card-body">
              <div class="card-head">
                <div class="beach-info">
                  <div class="beach-name">{{ beach.name }}</div>
                  <div class="beach-region">{{ beach.region }}</div>
                </div>
                <button
                  type="button"
                  class="fav-btn"
                  :class="{ 'fav-btn-on': isFavourite(beach) }"
                  :aria-label="isFavourite(beach) ? 'Unfavourite' : 'Favourite'"
                  :aria-pressed="isFavourite(beach)"
                  @click.stop="toggleFav(beach)"
                >
                  <surf-icon name="heart"></surf-icon>
                </button>
                <surf-badge :variant="badgeVariant(beach)">
                  <template v-if="beach.currentScore !== null">{{ beach.currentScore }}%</template>
                  <template v-else>No data</template>
                </surf-badge>
              </div>
              <div v-if="hasForecast(beach)" class="conditions">
                <span class="cond-item">
                  <surf-icon name="waves" size="16"></surf-icon>
                  <span>{{ swellText(beach) }}</span>
                </span>
                <span class="cond-item">
                  <surf-icon name="wind" size="16"></surf-icon>
                  <span>{{ windText(beach) }}</span>
                </span>
              </div>
              <div v-else class="no-forecast">No forecast data</div>
              <div v-if="bestWindow(beach)" class="best-window">{{ bestWindow(beach) }}</div>
              <div class="skill-tag">{{ beach.skillLevel }}</div>
              <div class="staleness" :class="{ 'staleness-warn': stalenessWarn(beach) }">
                {{ stalenessText(beach) }}
              </div>
            </div>
          </surf-card>
        </li>
      </ul>
    </main>

    <FilterSheet :open="filterSheetOpen" @close="filterSheetOpen = false" />
  </div>
</template>

<style scoped>
.home {
  font-family: var(--font-family-base);
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  padding-top: calc(var(--space-4) + env(safe-area-inset-top));
  padding-left: calc(var(--space-4) + env(safe-area-inset-left));
  padding-right: calc(var(--space-4) + env(safe-area-inset-right));
  max-width: 600px;
  margin: 0 auto;
}

@media all and (display-mode: standalone) {
  .header {
    padding-top: calc(var(--space-4) + env(safe-area-inset-top) + var(--space-2));
  }
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-ocean-800);
  margin: 0;
}

.refresh-btn {
  background: transparent;
  border: none;
  padding: var(--space-2);
  cursor: pointer;
  color: var(--color-ocean-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.install-btn {
  background: transparent;
  border: none;
  padding: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  color: var(--color-ocean-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fav-filter-btn {
  background: transparent;
  border: none;
  padding: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  margin-left: auto;
  cursor: pointer;
  color: var(--color-ocean-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fav-filter-btn-on {
  color: var(--color-surf-poor);
}

.filter-btn {
  position: relative;
  background: transparent;
  border: none;
  padding: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  color: var(--color-ocean-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.filter-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-surf-very-good);
}

.content {
  padding: 0 var(--space-4) var(--space-6);
  padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  max-width: 600px;
  margin: 0 auto;
}

.error-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.beach-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  position: relative;
}

.card-body .fav-btn {
  position: absolute;
  bottom: 0px;
  right: 0px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.beach-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.beach-region {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.conditions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.cond-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.no-forecast {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.best-window {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.skill-tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: capitalize;
}

.staleness {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.staleness-warn {
  color: var(--color-surf-maybe);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  min-height: 60vh;
  color: var(--color-text-secondary);
}

.empty-state surf-icon {
  color: var(--color-ocean-800);
}

.empty-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.empty-subtext {
  font-size: var(--font-size-sm);
  color: var(--color-ocean-800);
  margin: 0;
}

.fav-btn {
  background: transparent;
  border: none;
  padding: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  margin-left: auto;
  margin-right: 0px;
  border: 2px solid #cccccc54;
  border-radius: 8px;
}

.fav-btn-on {
  color: var(--color-surf-poor);
  font-weight: var(--font-weight-bold);
}

.ptr-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  overflow: hidden;
  transition: height 0.15s ease-out;
  max-width: 600px;
  margin: 0 auto;
}

.ptr-spinning surf-icon,
.refresh-btn-spinning surf-icon {
  animation: ptr-spin 0.8s linear infinite;
}

@keyframes ptr-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.refresh-btn[disabled] {
  cursor: default;
  opacity: 0.8;
}

.skeleton-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-bar {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--color-neutral-100) 0%,
    var(--color-neutral-200) 50%,
    var(--color-neutral-100) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s linear infinite;
}

.sk-title {
  width: 60%;
  height: 18px;
}

.sk-region {
  width: 40%;
}

.sk-badge {
  width: 56px;
  height: 24px;
  border-radius: 12px;
  flex: none;
}

.sk-conditions {
  width: 80%;
}

@keyframes skeleton-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-bar {
    animation: none;
    background: var(--color-neutral-100);
  }
}
</style>
