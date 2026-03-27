import cron from 'node-cron'
import { fetchAllBeaches } from './services/forecastFetcher'

export function startScheduler(): void {
  const envHours = parseInt(process.env.FORECAST_INTERVAL_HOURS ?? '', 10)
  const hours = Number.isInteger(envHours) && envHours > 0 ? envHours : 6

  const cronExpression = `0 */${hours} * * *`
  cron.schedule(cronExpression, () => {
    fetchAllBeaches().catch((err: unknown) => {
      console.error('Scheduled forecast fetch failed:', err)
    })
  })

  console.log(`Scheduler started — fetching every ${hours}h`)
  fetchAllBeaches().catch((err: unknown) => {
    console.error('Initial forecast fetch failed:', err)
  })
}
