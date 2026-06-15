import type { MissionPreset } from "./missionPresets";

export type DeltaVCommand = { yMps: number; zMps: number };
export type BPlanePoint = { yKm: number; zKm: number };
export type Covariance2 = [[number, number], [number, number]];
type Matrix2 = readonly [readonly [number, number], readonly [number, number]];

export type Ellipse = {
  sigmaMajorKm: number;
  sigmaMinorKm: number;
  angleDeg: number;
  areaKm2: number;
};

export const DISPLAY_SIGMA = 3;

export type FlybyResult = {
  initialEllipse: Ellipse;
  preBurn2Ellipse: Ellipse;
  burn1Center: BPlanePoint;
  postNavigationCenter: BPlanePoint;
  finalCenter: BPlanePoint;
  burn1CovarianceKm2: Covariance2;
  finalCovarianceKm2: Covariance2;
  burn1Ellipse: Ellipse;
  finalEllipse: Ellipse;
  preBurn2SafetyMarginKm: number;
  preBurn2RecommendedProbability: number;
  preBurn2Distribution: BPlanePoint[];
  distribution: BPlanePoint[];
  dCAKm: number;
  deltaV1Mps: number;
  deltaV2Mps: number;
  deltaVTotalMps: number;
  deltaVRemainingMps: number;
  safetyMarginKm: number;
  threeSigmaSafetyMarginKm: number;
  dangerProbability: number;
  recommendedProbability: number;
  highResolutionProbability: number;
  safeObservationProbability: number;
  surfaceClearanceKm: number;
  burn1ExecutionSigmaMps: number;
  burn2ExecutionSigmaMps: number;
};

const SAMPLE_COUNT = 160;
const commandMagnitude = (command: DeltaVCommand) => Math.hypot(command.yMps, command.zMps);

const addCovariance = (...items: Covariance2[]): Covariance2 => [
  [items.reduce((sum, item) => sum + item[0][0], 0), items.reduce((sum, item) => sum + item[0][1], 0)],
  [items.reduce((sum, item) => sum + item[1][0], 0), items.reduce((sum, item) => sum + item[1][1], 0)],
];

const scaleCovariance = (covariance: Covariance2, scale: number): Covariance2 => [
  [covariance[0][0] * scale, covariance[0][1] * scale],
  [covariance[1][0] * scale, covariance[1][1] * scale],
];

const mapCommand = (matrix: Matrix2, command: DeltaVCommand): BPlanePoint => ({
  yKm: matrix[0][0] * command.yMps + matrix[0][1] * command.zMps,
  zKm: matrix[1][0] * command.yMps + matrix[1][1] * command.zMps,
});

function commandErrorSigma(
  preset: MissionPreset,
  command: DeltaVCommand,
  proportionalRate: number,
) {
  const magnitude = commandMagnitude(command);
  const largeCommandPenalty = magnitude ** 2 * preset.executionLargeCommandPenalty;
  const parallel = preset.executionErrorFloorMps + magnitude * proportionalRate + largeCommandPenalty;
  const cross = preset.executionErrorFloorMps * 0.7
    + magnitude * preset.executionCrossErrorRate
    + largeCommandPenalty * 0.45;
  return { parallel, cross };
}

function commandErrorCovariance(
  preset: MissionPreset,
  command: DeltaVCommand,
  proportionalRate: number,
): Covariance2 {
  const magnitude = commandMagnitude(command);
  const { parallel, cross } = commandErrorSigma(preset, command, proportionalRate);
  const angle = magnitude === 0 ? 0 : Math.atan2(command.zMps, command.yMps);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const parallel2 = parallel ** 2;
  const cross2 = cross ** 2;
  return [
    [c * c * parallel2 + s * s * cross2, c * s * (parallel2 - cross2)],
    [c * s * (parallel2 - cross2), s * s * parallel2 + c * c * cross2],
  ];
}

function mapCovariance(matrix: Matrix2, covariance: Covariance2): Covariance2 {
  const [[a, b], [c, d]] = matrix;
  const [[p, q], [, r]] = covariance;
  return [
    [a * a * p + 2 * a * b * q + b * b * r, a * c * p + (a * d + b * c) * q + b * d * r],
    [a * c * p + (a * d + b * c) * q + b * d * r, c * c * p + 2 * c * d * q + d * d * r],
  ];
}

export function covarianceEllipse(covariance: Covariance2): Ellipse {
  const [[a, b], [, d]] = covariance;
  const traceHalf = (a + d) / 2;
  const radius = Math.sqrt(((a - d) / 2) ** 2 + b ** 2);
  const majorVariance = Math.max(0, traceHalf + radius);
  const minorVariance = Math.max(0, traceHalf - radius);
  return {
    sigmaMajorKm: Math.sqrt(majorVariance),
    sigmaMinorKm: Math.sqrt(minorVariance),
    angleDeg: (Math.atan2(2 * b, a - d) * 90) / Math.PI,
    areaKm2: Math.PI
      * Math.sqrt(majorVariance)
      * DISPLAY_SIGMA
      * Math.sqrt(minorVariance)
      * DISPLAY_SIGMA,
  };
}

export function ellipseSafetyMarginKm(
  center: BPlanePoint,
  ellipse: Ellipse,
  dangerRadiusKm: number,
): number {
  const majorRadius = ellipse.sigmaMajorKm * DISPLAY_SIGMA;
  const minorRadius = ellipse.sigmaMinorKm * DISPLAY_SIGMA;
  const angle = (ellipse.angleDeg * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const localY = c * -center.yKm + s * -center.zKm;
  const localZ = -s * -center.yKm + c * -center.zKm;
  const centerIsInsideEllipse =
    (localY / majorRadius) ** 2 + (localZ / minorRadius) ** 2 <= 1;

  if (centerIsInsideEllipse) return -dangerRadiusKm;

  const sampleCount = 4096;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < sampleCount; index += 1) {
    const parameter = (index / sampleCount) * Math.PI * 2;
    const localPointY = majorRadius * Math.cos(parameter);
    const localPointZ = minorRadius * Math.sin(parameter);
    const pointY = center.yKm + c * localPointY - s * localPointZ;
    const pointZ = center.zKm + s * localPointY + c * localPointZ;
    closestDistance = Math.min(closestDistance, Math.hypot(pointY, pointZ));
  }
  return closestDistance - dangerRadiusKm;
}

function deterministicNormalPair(index: number, seed = 0): [number, number] {
  const seedA = Math.abs(Math.trunc(seed)) % SAMPLE_COUNT;
  const seedB = Math.abs(Math.trunc(seed * 17 + 31)) % SAMPLE_COUNT;
  const u1 = Math.max(1e-9, ((index * 73 + 19 + seedA) % SAMPLE_COUNT + 0.5) / SAMPLE_COUNT);
  const u2 = (((index * 109 + 47 + seedB) % SAMPLE_COUNT) + 0.5) / SAMPLE_COUNT;
  const radius = Math.sqrt(-2 * Math.log(u1));
  const angle = 2 * Math.PI * u2;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function sampleDistribution(center: BPlanePoint, covariance: Covariance2, seed = 0): BPlanePoint[] {
  const l11 = Math.sqrt(Math.max(covariance[0][0], 0));
  const l21 = l11 > 0 ? covariance[1][0] / l11 : 0;
  const l22 = Math.sqrt(Math.max(covariance[1][1] - l21 ** 2, 0));
  return Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const [u, v] = deterministicNormalPair(index, seed);
    return { yKm: center.yKm + l11 * u, zKm: center.zKm + l21 * u + l22 * v };
  });
}

function sampleObservationCenter(
  center: BPlanePoint,
  covariance: Covariance2,
  seed: number,
): BPlanePoint {
  const l11 = Math.sqrt(Math.max(covariance[0][0], 0));
  const l21 = l11 > 0 ? covariance[1][0] / l11 : 0;
  const l22 = Math.sqrt(Math.max(covariance[1][1] - l21 ** 2, 0));
  const startIndex = Math.abs(Math.trunc(seed)) % SAMPLE_COUNT;
  for (let offset = 0; offset < SAMPLE_COUNT; offset += 1) {
    const [u, v] = deterministicNormalPair((startIndex + offset) % SAMPLE_COUNT, seed);
    if (Math.hypot(u, v) <= DISPLAY_SIGMA) {
      return { yKm: center.yKm + l11 * u, zKm: center.zKm + l21 * u + l22 * v };
    }
  }
  return center;
}

export function calculateTwoBurnFlyby(
  preset: MissionPreset,
  burn1: DeltaVCommand,
  burn2: DeltaVCommand,
  observationSeed = 0,
): FlybyResult {
  const burn1Move = mapCommand(preset.burn1SensitivityKmPerMps, burn1);
  const burn2Move = mapCommand(preset.burn2SensitivityKmPerMps, burn2);
  const burn1Center = { yKm: preset.initialBYKm + burn1Move.yKm, zKm: preset.initialBZKm + burn1Move.zKm };
  const burn1Execution = mapCovariance(
    preset.burn1SensitivityKmPerMps,
    commandErrorCovariance(preset, burn1, preset.burn1ExecutionErrorRate),
  );
  const burn2Execution = mapCovariance(
    preset.burn2SensitivityKmPerMps,
    commandErrorCovariance(preset, burn2, preset.burn2ExecutionErrorRate),
  );
  const burn1CovarianceKm2 = addCovariance(
    preset.burn1NavigationCovarianceKm2 as Covariance2,
    burn1Execution,
  );
  const postNavigationCenter = sampleObservationCenter(
    burn1Center,
    burn1CovarianceKm2,
    observationSeed,
  );
  const finalCenter = { yKm: postNavigationCenter.yKm + burn2Move.yKm, zKm: postNavigationCenter.zKm + burn2Move.zKm };
  const finalCovarianceKm2 = addCovariance(
    preset.finalNavigationCovarianceKm2 as Covariance2,
    scaleCovariance(burn1Execution, preset.burn1ErrorRetentionAfterObservation),
    burn2Execution,
  );
  const preBurn2CovarianceKm2 = addCovariance(
    preset.finalNavigationCovarianceKm2 as Covariance2,
    scaleCovariance(burn1Execution, preset.burn1ErrorRetentionAfterObservation),
  );
  const distribution = sampleDistribution(finalCenter, finalCovarianceKm2, observationSeed + 101);
  const preBurn2Distribution = sampleDistribution(postNavigationCenter, preBurn2CovarianceKm2, observationSeed + 101);
  const distances = distribution.map((point) => Math.hypot(point.yKm, point.zKm));
  const preBurn2Distances = preBurn2Distribution.map((point) => Math.hypot(point.yKm, point.zKm));
  const dangerProbability = distances.filter((distance) => distance < preset.dangerRadiusKm).length / SAMPLE_COUNT;
  const recommendedProbability = distances.filter(
    (distance) => distance >= preset.recommendedMinRadiusKm && distance <= preset.recommendedMaxRadiusKm,
  ).length / SAMPLE_COUNT;
  const preBurn2RecommendedProbability = preBurn2Distances.filter(
    (distance) => distance >= preset.recommendedMinRadiusKm && distance <= preset.recommendedMaxRadiusKm,
  ).length / SAMPLE_COUNT;
  const highResolutionProbability = distances.filter(
    (distance) => distance >= preset.highResolutionMinRadiusKm
      && distance < preset.highResolutionMaxRadiusKm,
  ).length / SAMPLE_COUNT;
  const safeObservationProbability = distances.filter(
    (distance) => distance >= preset.safeObservationMinRadiusKm
      && distance <= preset.recommendedMaxRadiusKm,
  ).length / SAMPLE_COUNT;
  const deltaV1Mps = commandMagnitude(burn1);
  const deltaV2Mps = commandMagnitude(burn2);
  const deltaVTotalMps = deltaV1Mps + deltaV2Mps;
  const dCAKm = Math.hypot(finalCenter.yKm, finalCenter.zKm);
  const finalEllipse = covarianceEllipse(finalCovarianceKm2);
  const preBurn2Ellipse = covarianceEllipse(preBurn2CovarianceKm2);
  const threeSigmaSafetyMarginKm = ellipseSafetyMarginKm(
    finalCenter,
    finalEllipse,
    preset.dangerRadiusKm,
  );
  const preBurn2SafetyMarginKm = ellipseSafetyMarginKm(
    postNavigationCenter,
    preBurn2Ellipse,
    preset.dangerRadiusKm,
  );

  return {
    initialEllipse: covarianceEllipse(preset.burn1NavigationCovarianceKm2 as Covariance2),
    preBurn2Ellipse,
    burn1Center,
    postNavigationCenter,
    finalCenter,
    burn1CovarianceKm2,
    finalCovarianceKm2,
    burn1Ellipse: covarianceEllipse(burn1CovarianceKm2),
    finalEllipse,
    preBurn2SafetyMarginKm,
    preBurn2RecommendedProbability,
    preBurn2Distribution,
    distribution,
    dCAKm,
    deltaV1Mps,
    deltaV2Mps,
    deltaVTotalMps,
    deltaVRemainingMps: Math.max(0, preset.totalDeltaVBudgetMps - deltaVTotalMps),
    safetyMarginKm: dCAKm - preset.dangerRadiusKm,
    threeSigmaSafetyMarginKm,
    dangerProbability,
    recommendedProbability,
    highResolutionProbability,
    safeObservationProbability,
    surfaceClearanceKm: dCAKm - preset.asteroidMaxRadiusKm,
    burn1ExecutionSigmaMps: commandErrorSigma(
      preset,
      burn1,
      preset.burn1ExecutionErrorRate,
    ).parallel,
    burn2ExecutionSigmaMps: commandErrorSigma(
      preset,
      burn2,
      preset.burn2ExecutionErrorRate,
    ).parallel,
  };
}

export function fitCommandToBudget(
  desired: DeltaVCommand,
  otherCommand: DeltaVCommand,
  totalBudgetMps: number,
): DeltaVCommand {
  const available = Math.max(0, totalBudgetMps - commandMagnitude(otherCommand));
  const desiredMagnitude = commandMagnitude(desired);
  if (desiredMagnitude <= available || desiredMagnitude === 0) return desired;
  const scale = available / desiredMagnitude;
  return { yMps: desired.yMps * scale, zMps: desired.zMps * scale };
}
