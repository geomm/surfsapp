import { ref, onScopeDispose } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

function detectIos(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const iosDevice = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  const iPadOs = ua.includes('Mac') && 'ontouchend' in document
  return iosDevice || iPadOs
}

export function useInstallPrompt() {
  const canInstall = ref(false)
  const showIosGuide = ref(false)
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  const isStandalone =
    typeof window !== 'undefined' &&
    ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as NavigatorStandalone).standalone === true)

  const isIos = detectIos()

  if (isIos && !isStandalone) {
    canInstall.value = true
  }

  function handleBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    if (isStandalone) return
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  function handleAppInstalled() {
    deferredPrompt = null
    canInstall.value = false
    showIosGuide.value = false
  }

  async function promptInstall() {
    if (deferredPrompt) {
      const event = deferredPrompt
      deferredPrompt = null
      canInstall.value = false
      await event.prompt()
      await event.userChoice
      return
    }
    if (isIos && !isStandalone) {
      showIosGuide.value = true
    }
  }

  function dismissIosGuide() {
    showIosGuide.value = false
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    onScopeDispose(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    })
  }

  return { canInstall, promptInstall, showIosGuide, dismissIosGuide, isIos }
}
