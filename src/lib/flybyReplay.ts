export type ReplayState = {
  tSec: number;
  xKm: number;
  distanceKm: number;
  phase: "接近中" | "最接近" | "離脱中";
  observation: "遠距離" | "観察可能" | "近距離観察";
};

export function calculateReplayState(
  progress: number,
  closestApproachKm: number,
  vInfKmPerSec: number,
): ReplayState {
  const boundedProgress = Math.min(1, Math.max(0, progress));
  const tSec = -300 + boundedProgress * 360;
  const xKm = vInfKmPerSec * tSec;
  const distanceKm = Math.hypot(xKm, closestApproachKm);

  return {
    tSec,
    xKm,
    distanceKm,
    phase: Math.abs(tSec) <= 1 ? "最接近" : tSec < 0 ? "接近中" : "離脱中",
    observation: distanceKm <= 3 ? "近距離観察" : distanceKm <= 30 ? "観察可能" : "遠距離",
  };
}

export function selectReplayTrajectoryIndex(seed: number, sampleCount: number): number {
  if (sampleCount <= 0) return 0;
  const mixed = Math.abs(Math.trunc(seed * 73 + 41));
  return mixed % sampleCount;
}

export function imagingDistanceKm(
  tSec: number,
  closestApproachKm: number,
  vInfKmPerSec: number,
): number {
  return Math.hypot(vInfKmPerSec * tSec, closestApproachKm);
}
