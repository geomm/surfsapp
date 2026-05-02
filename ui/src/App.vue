<script setup lang="ts">
import { computed } from 'vue';
import { useOnlineStatus } from './composables/useOnlineStatus';
import { useServiceWorker } from './composables/useServiceWorker';

const { isOnline } = useOnlineStatus();
const { needRefresh, updateServiceWorker } = useServiceWorker();

const showOfflineBanner = computed(() => !isOnline.value);
const showUpdateBanner = computed(() => needRefresh.value && isOnline.value);
const showAnyBanner = computed(() => showOfflineBanner.value || showUpdateBanner.value);

function handleRefresh() {
  updateServiceWorker(true);
}
</script>

<template>
  <Transition name="banner">
    <div v-if="showOfflineBanner" class="offline-banner" role="status" aria-live="polite">
      You're offline — showing cached data
    </div>
  </Transition>
  <Transition name="banner">
    <div v-if="showUpdateBanner" class="update-banner" role="status" aria-live="polite">
      <span class="update-banner__text">New version available</span>
      <surf-button
        variant="secondary"
        size="sm"
        class="update-banner__button"
        @click="handleRefresh"
      >
        Refresh
      </surf-button>
    </div>
  </Transition>
  <div :class="['app-shell', { 'app-shell--banner': showAnyBanner }]">
    <RouterView />
  </div>
</template>

<style>
html {
  background-color: var(--color-surf-maybe);
  background:
    linear-gradient(
      180deg,
      rgb(from var(--color-surf-maybe) r g b / 0.45),
      rgb(from var(--color-ocean-500) r g b / 0.15)
    ),
    url('./assets/background-waves.jpg');
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-color: var(--bg-bottom-ocean-500-background-waves);
}
</style>

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

.update-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3, 0.75rem);
  background: var(--color-primary, #1a73e8);
  color: #ffffff;
  font-weight: 600;
  font-size: var(--font-size-sm, 0.875rem);
  padding: 0 var(--space-4, 1rem);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.update-banner__text {
  color: #ffffff;
}

.update-banner__button {
  --color-primary: #ffffff;
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
  transition:
    transform 200ms ease,
    opacity 200ms ease;
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
