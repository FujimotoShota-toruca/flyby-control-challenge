import { describe, expect, it } from "vitest";
import {
  calculateTwoBurnFlyby,
  covarianceEllipse,
  ellipseSafetyMarginKm,
  fitCommandToBudget,
} from "../lib/flybyModel";
import { standardMissionPreset } from "../lib/missionPresets";

describe("calculateTwoBurnFlyby", () => {
  it("keeps a seeded observation result stable while leaving the first center unchanged", () => {
    const result = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0, zMps: 0 },
      { yMps: 0, zMps: 0 },
      42,
    );
    const sameSeed = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0, zMps: 0 },
      { yMps: 0, zMps: 0 },
      42,
    );
    expect(result.burn1Center).toEqual({ yKm: 8, zKm: -12 });
    expect(result.finalCenter).toEqual(result.postNavigationCenter);
    expect(sameSeed.postNavigationCenter).toEqual(result.postNavigationCenter);
    expect(result.deltaVRemainingMps).toBe(0.3);
    expect(result.distribution).toHaveLength(160);
  });

  it("draws a different observation result for a different seed", () => {
    const first = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0, zMps: 0 },
      1,
    );
    const second = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0, zMps: 0 },
      2,
    );
    expect(second.postNavigationCenter).not.toEqual(first.postNavigationCenter);
  });

  it("keeps sampled observation centers inside the first three-sigma ellipse", () => {
    for (const seed of [0, 1, 2, 25, 100, 999]) {
      const result = calculateTwoBurnFlyby(
        standardMissionPreset,
        { yMps: -0.1, zMps: 0.1 },
        { yMps: 0, zMps: 0 },
        seed,
      );
      const angle = (result.burn1Ellipse.angleDeg * Math.PI) / 180;
      const dy = result.postNavigationCenter.yKm - result.burn1Center.yKm;
      const dz = result.postNavigationCenter.zKm - result.burn1Center.zKm;
      const localMajor = Math.cos(angle) * dy + Math.sin(angle) * dz;
      const localMinor = -Math.sin(angle) * dy + Math.cos(angle) * dz;
      const normalizedRadius = Math.hypot(
        localMajor / (result.burn1Ellipse.sigmaMajorKm * 3),
        localMinor / (result.burn1Ellipse.sigmaMinorKm * 3),
      );
      expect(normalizedRadius).toBeLessThanOrEqual(1);
    }
  });

  it("applies the early correction for longer than the late correction", () => {
    const early = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0.1, zMps: 0 },
      { yMps: 0, zMps: 0 },
    );
    const late = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0, zMps: 0 },
      { yMps: 0.1, zMps: 0 },
    );
    expect(early.burn1Center.yKm).toBeCloseTo(16.64);
    const noLate = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0, zMps: 0 },
      { yMps: 0, zMps: 0 },
    );
    expect(early.burn1Center.yKm - 8).toBeCloseTo(8.64);
    expect(late.finalCenter.yKm - noLate.finalCenter.yKm).toBeCloseTo(2.8);
  });

  it("fits a requested correction inside the remaining total budget", () => {
    const fitted = fitCommandToBudget(
      { yMps: 0.2, zMps: 0.2 },
      { yMps: 0.15, zMps: 0 },
      0.3,
    );
    expect(Math.hypot(fitted.yMps, fitted.zMps) + 0.15).toBeCloseTo(0.3);
  });

  it("widens and rotates the B-plane covariance as delta V grows and changes direction", () => {
    const small = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0.02, zMps: 0 },
      { yMps: 0, zMps: 0 },
    );
    const largeAngled = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0.14, zMps: 0.12 },
      { yMps: 0, zMps: 0 },
    );
    expect(largeAngled.burn1Ellipse.areaKm2).toBeGreaterThan(small.burn1Ellipse.areaKm2);
    expect(largeAngled.burn1Ellipse.angleDeg).not.toBeCloseTo(small.burn1Ellipse.angleDeg);
  });

  it("adds execution uncertainty when the second correction is used", () => {
    const noSecondBurn = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.08, zMps: 0.08 },
      { yMps: 0, zMps: 0 },
    );
    const withSecondBurn = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.08, zMps: 0.08 },
      { yMps: 0.1, zMps: -0.05 },
    );
    expect(withSecondBurn.finalEllipse.areaKm2).toBeGreaterThan(noSecondBurn.finalEllipse.areaKm2);
  });

  it("adds a stronger execution-error penalty to a large command", () => {
    const small = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0.04, zMps: 0 },
      { yMps: 0, zMps: 0 },
    );
    const large = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0.18, zMps: 0 },
      { yMps: 0, zMps: 0 },
    );
    expect(large.burn1ExecutionSigmaMps / small.burn1ExecutionSigmaMps).toBeGreaterThan(4.5);
  });

  it("treats the late correction as more precise than the early correction", () => {
    const result = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0.1, zMps: 0 },
      { yMps: 0.1, zMps: 0 },
    );
    expect(result.burn2ExecutionSigmaMps).toBeLessThan(result.burn1ExecutionSigmaMps);
  });

  it("shrinks the first-burn prediction ellipse after the observation update", () => {
    const result = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.12 },
      { yMps: 0, zMps: 0 },
    );
    expect(result.preBurn2Ellipse.areaKm2).toBeLessThan(result.burn1Ellipse.areaKm2);
    expect(result.preBurn2Ellipse.areaKm2 / result.burn1Ellipse.areaKm2).toBeLessThan(0.1);
  });

  it("uses the educational 3-sigma navigation ellipses", () => {
    const result = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: 0, zMps: 0 },
      { yMps: 0, zMps: 0 },
    );
    expect(result.initialEllipse.sigmaMajorKm * 3).toBeCloseTo(7);
    expect(result.initialEllipse.sigmaMinorKm * 3).toBeCloseTo(3.5);
    expect(result.preBurn2Ellipse.sigmaMajorKm * 3).toBeCloseTo(2, 1);
    expect(result.preBurn2Ellipse.sigmaMinorKm * 3).toBeCloseTo(0.8, 1);
  });

  it("uses finer control increments for the second correction", () => {
    expect(standardMissionPreset.burn2DeltaVStepMps).toBeLessThan(
      standardMissionPreset.deltaVStepMps,
    );
    expect(standardMissionPreset.burn2DeltaVMaxMps).toBeLessThan(
      standardMissionPreset.deltaVMaxMps,
    );
  });

  it("uses a 3-sigma area for displayed ellipses", () => {
    expect(covarianceEllipse([[1, 0], [0, 1]]).areaKm2).toBeCloseTo(Math.PI * 9);
  });

  it("judges safety from the actual rotated ellipse edge, not its major radius", () => {
    const margin = ellipseSafetyMarginKm(
      { yKm: 0, zKm: 3 },
      { sigmaMajorKm: 0.8, sigmaMinorKm: 0.1, angleDeg: 0, areaKm2: 0 },
      0.75,
    );
    expect(margin).toBeGreaterThan(1.9);
  });

  it("reports a negative margin when the displayed ellipse overlaps the danger circle", () => {
    const margin = ellipseSafetyMarginKm(
      { yKm: 0, zKm: 1 },
      { sigmaMajorKm: 0.8, sigmaMinorKm: 0.1, angleDeg: 0, areaKm2: 0 },
      0.75,
    );
    expect(margin).toBeLessThan(0);
  });

  it("allows the first correction to approach and the second to move toward observation range", () => {
    const approachOnly = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0, zMps: 0 },
      0,
    );
    const safetyCorrection = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0.075, zMps: 0.015 },
      0,
    );
    expect(Math.hypot(approachOnly.burn1Center.yKm, approachOnly.burn1Center.zKm)).toBeLessThan(10);
    expect(Math.abs(safetyCorrection.dCAKm - 4)).toBeLessThan(Math.abs(approachOnly.dCAKm - 4));
  });
});
