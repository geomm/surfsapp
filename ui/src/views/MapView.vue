<script setup lang="ts">
import ViewSwitcherFab from '../components/ViewSwitcherFab.vue'
</script>

<template>
  <main class="map-view">
    <h1>Map</h1>
    <ViewSwitcherFab />
  </main>
</template>

<style scoped>
.map-view {
  font-family: var(--font-family-base);
  min-height: 100vh;
  padding: var(--space-4);
}
</style>
