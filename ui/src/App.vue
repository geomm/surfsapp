<script setup lang="ts">
import { useOnlineStatus } from './composables/useOnlineStatus'

const { isOnline } = useOnlineStatus()
</script>

<template>
  <Transition name="banner">
    <div v-if="!isOnline" class="offline-banner" role="status" aria-live="polite">
      You're offline — showing cached data
    </div>
  </Transition>
  <div :class="['app-shell', { 'app-shell--banner': !isOnline }]">
    <RouterView />
  </div>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surf-maybe, #f59e0b);
  color: #ffffff;
  font-weight: 700;
  font-size: var(--font-size-sm, 0.875rem);
  text-align: center;
  padding: 0 var(--space-4, 1rem);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.app-shell {
  transition: padding-top 200ms ease;
  padding-top: 0;
}

.app-shell--banner {
  padding-top: 40px;
}

.banner-enter-active,
.banner-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}

.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.banner-enter-to,
.banner-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>
