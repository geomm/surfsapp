import { ref, onScopeDispose } from 'vue';

export function useOnlineStatus() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

  function handleOnline() {
    isOnline.value = true;
  }

  function handleOffline() {
    isOnline.value = false;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    onScopeDispose(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  }

  return { isOnline };
}
