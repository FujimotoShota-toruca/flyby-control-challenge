import type { FlybyResult } from "../lib/flybyModel";
import type { ScoreBreakdown } from "../lib/scoring";
import type { Strategy } from "../lib/strategyType";
import { formatScore, formatSigned } from "../lib/format";

type Props = {
  deltaVY: number;
  deltaVZ: number;
  flyby: FlybyResult;
  scores: ScoreBreakdown;
  strategy: Strategy;
  onClose: () => void;
};

const scoreRows = [
  ["観測スコア", "observation", 40],
  ["安全スコア", "safety", 40],
  ["ΔV 効率", "deltaVEfficiency", 10],
  ["照準バランス", "aimingBalance", 10],
] as const;

export function ResultCard({ deltaVY, deltaVZ, flyby, scores, strategy, onClose }: Props) {
  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <article className={`result-card tone-${strategy.tone}`}>
        <button className="close-button" type="button" onClick={onClose} aria-label="結果を閉じる">×</button>
        <span className="eyebrow">MISSION RESULT</span>
        <h2 id="result-title">作戦結果カード</h2>
        <div className="result-score">
          <span>ミッションスコア</span>
          <strong>{formatScore(scores.total)}<small>点</small></strong>
          <em>{strategy.name}</em>
        </div>
        <p className="result-comment">{strategy.comment}</p>
        <div className="result-main-values">
          <div><span>最近接距離</span><strong>{flyby.dCAKm.toFixed(1)} km</strong></div>
          <div><span>安全余裕</span><strong>{flyby.safetyMarginKm.toFixed(1)} km</strong></div>
          <div><span>ΔV 合計</span><strong>{flyby.deltaVTotalMps.toFixed(3)} m/s</strong></div>
        </div>
        <div className="score-bars">
          {scoreRows.map(([label, key, max]) => (
            <div className="score-row" key={key}>
              <div><span>{label}</span><strong>{formatScore(scores[key])}/{max}</strong></div>
              <progress value={scores[key]} max={max} />
            </div>
          ))}
        </div>
        <details>
          <summary>作戦の詳細を見る</summary>
          <div className="details-grid">
            <span>ΔV_y <strong>{formatSigned(deltaVY)} m/s</strong></span>
            <span>ΔV_z <strong>{formatSigned(deltaVZ)} m/s</strong></span>
            <span>B_y <strong>{flyby.bYAfterKm.toFixed(2)} km</strong></span>
            <span>B_z <strong>{flyby.bZAfterKm.toFixed(2)} km</strong></span>
            <span>修正タイミング <strong>T-12 h</strong></span>
          </div>
        </details>
        <button className="button primary full" type="button" onClick={onClose}>ΔVを調整し直す</button>
        <p className="disclaimer compact">非公式教育シミュレーション｜軌道・スコアは教育用の簡略モデルです</p>
      </article>
    </div>
  );
}
