import type { FlybyResult } from "./flybyModel";
import type { MissionPreset } from "./missionPresets";

export type Strategy = {
  name: string;
  tone: "danger" | "caution" | "balanced" | "safe";
  comment: string;
};

export function getStrategy(
  flyby: FlybyResult,
  preset: MissionPreset,
): Strategy {
  if (flyby.dCAKm < preset.dangerRadiusKm) {
    return {
      name: "危険領域",
      tone: "danger",
      comment:
        "危険領域に入っています。安全に観測するため、もう少し外側を通るようにΔVを調整しましょう。",
    };
  }
  if (flyby.dCAKm < preset.cautionRadiusKm) {
    return {
      name: "攻めすぎ型",
      tone: "caution",
      comment:
        "かなり近い通過位置です。観測には有利ですが、本物の探査では安全の余裕が重要です。",
    };
  }
  if (flyby.dCAKm < preset.observationPriorityRadiusKm) {
    return {
      name: "観測重視型",
      tone: "caution",
      comment:
        "近くを通ってよく観測しようとする作戦です。観測スコアは高めですが、安全余裕も確認しましょう。",
    };
  }
  if (flyby.dCAKm <= preset.recommendedMaxRadiusKm) {
    return {
      name: "バランス型",
      tone: "balanced",
      comment:
        "観測と安全のバランスがよい作戦です。近すぎず遠すぎない通過位置を選べています。",
    };
  }
  if (flyby.deltaVTotalMps < 0.005) {
    return {
      name: "調整不足型",
      tone: "safe",
      comment:
        "まだほとんど速度を調整していません。ΔVを少し変えて、通過位置がどう動くか試してみましょう。",
    };
  }
  if (flyby.dCAKm <= preset.farRadiusKm) {
    return {
      name: "安全重視型",
      tone: "safe",
      comment:
        "安全余裕を大きく取った作戦です。もう少し近づけると、観測スコアが上がるかもしれません。",
    };
  }
  return {
    name: "遠すぎ型",
    tone: "safe",
    comment:
      "安全ですが、トリフネから遠いため観測しにくい作戦です。少し近づける調整を試してみましょう。",
  };
}
