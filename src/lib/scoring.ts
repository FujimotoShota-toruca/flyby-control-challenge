import type { FlybyResult } from "./flybyModel";
import type { MissionPreset } from "./missionPresets";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type ScoreBreakdown = {
  scientificValue: number;
  safety: number;
  rawTotal: number;
  unsafeCapApplied: boolean;
  total: number;
};

function meanPotential(
  distribution: FlybyResult["distribution"],
  potential: (distanceKm: number) => number,
): number {
  return distribution.reduce(
    (sum, point) => sum + potential(Math.hypot(point.yKm, point.zKm)),
    0,
  ) / distribution.length;
}

export function scientificValuePotential(distanceKm: number, collisionRadiusKm = 0.42): number {
  if (distanceKm < collisionRadiusKm) return 0;
  const distanceFromBest = distanceKm - 1;
  return Math.exp(-(distanceFromBest ** 2) / (2 * 2.5 ** 2));
}

export function safetyPotential(distanceKm: number, preset: MissionPreset): number {
  const normalizedDistance = clamp(
    (distanceKm - preset.dangerRadiusKm)
      / (preset.safeObservationMinRadiusKm - preset.dangerRadiusKm),
    0,
    1,
  );
  return normalizedDistance ** 2 * (3 - 2 * normalizedDistance);
}

export function calculateDistributionScores(
  distribution: FlybyResult["distribution"],
  preset: MissionPreset,
): Pick<ScoreBreakdown, "scientificValue" | "safety"> {
  return {
    scientificValue: 50 * meanPotential(
      distribution,
      (distance) => scientificValuePotential(distance, preset.asteroidMaxRadiusKm),
    ),
    safety: 50 * meanPotential(distribution, (distance) => safetyPotential(distance, preset)),
  };
}

export function calculateScores(
  flyby: FlybyResult,
  preset: MissionPreset,
): ScoreBreakdown {
  const { scientificValue, safety } = calculateDistributionScores(flyby.distribution, preset);
  const rawTotal = scientificValue + safety;
  const unsafeCapApplied = flyby.threeSigmaSafetyMarginKm < 0 && rawTotal > 59;
  return {
    scientificValue,
    safety,
    rawTotal,
    unsafeCapApplied,
    total: unsafeCapApplied ? 59 : rawTotal,
  };
}
