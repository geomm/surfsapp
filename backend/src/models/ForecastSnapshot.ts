import mongoose, { Schema } from 'mongoose'

export interface IHourlyForecast {
  timestamp: Date
  rawData: Record<string, unknown>
  surfScore: number
  label: 'poor' | 'maybe' | 'good' | 'very-good'
  reasons: string[]
  confidence: number
}

export interface IDailySummary {
  date: string
  bestWindowStart: string
  bestWindowEnd: string
  peakScore: number
  overallLabel: 'poor' | 'maybe' | 'good' | 'very-good'
}

export interface IForecastSnapshot {
  beachId: string
  fetchedAt: Date
  hourlyForecasts: IHourlyForecast[]
  dailySummaries: IDailySummary[]
}

const HourlyForecastSchema = new Schema<IHourlyForecast>(
  {
    timestamp: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed, required: true },
    surfScore: { type: Number, required: true },
    label: {
      type: String,
      required: true,
      enum: ['poor', 'maybe', 'good', 'very-good'],
    },
    reasons: { type: [String], required: true },
    confidence: { type: Number, required: true },
  },
  { _id: false }
)

const DailySummarySchema = new Schema<IDailySummary>(
  {
    date: { type: String, required: true },
    bestWindowStart: { type: String, required: true },
    bestWindowEnd: { type: String, required: true },
    peakScore: { type: Number, required: true },
    overallLabel: {
      type: String,
      required: true,
      enum: ['poor', 'maybe', 'good', 'very-good'],
    },
  },
  { _id: false }
)

export const ForecastSnapshotSchema = new Schema<IForecastSnapshot>({
  beachId: { type: String, required: true },
  fetchedAt: { type: Date, required: true },
  hourlyForecasts: { type: [HourlyForecastSchema], required: true },
  dailySummaries: { type: [DailySummarySchema], required: true },
})

ForecastSnapshotSchema.index({ beachId: 1 })
ForecastSnapshotSchema.index({ fetchedAt: -1 })

export const ForecastSnapshot = mongoose.model<IForecastSnapshot>(
  'ForecastSnapshot',
  ForecastSnapshotSchema
)
