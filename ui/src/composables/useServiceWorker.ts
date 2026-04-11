import { useRegisterSW } from 'virtual:pwa-register/vue'

export function useServiceWorker() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error)
    },
  })

  return { needRefresh, updateServiceWorker }
}
