import type { FlybyResult } from "./flybyModel";
import type { MissionPreset } from "./missionPresets";
import type { ScoreBreakdown } from "./scoring";

export type MissionFeedback = {
  tone: "danger" | "balanced";
  summary: string;
  achievements: string[];
  improvements: string[];
};

export function getMissionFeedback(
  flyby: FlybyResult,
  scores: ScoreBreakdown,
  _preset: MissionPreset,
): MissionFeedback {
  const achievements: string[] = [];
  const improvements: string[] = [];

  if (scores.scientificValue >= 30) achievements.push("予想される通り道の多くを近くで観察できる場所へ入れた");
  if (scores.safety >= 40) achievements.push("予想される通り道の多くを安全な場所へ入れた");
  if (flyby.threeSigmaSafetyMarginKm >= 0) achievements.push("予想範囲全体を危険エリアから外せた");

  if (flyby.threeSigmaSafetyMarginKm < 0) {
    improvements.push("水色の楕円全体を赤い危険エリアから外す");
  }
  if (scores.scientificValue < 30) improvements.push("科学的意義を高めるため、濃い予想範囲をトリフネへ近づける");
  if (scores.safety < 40) improvements.push("濃い予想範囲をトリフネ中心から遠ざける");

  if (achievements.length === 0) achievements.push("2回のΔVと通り道の変化を確認できた");
  if (improvements.length === 0) improvements.push("安全余裕や残りΔVを変えた別の作戦も試す");

  const safe = flyby.threeSigmaSafetyMarginKm >= 0;
  const scientificallyValuable = scores.scientificValue >= 30;
  const summary = safe && scientificallyValuable
    ? "安全性と科学的意義の両方を考えた通り道へ仕上げられました。"
    : safe
      ? "安全な通り道を作れました。次は科学的意義とのバランスを調整してみましょう。"
      : "観測できる通り道を考えられました。最後は予想範囲全体の安全を確保しましょう。";

  return {
    tone: safe ? "balanced" : "danger",
    summary,
    achievements,
    improvements,
  };
}
