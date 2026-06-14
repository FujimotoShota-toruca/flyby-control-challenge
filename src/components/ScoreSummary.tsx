import type { FlybyResult } from "../lib/flybyModel";
import type { ScoreBreakdown } from "../lib/scoring";
import type { Strategy } from "../lib/strategyType";
import { formatScore } from "../lib/format";

type Props = {
  flyby: FlybyResult;
  scores: ScoreBreakdown;
  strategy: Strategy;
};

export function ScoreSummary({ flyby, scores, strategy }: Props) {
  return (
    <section className={`panel summary-panel tone-${strategy.tone}`} aria-label="現在の予測">
      <div className="prediction-label">現在の予測</div>
      <div className="score-hero">
        <div>
          <span>ミッションスコア</span>
          <strong>{formatScore(scores.total)}<small>/100</small></strong>
        </div>
        <span className="strategy-badge">{strategy.name}</span>
      </div>
      <div className="metric-grid">
        <div><span>最近接距離</span><strong>{flyby.dCAKm.toFixed(1)} <small>km</small></strong></div>
        <div><span>安全余裕</span><strong>{flyby.safetyMarginKm.toFixed(1)} <small>km</small></strong></div>
        <div><span>観測</span><strong>{formatScore(scores.observation)}<small>/40</small></strong></div>
        <div><span>安全</span><strong>{formatScore(scores.safety)}<small>/40</small></strong></div>
      </div>
    </section>
  );
}
