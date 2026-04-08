export function formatRelativeTime(dateString: string): string {
  const then = new Date(dateString).getTime()
  const diffMs = Date.now() - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Updated just now'
  if (diffMin < 60) return `Updated ${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Updated ${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `Updated ${diffD}d ago`
}

export function isStale(dateString: string, thresholdHours = 6): boolean {
  const diffMs = Date.now() - new Date(dateString).getTime()
  return diffMs > thresholdHours * 3600 * 1000
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatWeekday(dateString: string): string {
  const d = new Date(dateString)
  return WEEKDAYS[d.getDay()] ?? ''
}

export function formatDayOfMonth(dateString: string): string {
  const d = new Date(dateString)
  return String(d.getDate())
}
