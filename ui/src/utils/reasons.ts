export type ReasonKind = 'pro' | 'con'

export function classifyReason(reason: string, score: number): ReasonKind {
  const trimmed = reason.trim()
  if (trimmed.startsWith('+')) return 'pro'
  if (trimmed.startsWith('-')) return 'con'
  const lower = trimmed.toLowerCase()
  if (/(ideal|good|favourable)/.test(lower)) return 'pro'
  if (/(too|wrong|off|weak)/.test(lower)) return 'con'
  return score >= 50 ? 'pro' : 'con'
}
