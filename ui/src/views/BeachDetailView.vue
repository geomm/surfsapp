<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBeachStore } from '../stores/beachStore'

const route = useRoute()
const router = useRouter()
const beachStore = useBeachStore()

const beachId = computed(() => String(route.params.id))

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
</style>
