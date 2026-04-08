<script setup lang="ts">
import { onMounted } from 'vue'
import { useBeachStore } from '../stores/beachStore'
import type { Beach } from '../types/beach'

const beachStore = useBeachStore()

onMounted(() => {
  beachStore.fetchBeaches()
})

function retry() {
  beachStore.fetchBeaches()
}

function badgeVariant(beach: Beach): string {
  return beach.currentLabel ?? 'neutral'
}
</script>

<template>
  <div class="home">
    <header class="header">
      <h1 class="title">surfsapp</h1>
      <button class="refresh-btn" type="button" aria-label="Refresh" @click="retry">
        <surf-icon name="refresh-cw"></surf-icon>
      </button>
    </header>

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
                <surf-badge :variant="badgeVariant(beach)">
                  <template v-if="beach.currentScore !== null">{{ beach.currentScore }}</template>
                  <template v-else>No data</template>
                </surf-badge>
              </div>
              <div class="skill-tag">{{ beach.skillLevel }}</div>
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

.skill-tag {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: capitalize;
}
</style>
