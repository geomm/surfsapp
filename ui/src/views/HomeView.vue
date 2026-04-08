<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBeachStore } from '../stores/beachStore'
import type { Beach } from '../types/beach'
import { degreesToCompass } from '../utils/compass'
import { formatRelativeTime, isStale } from '../utils/time'
import { usePullToRefresh } from '../composables/usePullToRefresh'

const beachStore = useBeachStore()
const scrollRoot = ref<HTMLElement | null>(null)

const { isPulling, pullDistance, isRefreshing, trigger } = usePullToRefresh(scrollRoot, {
  threshold: 60,
  onRefresh: () => beachStore.fetchBeaches(),
})

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
      <div v-if="beachStore.loading" class="state">Loading…</div>

      <div v-else-if="beachStore.error" class="state">
        <p class="error">{{ beachStore.error }}</p>
        <surf-button @click="retry">Retry</surf-button>
      </div>

      <ul v-else class="beach-list">
        <li v-for="beach in beachStore.sortedBeaches" :key="beach.id" class="beach-item">
          <surf-card clickable>
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
                  <template v-if="beach.currentScore !== null">{{ beach.currentScore }}</template>
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
  </div>
</template>

<style scoped>
.home {
  font-family: var(--font-family-base);
  min-height: 100vh;
  background: var(--color-background);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  max-width: 600px;
  margin: 0 auto;
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.refresh-btn {
  background: transparent;
  border: none;
  padding: var(--space-2);
  cursor: pointer;
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.content {
  padding: 0 var(--space-4) var(--space-6);
  max-width: 600px;
  margin: 0 auto;
}

.state {
  padding: var(--space-6) 0;
  text-align: center;
  color: var(--color-text-secondary);
}

.error {
  color: var(--color-surf-poor);
  margin-bottom: var(--space-3);
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
</style>
