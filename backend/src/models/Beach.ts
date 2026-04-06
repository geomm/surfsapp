import mongoose, { Schema } from 'mongoose'

export interface IWindScoringLogic {
  type: 'wave-generating-onshore'
  swellGeneratingWind: {
    directionDeg: number
    directionLabel: string
    minSpeedKmh: number
    comment: string
  }
  qualityMultiplier: {
    triggerWind: string
    triggerDirectionDeg: number
    effect: 'increase' | 'decrease'
    comment: string
  }
  messinesspenalty: {
    triggerWind: string
    thresholdSpeedKmh: number
    effect: 'increase' | 'decrease'
    comment: string
  }
  optimalScenario: string
}

export interface IBeach {
  id: string
  name: string
  coords: { lat: number; lon: number }
  offshoreCoords?: { lat: number; lon: number }
  region: string
  description: string
  shorelineNormalDeg: number
  idealSwellDirection: [number, number]
  acceptableSwellDirection: [number, number]
  minSwellHeightM: number
  idealSwellHeightM: [number, number]
  minSwellPeriodS: number
  idealSwellPeriodS: [number, number]
  maxOnshoreWindKmh: number
  idealWindDescription: 'wave-generating-onshore' | 'offshore-or-light'
  windScoringLogic?: IWindScoringLogic
  weights: {
    swellDirection: number
    swellPeriod: number
    swellHeight: number
    wind: number
    tide: number
  }
  sheltered: boolean
  longPeriodSwellRefracts: boolean
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  notes?: string
}

export const BeachSchema = new Schema<IBeach>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    coords: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    offshoreCoords: {
      lat: { type: Number },
      lon: { type: Number },
    },
    region: { type: String, required: true },
    description: { type: String, required: true },
    shorelineNormalDeg: { type: Number, required: true },
    idealSwellDirection: { type: [Number], required: true },
    acceptableSwellDirection: { type: [Number], required: true },
    minSwellHeightM: { type: Number, required: true },
    idealSwellHeightM: { type: [Number], required: true },
    minSwellPeriodS: { type: Number, required: true },
    idealSwellPeriodS: { type: [Number], required: true },
    maxOnshoreWindKmh: { type: Number, required: true },
    idealWindDescription: {
      type: String,
      required: true,
      enum: ['wave-generating-onshore', 'offshore-or-light'],
    },
    windScoringLogic: {
      type: {
        type: String,
        enum: ['wave-generating-onshore'],
      },
      swellGeneratingWind: {
        directionDeg: { type: Number },
        directionLabel: { type: String },
        minSpeedKmh: { type: Number },
        comment: { type: String },
      },
      qualityMultiplier: {
        triggerWind: { type: String },
        triggerDirectionDeg: { type: Number },
        effect: { type: String, enum: ['increase', 'decrease'] },
        comment: { type: String },
      },
      messinesspenalty: {
        triggerWind: { type: String },
        thresholdSpeedKmh: { type: Number },
        effect: { type: String, enum: ['increase', 'decrease'] },
        comment: { type: String },
      },
      optimalScenario: { type: String },
    },
    weights: {
      swellDirection: { type: Number, required: true },
      swellPeriod: { type: Number, required: true },
      swellHeight: { type: Number, required: true },
      wind: { type: Number, required: true },
      tide: { type: Number, required: true },
    },
    sheltered: { type: Boolean, required: true },
    longPeriodSwellRefracts: { type: Boolean, required: true },
    skillLevel: {
      type: String,
      required: true,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    tags: { type: [String], required: true },
    notes: { type: String },
  },
  { _id: true }
)

export const Beach = mongoose.model<IBeach>('Beach', BeachSchema)
