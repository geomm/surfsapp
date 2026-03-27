import { Router, Request, Response } from 'express'
import { Beach } from '../models/Beach'
import { ForecastSnapshot } from '../models/ForecastSnapshot'

export const beachesRouter = Router()

// GET /beaches — list all beaches with current score
beachesRouter.get('/beaches', async (_req: Request, res: Response) => {
  const beaches = await Beach.find().lean().select('-_id -__v')

  const snapshots = await Promise.all(
    beaches.map((beach) =>
      ForecastSnapshot.findOne({ beachId: beach.id })
        .sort({ fetchedAt: -1 })
        .lean()
        .select('-_id -__v')
    )
  )

  const results = beaches
    .map((beach, i) => {
      const snapshot = snapshots[i]
      const firstForecast = snapshot?.hourlyForecasts?.[0]
      return {
        id: beach.id,
        name: beach.name,
        region: beach.region,
        coords: beach.coords,
        skillLevel: beach.skillLevel,
        tags: beach.tags,
        currentScore: firstForecast?.surfScore ?? null,
        currentLabel: firstForecast?.label ?? null,
        lastUpdated: snapshot?.fetchedAt ?? null,
      }
    })
    .sort((a, b) => {
      if (a.currentScore === null && b.currentScore === null) return 0
      if (a.currentScore === null) return 1
      if (b.currentScore === null) return -1
      return b.currentScore - a.currentScore
    })

  res.json(results)
})

// GET /beaches/:id — single beach full profile + current score
beachesRouter.get('/beaches/:id', async (req: Request, res: Response) => {
  const beach = await Beach.findOne({ id: req.params.id }).lean().select('-_id -__v')
  if (!beach) {
    res.status(404).json({ error: 'Beach not found' })
    return
  }

  const snapshot = await ForecastSnapshot.findOne({ beachId: req.params.id })
    .sort({ fetchedAt: -1 })
    .lean()
    .select('-_id -__v')

  const firstForecast = snapshot?.hourlyForecasts?.[0]
  res.json({
    ...beach,
    currentScore: firstForecast?.surfScore ?? null,
    currentLabel: firstForecast?.label ?? null,
    lastUpdated: snapshot?.fetchedAt ?? null,
  })
})

// GET /beaches/:id/forecast — latest ForecastSnapshot for a beach
beachesRouter.get('/beaches/:id/forecast', async (req: Request, res: Response) => {
  const beach = await Beach.findOne({ id: req.params.id }).lean()
  if (!beach) {
    res.status(404).json({ error: 'Beach not found' })
    return
  }

  const snapshot = await ForecastSnapshot.findOne({ beachId: req.params.id })
    .sort({ fetchedAt: -1 })
    .lean()
    .select('-_id -__v')

  if (!snapshot) {
    res.status(404).json({ error: 'No forecast data for this beach' })
    return
  }

  res.json(snapshot)
})
