<script setup lang="ts">
import { useBeachStore } from '../stores/beachStore'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const beachStore = useBeachStore()

function capitalise(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function onSheetClose() {
  emit('close')
}

function onDone() {
  emit('close')
}
</script>

<template>
  <surf-bottom-sheet :open="open" title="Filters" @sheet-close="onSheetClose">
    <div class="filter-sheet">
      <section class="section">
        <h3 class="section-title">Region</h3>
        <ul v-if="beachStore.availableRegions.length > 0" class="options">
          <li v-for="region in beachStore.availableRegions" :key="region" class="option">
            <label class="row">
              <input
                type="checkbox"
                :checked="beachStore.selectedRegions.has(region)"
                @change="beachStore.toggleRegion(region)"
              />
              <span class="label">{{ region }}</span>
            </label>
          </li>
        </ul>
        <p v-else class="empty">No options available</p>
      </section>

      <section class="section">
        <h3 class="section-title">Difficulty</h3>
        <ul v-if="beachStore.availableDifficulties.length > 0" class="options">
          <li v-for="level in beachStore.availableDifficulties" :key="level" class="option">
            <label class="row">
              <input
                type="checkbox"
                :checked="beachStore.selectedDifficulties.has(level)"
                @change="beachStore.toggleDifficulty(level)"
              />
              <span class="label">{{ capitalise(level) }}</span>
            </label>
          </li>
        </ul>
        <p v-else class="empty">No options available</p>
      </section>

      <footer class="footer">
        <surf-button variant="secondary" @click="beachStore.clearFilters()">Clear all</surf-button>
        <surf-button variant="primary" @click="onDone">Done</surf-button>
      </footer>
    </div>
  </surf-bottom-sheet>
</template>

<style scoped>
.filter-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.options {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  padding: var(--space-2) 0;
  cursor: pointer;
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
}

.row input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.label {
  flex: 1;
}

.empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  padding: var(--space-2) 0;
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-neutral-100, rgba(0, 0, 0, 0.08));
}
</style>
