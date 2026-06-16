import type { DeltaVCommand, FlybyResult } from "../lib/flybyModel";
import type { MissionPreset } from "../lib/missionPresets";
import { formatSigned } from "../lib/format";

type Props = {
  stage: 1 | 2;
  preset: MissionPreset;
  command: DeltaVCommand;
  flyby: FlybyResult;
  comparisonFlyby?: FlybyResult;
  onChange: (command: DeltaVCommand) => void;
  onBack?: () => void;
  onReset: () => void;
  onConfirm: () => void;
};

export function DeltaVControls({
  stage,
  preset,
  command,
  flyby,
  comparisonFlyby,
  onChange,
  onBack,
  onReset,
  onConfirm,
}: Props) {
  const usedRatio = flyby.deltaVTotalMps / preset.totalDeltaVBudgetMps;
  const currentUse = stage === 1 ? flyby.deltaV1Mps : flyby.deltaV2Mps;
  const executionSigma = stage === 1 ? flyby.burn1ExecutionSigmaMps : flyby.burn2ExecutionSigmaMps;
  const timing = stage === 1 ? preset.burn1Label : preset.burn2Label;
  const sliderMin = stage === 1 ? preset.deltaVMinMps : preset.burn2DeltaVMinMps;
  const sliderMax = stage === 1 ? preset.deltaVMaxMps : preset.burn2DeltaVMaxMps;
  const sliderStep = stage === 1 ? preset.deltaVStepMps : preset.burn2DeltaVStepMps;
  const observationAreaRatio = flyby.preBurn2Ellipse.areaKm2 / Math.max(flyby.burn1Ellipse.areaKm2, 1e-9);
  const slider = (axis: "yMps" | "zMps", label: string, direction: string) => (
    <label className="slider-control" htmlFor={`${timing}-${axis}`}>
      <span className="slider-label">
        <span><strong>{label}</strong><small>{direction}</small></span>
        <output>{formatSigned(command[axis], stage === 1 ? 2 : 3)} <small>m/s</small></output>
      </span>
      <input
        id={`${timing}-${axis}`}
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={command[axis]}
        onChange={(event) => onChange({ ...command, [axis]: Number(event.target.value) })}
      />
      <span className="range-labels">
        <span>{sliderMin.toFixed(2)}</span><span>0</span><span>+{sliderMax.toFixed(2)}</span>
      </span>
    </label>
  );
  const mobileSlider = (axis: "yMps" | "zMps", label: string) => (
    <label className="mobile-slider" htmlFor={`mobile-op${stage}-${axis}`}>
      <span>
        <strong>{label}</strong>
        <output>{formatSigned(command[axis], stage === 1 ? 2 : 3)}</output>
      </span>
      <input
        id={`mobile-op${stage}-${axis}`}
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={command[axis]}
        onChange={(event) => onChange({ ...command, [axis]: Number(event.target.value) })}
      />
    </label>
  );

  return (
    <section className="panel controls-panel" aria-labelledby="controls-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">OPERATION {stage}</span>
          <h2 id="controls-title">第{stage}回 速度を少し変える</h2>
        </div>
        <span className="tgo">{timing}</span>
      </div>
      <p className="help-text">
        {stage === 1
          ? "1回目でトリフネへ近づけましょう。中心近くを狙う作戦でも、2回に分けて近づく作戦でもかまいません。"
          : "追加の観察で今回の中心位置が分かり、通り道の予想もせまくなりました。濃い範囲を安全で観察しやすい場所へ動かしましょう。"}
      </p>

      <div className={`budget-panel ${flyby.deltaVRemainingMps < 0.03 ? "budget-low" : ""}`}>
        <div className="budget-heading">
          <span>2回で使えるΔV</span>
          <strong>残り {flyby.deltaVRemainingMps.toFixed(3)} m/s</strong>
        </div>
        <div className="budget-track" aria-label="ΔV使用量">
          <span style={{ width: `${Math.min(100, usedRatio * 100)}%` }} />
        </div>
        <div className="budget-values">
          <span>今回 {currentUse.toFixed(3)} m/s</span>
          <span>累計 {flyby.deltaVTotalMps.toFixed(3)} / {preset.totalDeltaVBudgetMps.toFixed(2)} m/s</span>
        </div>
      </div>

      {stage === 2 && (
        <div className="observation-update">
          <div>
            <span>トリフネを追加で観察しました</span>
            <strong>中心位置が分かり、通り道の予想もせまくなりました</strong>
          </div>
          <div className="observation-update-values">
            <span>通り道の広さ（3σ）</span>
            <strong>{flyby.burn1Ellipse.areaKm2.toFixed(2)} → {flyby.preBurn2Ellipse.areaKm2.toFixed(2)} km²</strong>
            <small>{Math.round((1 - observationAreaRatio) * 100)}% 縮小</small>
          </div>
        </div>
      )}

      {stage === 2 && comparisonFlyby && (
        <div className="burn-effect-panel">
          <div className="effect-heading">
            <span>2回目でどう変わる？</span>
            <strong>何もしない場合 → 今の設定</strong>
          </div>
          <div className="effect-grid">
            <div>
              <span>通る場所の移動</span>
              <strong>{Math.hypot(
                flyby.finalCenter.yKm - comparisonFlyby.finalCenter.yKm,
                flyby.finalCenter.zKm - comparisonFlyby.finalCenter.zKm,
              ).toFixed(2)} km</strong>
            </div>
            <div>
              <span>観察しやすい場所に入る確率</span>
              <strong className={flyby.recommendedProbability >= comparisonFlyby.recommendedProbability ? "effect-good" : "effect-bad"}>
                {Math.round(comparisonFlyby.recommendedProbability * 100)}% → {Math.round(flyby.recommendedProbability * 100)}%
              </strong>
            </div>
            <div>
              <span>安全エリアまでの余裕（3σ）</span>
              <strong className={flyby.threeSigmaSafetyMarginKm >= comparisonFlyby.threeSigmaSafetyMarginKm ? "effect-good" : "effect-bad"}>
                {comparisonFlyby.threeSigmaSafetyMarginKm.toFixed(2)} → {flyby.threeSigmaSafetyMarginKm.toFixed(2)} km
              </strong>
            </div>
            <div>
              <span>通り道の広さ（3σ）</span>
              <strong className={flyby.finalEllipse.areaKm2 <= comparisonFlyby.finalEllipse.areaKm2 ? "effect-good" : "effect-warn"}>
                {comparisonFlyby.finalEllipse.areaKm2.toFixed(2)} → {flyby.finalEllipse.areaKm2.toFixed(2)} km²
              </strong>
            </div>
          </div>
          <p>2回目でも通る場所を動かせます。ただし、大きく噴射するとずれも増えます。</p>
        </div>
      )}

      <div className="burn-control">
        {stage === 2 && (
          <div className="fine-control-note">
            <strong>細かく仕上げるモード</strong>
            <span>動かせる範囲 ±{sliderMax.toFixed(2)} m/s・1目盛 {sliderStep.toFixed(3)} m/s</span>
          </div>
        )}
        <div className="sliders">
          {slider("yMps", "ΔV_y", "横方向の速度調整")}
          {slider("zMps", "ΔV_z", "縦方向の速度調整")}
        </div>
      </div>

      <div className="operation-use">
        <span>
          この運用で使用するΔV
          <small>噴射のずれの目安: ±{(executionSigma * 3).toFixed(3)} m/s（3σ）</small>
        </span>
        <strong>{currentUse.toFixed(3)} m/s</strong>
      </div>
      <div className={`button-row ${onBack ? "three-buttons" : ""}`}>
        {onBack && <button className="button secondary" type="button" onClick={onBack}>前の運用へ</button>}
        <button className="button secondary" type="button" onClick={onReset}>今回をリセット</button>
        <button className="button primary" type="button" onClick={onConfirm}>
          {stage === 1 ? "第1回ΔVを実行" : "最終ΔVを実行"}
        </button>
      </div>
      <div className={`mobile-command-bar ${flyby.deltaVRemainingMps < 0.03 ? "budget-low" : ""}`} aria-label="スマートフォン用の固定操作バー">
        <div className="mobile-command-summary">
          <span>OP {stage} / {timing}</span>
          <strong>残り {flyby.deltaVRemainingMps.toFixed(3)} m/s</strong>
        </div>
        <div className="mobile-budget-track" aria-label="ΔV使用量">
          <span style={{ width: `${Math.min(100, usedRatio * 100)}%` }} />
        </div>
        <div className="mobile-sliders">
          {mobileSlider("yMps", "ΔV_y")}
          {mobileSlider("zMps", "ΔV_z")}
        </div>
        <div className={`mobile-command-actions ${onBack ? "three-actions" : ""}`}>
          {onBack && <button className="button secondary" type="button" onClick={onBack}>戻る</button>}
          <button className="button secondary" type="button" onClick={onReset}>リセット</button>
          <button className="button primary" type="button" onClick={onConfirm}>
            {stage === 1 ? "1回目実行" : "最終実行"}
          </button>
        </div>
      </div>
    </section>
  );
}
