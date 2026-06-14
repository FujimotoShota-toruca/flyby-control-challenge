import type { MissionPreset } from "./missionPresets";

export type FlybyResult = {
  bYAfterKm: number;
  bZAfterKm: number;
  dCAKm: number;
  deltaVTotalMps: number;
  safetyMarginKm: number;
};

export function calculateFlyby(
  preset: MissionPreset,
  deltaVYMps: number,
  deltaVZMps: number,
): FlybyResult {
  const bYAfterKm = preset.initialBYKm + (deltaVYMps * preset.tGoSec) / 1000;
  const bZAfterKm = preset.initialBZKm + (deltaVZMps * preset.tGoSec) / 1000;
  const dCAKm = Math.hypot(bYAfterKm, bZAfterKm);
  const deltaVTotalMps = Math.hypot(deltaVYMps, deltaVZMps);

  return {
    bYAfterKm,
    bZAfterKm,
    dCAKm,
    deltaVTotalMps,
    safetyMarginKm: dCAKm - preset.dangerRadiusKm,
  };
}
