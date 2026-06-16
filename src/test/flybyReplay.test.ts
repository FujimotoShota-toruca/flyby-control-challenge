import { describe, expect, it } from "vitest";
import {
  calculateReplayState,
  imagingDistanceKm,
  REPLAY_CLOSEST_APPROACH_PROGRESS,
  selectReplayTrajectoryIndex,
} from "../lib/flybyReplay";

describe("calculateReplayState", () => {
  it("moves from approach through closest approach to departure", () => {
    expect(calculateReplayState(0, 2, 5.25).phase).toBe("接近中");
    expect(calculateReplayState(REPLAY_CLOSEST_APPROACH_PROGRESS, 2, 5.25).phase).toBe("最接近");
    expect(calculateReplayState(1, 2, 5.25).phase).toBe("離脱中");
  });

  it("uses the selected closest approach distance at closest approach", () => {
    const state = calculateReplayState(REPLAY_CLOSEST_APPROACH_PROGRESS, 2.75, 5.25);
    expect(state.tSec).toBeCloseTo(0);
    expect(state.distanceKm).toBeCloseTo(2.75);
    expect(state.observation).toBe("近距離観察");
  });

  it("clamps progress outside the replay interval", () => {
    expect(calculateReplayState(-1, 2, 5.25).tSec).toBe(-60);
    expect(calculateReplayState(2, 2, 5.25).tSec).toBe(60);
  });

  it("selects one stable trajectory from the final samples", () => {
    expect(selectReplayTrajectoryIndex(12345, 160)).toBe(selectReplayTrajectoryIndex(12345, 160));
    expect(selectReplayTrajectoryIndex(12345, 160)).toBeGreaterThanOrEqual(0);
    expect(selectReplayTrajectoryIndex(12345, 160)).toBeLessThan(160);
  });

  it("makes imaging distance smallest and symmetric at closest approach", () => {
    expect(imagingDistanceKm(0, 2.75, 5.25)).toBeCloseTo(2.75);
    expect(imagingDistanceKm(-3, 2.75, 5.25)).toBeCloseTo(
      imagingDistanceKm(3, 2.75, 5.25),
    );
  });
});
