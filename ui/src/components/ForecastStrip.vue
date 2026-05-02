<script setup lang="ts">
import type { DailySummary } from '../types/beach';
import { formatWeekday, formatDayOfMonth } from '../utils/time';

defineProps<{
  dailySummaries: DailySummary[];
}>();
</script>

<template>
  <div v-if="dailySummaries && dailySummaries.length > 0" class="strip">
    <surf-card v-for="day in dailySummaries" :key="day.date" padding="md" class="day-card">
      <div class="day-card-header">
        <div class="date-time">
          <div class="weekday">{{ formatWeekday(day.date) }}</div>
          <div class="dom">{{ formatDayOfMonth(day.date) }}</div>
        </div>
        <surf-badge :variant="day.overallLabel ?? 'neutral'">
          <template v-if="day.peakScore != null">{{ day.peakScore }}%</template>
        </surf-badge>
      </div>
      <div class="window">
        <template v-if="day.bestWindowStart && day.bestWindowEnd">
          {{ day.bestWindowStart }}–{{ day.bestWindowEnd }}
        </template>
        <template v-else>—</template>
      </div>
    </surf-card>
  </div>
  <div v-else class="empty">No forecast available</div>
</template>

<style scoped>
.strip {
  display: flex;
  overflow-x: auto;
  gap: var(--space-3);
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-2);
}

.day-card {
  min-width: 96px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: normal;
  gap: var(--space-1);
  padding-bottom: var(--space-3);
}

.day-card:last-child {
  padding-bottom: unset;
}

.day-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.date-time {
  display: flex;
  gap: var(--space-3);
}

.weekday {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.dom {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1;
}

.window {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-2) 0;
}
</style>
