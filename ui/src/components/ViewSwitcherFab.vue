<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const isOnMap = computed(() => route.name === 'beach-map')
const iconName = computed(() => (isOnMap.value ? 'list' : 'map'))
const ariaLabel = computed(() =>
  isOnMap.value ? 'Open list view' : 'Open map view'
)

function handleClick() {
  if (isOnMap.value) {
    router.push('/')
  } else {
    router.push({ name: 'beach-map' })
  }
}
</script>

<template>
  <button
    type="button"
    class="view-switcher-fab"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <surf-icon :name="iconName" color="#ffffff"></surf-icon>
  </button>
</template>

<style scoped>
.view-switcher-fab {
  position: fixed;
  right: var(--space-4);
  right: calc(var(--space-4) + env(safe-area-inset-right));
  bottom: var(--space-4);
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-ocean-800);
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 900;
}

.view-switcher-fab:active {
  transform: scale(0.96);
}
</style>
