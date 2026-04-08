import { connectDB } from '../db/connection'
import { Beach } from '../models/Beach'
import { ForecastSnapshot } from '../models/ForecastSnapshot'
import beachProfiles from '../data/beach_profiles.json'

const STUB_SCORES: Record<string, { score: number; label: 'poor' | 'maybe' | 'good' | 'very-good' }> = {
  'vouliagmeni-athens': { score: 42, label: 'maybe' },
  'mesachti-ikaria': { score: 71, label: 'good' },
  'langouvardos-filiatra': { score: 58, label: 'maybe' },
  'falasarna-crete': { score: 83, label: 'very-good' },
  'palaiohora-crete': { score: 35, label: 'poor' },
  'agios-georgios-naxos': { score: 61, label: 'good' },
  'kokkino-limanaki-rafina': { score: 48, label: 'maybe' },
  'kolimpithra-tinos': { score: 77, label: 'good' },
}

async function seed(): Promise<void> {
  await connectDB()

  // Upsert all beaches
  for (const beach of beachProfiles) {
    await Beach.findOneAndUpdate(
      { id: (beach as { id: string }).id },
      beach,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }
  console.log(`Seeded ${beachProfiles.length} beaches`)

  // Create stub ForecastSnapshots
  const now = new Date()
  const todayIso = now.toISOString().split('T')[0]
  let created = 0
  let skipped = 0

  for (const beach of beachProfiles) {
    const beachId = (beach as { id: string }).id
    const existing = await ForecastSnapshot.findOne({ beachId })
    if (existing) {
      skipped++
      continue
    }

    const stub = STUB_SCORES[beachId]
    await ForecastSnapshot.create({
      beachId,
      fetchedAt: now,
      hourlyForecasts: [
        {
          timestamp: now,
          rawData: {},
          surfScore: stub.score,
          label: stub.label,
          reasons: ['Stub data — real forecast available after Phase 4'],
          confidence: 1.0,
        },
      ],
      dailySummaries: [
        {
          date: todayIso,
          bestWindowStart: '00:00',
          bestWindowEnd: '23:00',
          peakScore: stub.score,
          overallLabel: stub.label,
        },
      ],
    })
    created++
  }

  console.log(`Created ${created} snapshots (${skipped} already existed)`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
