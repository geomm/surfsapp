import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

interface Options {
  threshold?: number
  maxDistance?: number
  onRefresh: () => void | Promise<void>
}

export function usePullToRefresh(
  target: Ref<HTMLElement | null>,
  { threshold = 60, maxDistance = 120, onRefresh }: Options,
) {
  const isPulling = ref(false)
  const pullDistance = ref(0)
  const isRefreshing = ref(false)

  let startY = 0
  let tracking = false

  function atTop(): boolean {
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0
  }

  function onTouchStart(e: TouchEvent) {
    if (isRefreshing.value) return
    if (!atTop()) return
    startY = e.touches[0].clientY
    tracking = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking || isRefreshing.value) return
    const dy = e.touches[0].clientY - startY
    if (dy <= 0) {
      isPulling.value = false
      pullDistance.value = 0
      return
    }
    // Dampen the pull
    const damped = Math.min(maxDistance, dy * 0.5)
    pullDistance.value = damped
    isPulling.value = damped > 0
  }

  async function onTouchEnd() {
    if (!tracking) return
    tracking = false
    const shouldRefresh = pullDistance.value >= threshold
    isPulling.value = false
    pullDistance.value = 0
    if (shouldRefresh) {
      isRefreshing.value = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    }
  }

  onMounted(() => {
    const el = target.value
    if (!el) return
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
  })

  onBeforeUnmount(() => {
    const el = target.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
  })

  async function trigger() {
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
      await onRefresh()
    } finally {
      isRefreshing.value = false
    }
  }

  return { isPulling, pullDistance, isRefreshing, trigger }
}
