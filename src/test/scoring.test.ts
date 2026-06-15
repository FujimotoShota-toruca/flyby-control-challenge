import { describe, expect, it } from "vitest";
import { calculateTwoBurnFlyby } from "../lib/flybyModel";
import { getMissionFeedback } from "../lib/missionFeedback";
import { standardMissionPreset } from "../lib/missionPresets";
import {
  calculateDistributionScores,
  calculateScores,
  safetyPotential,
  scientificValuePotential,
} from "../lib/scoring";

describe("probability scoring", () => {
  it("keeps the total score within 100 points", () => {
    const flyby = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.05, zMps: 0.05 },
      { yMps: 0.02, zMps: 0.01 },
    );
    expect(calculateScores(flyby, standardMissionPreset).total).toBeLessThanOrEqual(100);
  });

  it("scores only scientific value and safety from the final distribution", () => {
    const result = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.06, zMps: 0.08 },
      { yMps: 0.04, zMps: -0.02 },
    );
    const scores = calculateScores(result, standardMissionPreset);
    expect(scores.rawTotal).toBeCloseTo(scores.scientificValue + scores.safety);
    expect(scores).not.toHaveProperty("approachProgress");
    expect(scores).not.toHaveProperty("finalImprovement");
    expect(scores).not.toHaveProperty("deltaVEfficiency");
    expect(scores.safety).toBeGreaterThanOrEqual(0);
    expect(calculateDistributionScores(result.distribution, standardMissionPreset)).toEqual({
      scientificValue: scores.scientificValue,
      safety: scores.safety,
    });
  });

  it("reports second-burn changes separately from the mission score", () => {
    const firstOnly = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0, zMps: 0 },
      0,
    );
    const usefulSecondBurn = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0.075, zMps: 0.015 },
      0,
    );
    const firstScores = calculateDistributionScores(
      usefulSecondBurn.preBurn2Distribution,
      standardMissionPreset,
    );
    const usefulScores = calculateScores(usefulSecondBurn, standardMissionPreset);
    expect(usefulScores.safety).not.toBeCloseTo(firstScores.safety);
    expect(usefulScores).not.toHaveProperty("finalImprovement");
    expect(calculateScores(firstOnly, standardMissionPreset)).not.toHaveProperty("finalImprovement");
  });

  it("caps an unsafe result at 59 points", () => {
    const flyby = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0.065, zMps: 0.1 },
      0,
    );
    const scores = calculateScores(flyby, standardMissionPreset);
    expect(flyby.threeSigmaSafetyMarginKm).toBeLessThan(0);
    expect(scores.unsafeCapApplied).toBe(true);
    expect(scores.total).toBeLessThanOrEqual(59);
  });

  it("rewards the intended safe two-stage mission", () => {
    const flyby = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0.03, zMps: 0.055 },
      999,
    );
    const scores = calculateScores(flyby, standardMissionPreset);
    expect(Math.hypot(flyby.burn1Center.yKm, flyby.burn1Center.zKm)).toBeLessThan(5);
    expect(flyby.dCAKm).toBeGreaterThanOrEqual(3);
    expect(flyby.dCAKm).toBeLessThanOrEqual(5);
    expect(flyby.threeSigmaSafetyMarginKm).toBeGreaterThanOrEqual(0);
    expect(scores.total).toBeGreaterThan(60);
  });

  it("allows a staged approach to score highly without aiming at the center first", () => {
    const flyby = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0.065, zMps: 0.1 },
      100,
    );
    const firstDistance = Math.hypot(flyby.burn1Center.yKm, flyby.burn1Center.zKm);
    const scores = calculateScores(flyby, standardMissionPreset);
    expect(firstDistance).toBeGreaterThan(3);
    expect(flyby.dCAKm).toBeGreaterThanOrEqual(3);
    expect(flyby.dCAKm).toBeLessThanOrEqual(5);
    expect(flyby.threeSigmaSafetyMarginKm).toBeGreaterThanOrEqual(0);
    expect(scores.total).toBeGreaterThan(65);
    const feedback = getMissionFeedback(flyby, scores, standardMissionPreset);
    expect(feedback.achievements).toContain("予想範囲全体を危険エリアから外せた");
  });

  it("suggests moving the full prediction ellipse out of danger", () => {
    const flyby = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0.065, zMps: 0.1 },
      0,
    );
    const scores = calculateScores(flyby, standardMissionPreset);
    const feedback = getMissionFeedback(flyby, scores, standardMissionPreset);

    expect(feedback.tone).toBe("danger");
    expect(feedback.improvements).toContain("水色の楕円全体を赤い危険エリアから外す");
  });

  it("describes a safe observation-course result without assigning a title", () => {
    const flyby = calculateTwoBurnFlyby(
      standardMissionPreset,
      { yMps: -0.1, zMps: 0.1 },
      { yMps: 0.03, zMps: 0.055 },
      999,
    );
    const scores = calculateScores(flyby, standardMissionPreset);
    const feedback = getMissionFeedback(flyby, scores, standardMissionPreset);

    expect(feedback.tone).toBe("balanced");
    expect(feedback.summary).toContain("安全な通り道");
    expect(feedback).not.toHaveProperty("name");
  });

  it("rewards close paths with higher scientific value", () => {
    expect(scientificValuePotential(1)).toBeGreaterThan(scientificValuePotential(3));
    expect(scientificValuePotential(3)).toBeGreaterThan(scientificValuePotential(10));
  });

  it("moves scientific value and safety in opposite directions", () => {
    expect(scientificValuePotential(1)).toBeGreaterThan(scientificValuePotential(3));
    expect(safetyPotential(1, standardMissionPreset)).toBeLessThan(
      safetyPotential(3, standardMissionPreset),
    );
  });

  it("uses an S-shaped safety potential with an inflection near 1.9 kilometers", () => {
    expect(safetyPotential(1, standardMissionPreset)).toBeLessThan(0.05);
    expect(safetyPotential(3, standardMissionPreset)).toBe(1);
    expect(safetyPotential(1.875, standardMissionPreset)).toBeCloseTo(0.5);
  });
});
