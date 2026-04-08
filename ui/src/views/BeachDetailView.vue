<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBeachStore } from '../stores/beachStore'
import { formatRelativeTime, isStale } from '../utils/time'
import { classifyReason } from '../utils/reasons'
import BeachMap from '../components/BeachMap.vue'

const route = useRoute()
const router = useRouter()
const beachStore = useBeachStore()

const beachId = computed(() => String(route.params.id))
const beach = computed(() => beachStore.selectedBeach)
const isFavourite = computed(() =>
  beach.value ? beachStore.favourites.has(beach.value.id) : false
)
const stalenessWarn = computed(() =>
  !!beach.value?.lastUpdated && isStale(beach.value.lastUpdated, 6)
)
const stalenessText = computed(() =>
  beach.value?.lastUpdated ? formatRelativeTime(beach.value.lastUpdated) : ''
)

const currentReasons = computed<string[]>(() => {
  const hourly = beachStore.selectedForecast?.hourlyForecasts
  return hourly && hourly.length > 0 ? hourly[0].reasons ?? [] : []
})

const currentScoreForClassify = computed(() => {
  const hourly = beachStore.selectedForecast?.hourlyForecasts
  if (hourly && hourly.length > 0) return hourly[0].surfScore ?? 0
  return beach.value?.currentScore ?? 0
})

const pros = computed(() =>
  currentReasons.value.filter((r) => classifyReason(r, currentScoreForClassify.value) === 'pro')
)
const cons = computed(() =>
  currentReasons.value.filter((r) => classifyReason(r, currentScoreForClassify.value) === 'con')
)

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

function retry() {
  beachStore.fetchBeachDetail(beachId.value)
}

function toggleFav() {
  if (beach.value) beachStore.toggleFavourite(beach.value.id)
}

onMounted(() => {
  beachStore.fetchBeachDetail(beachId.value)
})

onBeforeUnmount(() => {
  beachStore.clearSelectedBeach()
})
</script>

<template>
  <div class="detail">
    <header class="header">
      <button
        type="button"
        class="back-btn"
        aria-label="Back"
        @click="goBack"
      >
        <surf-icon name="arrow-left"></surf-icon>
      </button>
      <h1 class="title">{{ beachStore.selectedBeach?.name ?? '' }}</h1>
    </header>

    <main class="content">
      <div v-if="beachStore.detailLoading && !beachStore.selectedBeach" class="state">
        Loading…
      </div>

      <div v-else-if="beachStore.detailError" class="state">
        <p class="error">{{ beachStore.detailError }}</p>
        <surf-button @click="retry">Retry</surf-button>
      </div>

      <section v-else-if="beach" class="hero">
        <button
          type="button"
          class="fav-btn"
          :class="{ 'fav-btn-on': isFavourite }"
          :aria-label="isFavourite ? 'Unfavourite' : 'Favourite'"
          :aria-pressed="isFavourite"
          @click="toggleFav"
        >
          <surf-icon name="heart"></surf-icon>
        </button>
        <div class="hero-name">{{ beach.name }}</div>
        <div class="hero-region">{{ beach.region }}</div>
        <div class="score-row">
          <template v-if="beach.currentScore !== null">
            <span class="score-num">{{ beach.currentScore }}</span>
            <surf-badge :variant="beach.currentLabel ?? 'neutral'">
              {{ beach.currentLabel ?? '' }}
            </surf-badge>
          </template>
          <template v-else>
            <surf-badge variant="neutral">No data</surf-badge>
          </template>
        </div>
        <div
          v-if="beach.currentScore !== null"
          class="staleness"
          :class="{ 'staleness-warn': stalenessWarn }"
        >
          {{ stalenessText }}
        </div>
        <div v-else class="staleness">No data yet</div>
      </section>

      <surf-disclosure
        v-if="beach"
        class="reasons-disclosure"
        summary="Why this score"
      >
        <div v-if="currentReasons.length === 0" class="no-reasons">
          No detailed reasons available
        </div>
        <div v-else class="reason-groups">
          <div v-if="pros.length > 0" class="reason-group">
            <h3 class="reason-heading">Working for you</h3>
            <ul class="reason-list">
              <li v-for="(r, i) in pros" :key="'p' + i" class="reason-item">
                <span class="reason-icon reason-icon-pro">✓</span>
                <span>{{ r }}</span>
              </li>
            </ul>
          </div>
          <div v-if="cons.length > 0" class="reason-group">
            <h3 class="reason-heading">Working against you</h3>
            <ul class="reason-list">
              <li v-for="(r, i) in cons" :key="'c' + i" class="reason-item">
                <span class="reason-icon reason-icon-con">✕</span>
                <span>{{ r }}</span>
              </li>
            </ul>
          </div>
        </div>
      </surf-disclosure>

      <BeachMap
        v-if="beach"
        class="beach-map-wrap"
        :coords="beach.coords"
        :name="beach.name"
      />
    </main>
  </div>
</template>

<style scoped>
.detail {
  font-family: var(--font-family-base);
  min-height: 100vh;
  background: var(--color-background);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  max-width: 600px;
  margin: 0 auto;
}

.back-btn {
  background: transparent;
  border: none;
  padding: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-primary);
}

.title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
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

.hero {
  position: relative;
  padding: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.hero-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.hero-region {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.score-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.score-num {
  font-size: var(--font-size-2xl, var(--font-size-xl));
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1;
}

.fav-btn {
  position: absolute;
  top: var(--space-3);
  right: 0;
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
}

.staleness {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.staleness-warn {
  color: var(--color-surf-maybe);
}

.reasons-disclosure {
  display: block;
  margin-top: var(--space-4);
}

.beach-map-wrap {
  display: block;
  margin-top: var(--space-4);
}

.no-reasons {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.reason-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.reason-heading {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.reason-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.reason-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.reason-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25em;
  font-weight: var(--font-weight-bold);
}

.reason-icon-pro {
  color: var(--color-surf-very-good);
}

.reason-icon-con {
  color: var(--color-surf-poor);
}
</style>
