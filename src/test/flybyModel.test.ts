import { describe, expect, it } from "vitest";
import { calculateFlyby } from "../lib/flybyModel";
import { standardMissionPreset } from "../lib/missionPresets";

describe("calculateFlyby", () => {
  it("returns the initial point when delta V is zero", () => {
    const result = calculateFlyby(standardMissionPreset, 0, 0);

    expect(result.bYAfterKm).toBe(8);
    expect(result.bZAfterKm).toBe(-12);
    expect(result.dCAKm).toBeCloseTo(Math.hypot(8, -12));
    expect(result.deltaVTotalMps).toBe(0);
  });

  it("moves each B-plane axis using the fixed T-12 h model", () => {
    const result = calculateFlyby(standardMissionPreset, 0.1, -0.1);

    expect(result.bYAfterKm).toBeCloseTo(12.32);
    expect(result.bZAfterKm).toBeCloseTo(-16.32);
  });
});
