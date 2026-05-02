<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBeachStore } from '../stores/beachStore';
import { formatRelativeTime, isStale } from '../utils/time';
import { classifyReason } from '../utils/reasons';
import { degreesToCompass } from '../utils/compass';
import BeachMap from '../components/BeachMap.vue';
import ForecastStrip from '../components/ForecastStrip.vue';

const route = useRoute();
const router = useRouter();
const beachStore = useBeachStore();

const beachId = computed(() => String(route.params.id));
const beach = computed(() => beachStore.selectedBeach);
const isFavourite = computed(() =>
  beach.value ? beachStore.favourites.has(beach.value.id) : false,
);
const stalenessWarn = computed(
  () => !!beach.value?.lastUpdated && isStale(beach.value.lastUpdated, 6),
);
const stalenessText = computed(() =>
  beach.value?.lastUpdated ? formatRelativeTime(beach.value.lastUpdated) : '',
);

const currentReasons = computed<string[]>(() => {
  const first = beachStore.selectedForecast?.hourlyForecasts?.[0];
  return first?.reasons ?? [];
});

const currentScoreForClassify = computed(() => {
  const first = beachStore.selectedForecast?.hourlyForecasts?.[0];
  if (first) return first.surfScore ?? 0;
  return beach.value?.currentScore ?? 0;
});

const pros = computed(() =>
  currentReasons.value.filter((r) => classifyReason(r, currentScoreForClassify.value) === 'pro'),
);
const cons = computed(() =>
  currentReasons.value.filter((r) => classifyReason(r, currentScoreForClassify.value) === 'con'),
);

const currentRaw = computed<Record<string, number>>(
  () => beachStore.selectedForecast?.hourlyForecasts?.[0]?.rawData ?? {},
);

const todaySummary = computed(() => {
  const summaries = beachStore.selectedForecast?.dailySummaries;
  if (!summaries || summaries.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    summaries.find((d) => typeof d?.date === 'string' && d.date.startsWith(today)) ?? summaries[0]
  );
});

const hasForecast = computed(() => {
  const r = currentRaw.value;
  return (
    r.swell_wave_height != null &&
    r.swell_wave_period != null &&
    r.swell_wave_direction != null &&
    r.wind_speed_10m != null &&
    r.wind_direction_10m != null
  );
});

const swellText = computed(() => {
  const r = currentRaw.value;
  const h = r.swell_wave_height ?? 0;
  const p = r.swell_wave_period ?? 0;
  const d = r.swell_wave_direction ?? 0;
  return `${h.toFixed(1)}m · ${Math.round(p)}s · ${degreesToCompass(d)}`;
});

const windText = computed(() => {
  const r = currentRaw.value;
  const s = r.wind_speed_10m ?? 0;
  const d = r.wind_direction_10m ?? 0;
  return `${Math.round(s)} km/h ${degreesToCompass(d)}`;
});

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const bestWindowText = computed(() => {
  const t = todaySummary.value;
  if (!t?.bestWindowStart || !t?.bestWindowEnd) return null;
  return `Best: ${hhmm(t.bestWindowStart)}–${hhmm(t.bestWindowEnd)}`;
});

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
}

function retry() {
  beachStore.fetchBeachDetail(beachId.value);
}

function toggleFav() {
  if (beach.value) beachStore.toggleFavourite(beach.value.id);
}

onMounted(() => {
  beachStore.fetchBeachDetail(beachId.value);
});

onBeforeUnmount(() => {
  beachStore.clearSelectedBeach();
});
</script>

<template>
  <div class="detail">
    <header class="header">
      <button type="button" class="back-btn" aria-label="Back" @click="goBack">
        <surf-icon name="arrow-left"></surf-icon>
      </button>
      <h1 class="title">{{ beachStore.selectedBeach?.name ?? '' }}</h1>
    </header>

    <main class="content">
      <div
        v-if="beachStore.detailLoading && !beachStore.selectedBeach"
        class="skeleton-hero"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading beach"
      >
        <div class="skeleton-bar sk-name" aria-hidden="true"></div>
        <div class="skeleton-bar sk-region" aria-hidden="true"></div>
        <div class="skeleton-bar sk-score" aria-hidden="true"></div>
        <div class="skeleton-reasons" aria-hidden="true">
          <div class="skeleton-bar sk-reason-line"></div>
          <div class="skeleton-bar sk-reason-line sk-reason-line-short"></div>
          <div class="skeleton-bar sk-reason-line"></div>
        </div>
      </div>

      <div v-else-if="beachStore.detailError" class="empty-state" role="alert">
        <surf-icon name="cloud-off" size="48"></surf-icon>
        <h2 class="empty-title">Can't load this beach</h2>
        <p class="empty-subtext">Check your connection and try again.</p>
        <p class="error-detail">{{ beachStore.detailError }}</p>
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
        <!-- @NOTE: Commenting out the name below in order to test visualy ONLY th H1  -->
        <!-- <div class="hero-name">{{ beach.name }}</div> -->
        <div class="hero-region">{{ beach.region }}</div>
        <div class="score-row">
          <template v-if="beach.currentScore !== null">
            <span class="score-num">{{ beach.currentScore }}%</span>
            <surf-badge :variant="beach.currentLabel ?? 'neutral'">
              {{ beach.currentLabel ?? '' }}
            </surf-badge>
          </template>
          <template v-else>
            <surf-badge variant="neutral">No data</surf-badge>
          </template>
        </div>
        <div v-if="hasForecast" class="conditions">
          <span class="cond-item">
            <surf-icon name="waves" size="16"></surf-icon>
            <span>{{ swellText }}</span>
          </span>
          <span class="cond-item">
            <surf-icon name="wind" size="16"></surf-icon>
            <span>{{ windText }}</span>
          </span>
        </div>
        <div v-else-if="beach.currentScore !== null" class="no-forecast">No forecast data</div>
        <div v-if="bestWindowText" class="best-window">{{ bestWindowText }}</div>
        <div
          v-if="beach.currentScore !== null"
          class="staleness"
          :class="{ 'staleness-warn': stalenessWarn }"
        >
          {{ stalenessText }}
        </div>
        <div v-else class="staleness">No data yet</div>
      </section>

      <surf-disclosure v-if="beach" class="reasons-disclosure" summary="Why this score">
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

      <BeachMap v-if="beach" class="beach-map-wrap" :coords="beach.coords" :name="beach.name" />

      <ForecastStrip
        v-if="
          beach &&
          beachStore.selectedForecast &&
          beachStore.selectedForecast.dailySummaries.length > 0
        "
        class="forecast-strip-wrap"
        :daily-summaries="beachStore.selectedForecast.dailySummaries"
      />
    </main>
  </div>
</template>

<style scoped>
.detail {
  font-family: var(--font-family-base);
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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
  color: var(--color-ocean-800);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-ocean-800);
  margin: 0;
  letter-spacing: -1px;
}

.content {
  padding: 0 var(--space-4) var(--space-6);
  padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  max-width: 600px;
  margin: 0 auto;
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
  background-color: rgb(from var(--color-surface) r g b / 0.494);
  border-radius: var(--space-3);
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
  color: var(--color-text-secondary);
  margin: 0;
}

.error-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.hero {
  position: relative;
  padding: 0px 0px var(--space-4) 0;
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
  color: var(--color-text-primary);
  padding: var(--space-2) 0px 0px;
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

.conditions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  margin-top: var(--space-2);
}

.cond-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.no-forecast {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-2);
}

.best-window {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
}

.fav-btn {
  position: absolute;
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

.hero .fav-btn {
  color: var(--color-ocean-800);
}

.fav-btn-on,
.hero .fav-btn-on {
  color: var(--color-surf-poor);
}

.staleness {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
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

.forecast-strip-wrap {
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

.skeleton-hero {
  padding: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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

.sk-name {
  width: 60%;
  height: 24px;
}

.sk-region {
  width: 40%;
}

.sk-score {
  width: 30%;
  height: 28px;
  margin-top: var(--space-2);
}

.skeleton-reasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.sk-reason-line {
  width: 90%;
}

.sk-reason-line-short {
  width: 70%;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-bar {
    animation: none;
    background: var(--color-neutral-100);
  }
}
</style>
