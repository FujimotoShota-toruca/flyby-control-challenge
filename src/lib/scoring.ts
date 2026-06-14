import type { FlybyResult } from "./flybyModel";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type ScoreBreakdown = {
  observation: number;
  safety: number;
  deltaVEfficiency: number;
  aimingBalance: number;
  total: number;
};

export function observationScore(dCAKm: number): number {
  if (dCAKm < 0.5) return 35;
  if (dCAKm < 1) return 38;
  if (dCAKm < 2) return 40;
  if (dCAKm <= 10) return 40 - (dCAKm - 2) * 1.5;
  if (dCAKm <= 30) return Math.max(5, 28 - (dCAKm - 10));
  return 5;
}

export function safetyScore(dCAKm: number): number {
  if (dCAKm < 0.5) return 0;
  if (dCAKm < 1) return 10;
  if (dCAKm < 2) return 25;
  return 40;
}

export function deltaVEfficiencyScore(deltaVTotalMps: number): number {
  return clamp(10 * (1 - deltaVTotalMps / 0.25), 0, 10);
}

export function aimingBalanceScore(bYKm: number, bZKm: number): number {
  const absY = Math.abs(bYKm);
  const absZ = Math.abs(bZKm);
  const ratio = Math.min(absY, absZ) / Math.max(absY, absZ, 1e-6);
  return 5 + 5 * ratio;
}

export function calculateScores(flyby: FlybyResult): ScoreBreakdown {
  const observation = clamp(observationScore(flyby.dCAKm), 0, 40);
  const safety = clamp(safetyScore(flyby.dCAKm), 0, 40);
  const deltaVEfficiency = deltaVEfficiencyScore(flyby.deltaVTotalMps);
  const aimingBalance = aimingBalanceScore(flyby.bYAfterKm, flyby.bZAfterKm);

  return {
    observation,
    safety,
    deltaVEfficiency,
    aimingBalance,
    total: observation + safety + deltaVEfficiency + aimingBalance,
  };
}
