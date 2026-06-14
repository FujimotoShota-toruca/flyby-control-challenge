export const standardMissionPreset = {
  id: "standard",
  title: "トリフネ フライバイ標準シナリオ",
  vInfKmPerSec: 5.25,
  displayVInf: "約5 km/s",
  tGoSec: 43_200,
  initialBYKm: 8,
  initialBZKm: -12,
  deltaVMinMps: -0.2,
  deltaVMaxMps: 0.2,
  deltaVStepMps: 0.01,
  dangerRadiusKm: 0.5,
  cautionRadiusKm: 1,
  observationPriorityRadiusKm: 2,
  recommendedMinRadiusKm: 2,
  recommendedMaxRadiusKm: 10,
  farRadiusKm: 30,
} as const;

export type MissionPreset = typeof standardMissionPreset;
