<script setup lang="ts">
import { ref } from 'vue'

const sheetOpen = ref(false)
</script>

<template>
  <div class="preview">
    <h1>Component Library Preview</h1>

    <!-- surf-badge -->
    <section>
      <h2>surf-badge</h2>
      <div class="row">
        <div class="item">
          <span class="label">very-good / md</span>
          <surf-badge variant="very-good">Very Good</surf-badge>
        </div>
        <div class="item">
          <span class="label">good / md</span>
          <surf-badge variant="good">Good</surf-badge>
        </div>
        <div class="item">
          <span class="label">maybe / md</span>
          <surf-badge variant="maybe">Maybe</surf-badge>
        </div>
        <div class="item">
          <span class="label">poor / md</span>
          <surf-badge variant="poor">Poor</surf-badge>
        </div>
        <div class="item">
          <span class="label">neutral / md</span>
          <surf-badge variant="neutral">Neutral</surf-badge>
        </div>
      </div>
      <div class="row">
        <div class="item">
          <span class="label">very-good / sm</span>
          <surf-badge variant="very-good" size="sm">Very Good</surf-badge>
        </div>
        <div class="item">
          <span class="label">good / sm</span>
          <surf-badge variant="good" size="sm">Good</surf-badge>
        </div>
        <div class="item">
          <span class="label">maybe / sm</span>
          <surf-badge variant="maybe" size="sm">Maybe</surf-badge>
        </div>
        <div class="item">
          <span class="label">poor / sm</span>
          <surf-badge variant="poor" size="sm">Poor</surf-badge>
        </div>
        <div class="item">
          <span class="label">neutral / sm</span>
          <surf-badge variant="neutral" size="sm">Neutral</surf-badge>
        </div>
      </div>
    </section>

    <!-- surf-icon -->
    <section>
      <h2>surf-icon</h2>
      <div class="row">
        <div v-for="icon in ['waves','heart','map-pin','wind','star','chevron-right','arrow-left','refresh-cw']" :key="icon" class="item">
          <span class="label">{{ icon }} / 24</span>
          <surf-icon :name="icon" :size="24"></surf-icon>
        </div>
      </div>
      <div class="row">
        <div v-for="icon in ['waves','heart','map-pin','wind','star','chevron-right','arrow-left','refresh-cw']" :key="icon + '-32'" class="item">
          <span class="label">{{ icon }} / 32</span>
          <surf-icon :name="icon" :size="32"></surf-icon>
        </div>
      </div>
    </section>

    <!-- surf-button -->
    <section>
      <h2>surf-button</h2>
      <div v-for="variant in ['primary','secondary','ghost']" :key="variant" class="row">
        <div v-for="size in ['sm','md','lg']" :key="size" class="item">
          <span class="label">{{ variant }} / {{ size }}</span>
          <surf-button :variant="variant" :size="size">{{ variant }}</surf-button>
        </div>
      </div>
      <div class="row">
        <div class="item">
          <span class="label">primary / md / disabled</span>
          <surf-button variant="primary" :disabled="true">Disabled</surf-button>
        </div>
      </div>
    </section>

    <!-- surf-card -->
    <section>
      <h2>surf-card</h2>
      <div class="row">
        <div class="item">
          <span class="label">non-clickable</span>
          <surf-card style="width:200px">
            <p>This is a card with sample content.</p>
          </surf-card>
        </div>
        <div class="item">
          <span class="label">clickable</span>
          <surf-card clickable style="width:200px">
            <p>Hover me for shadow. Click me for event.</p>
          </surf-card>
        </div>
      </div>
    </section>

    <!-- surf-bottom-sheet -->
    <section>
      <h2>surf-bottom-sheet</h2>
      <surf-button @click="sheetOpen = true">Open Sheet</surf-button>
      <surf-bottom-sheet
        :open="sheetOpen"
        title="Filters"
        @sheet-close="sheetOpen = false"
      >
        <p>Sample sheet content goes here.</p>
        <surf-button @click="sheetOpen = false">Close</surf-button>
      </surf-bottom-sheet>
    </section>
  </div>
</template>

<style scoped>
.preview {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}
h1 {
  margin-bottom: 32px;
}
section {
  margin-bottom: 48px;
}
h2 {
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  align-items: flex-end;
}
.item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.label {
  font-size: 11px;
  color: #999;
}
</style>
