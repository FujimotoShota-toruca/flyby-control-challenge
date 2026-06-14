import { describe, expect, it } from "vitest";
import { calculateFlyby } from "../lib/flybyModel";
import { standardMissionPreset } from "../lib/missionPresets";
import { calculateScores, safetyScore } from "../lib/scoring";
import { getStrategy } from "../lib/strategyType";

describe("scoring", () => {
  it("gives zero safety points inside the danger radius", () => {
    expect(safetyScore(0.49)).toBe(0);
  });

  it("keeps the total score within 100 points", () => {
    const flyby = calculateFlyby(standardMissionPreset, -0.14, 0.2);
    expect(calculateScores(flyby).total).toBeLessThanOrEqual(100);
  });

  it("marks the unchanged initial plan as adjustment insufficient", () => {
    const flyby = calculateFlyby(standardMissionPreset, 0, 0);
    expect(getStrategy(flyby, standardMissionPreset).name).toBe("調整不足型");
  });
});
