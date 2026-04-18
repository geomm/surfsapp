import { ref, onScopeDispose } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function useInstallPrompt() {
  const canInstall = ref(false)
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  const isStandalone =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(display-mode: standalone)').matches

  function handleBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    if (isStandalone) return
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  function handleAppInstalled() {
    deferredPrompt = null
    canInstall.value = false
  }

  async function promptInstall() {
    if (!deferredPrompt) return
    const event = deferredPrompt
    deferredPrompt = null
    canInstall.value = false
    await event.prompt()
    await event.userChoice
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    onScopeDispose(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    })
  }

  return { canInstall, promptInstall }
}
