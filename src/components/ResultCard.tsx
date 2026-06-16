import type { DeltaVCommand, FlybyResult } from "../lib/flybyModel";
import type { MissionFeedback } from "../lib/missionFeedback";
import type { ScoreBreakdown } from "../lib/scoring";
import { calculateDistributionScores } from "../lib/scoring";
import { formatScore, formatSigned } from "../lib/format";
import { BPlanePanel } from "./BPlanePanel";
import { standardMissionPreset } from "../lib/missionPresets";

type Props = {
  burn1: DeltaVCommand;
  burn2: DeltaVCommand;
  flyby: FlybyResult;
  scores: ScoreBreakdown;
  feedback: MissionFeedback;
  onBack: () => void;
  onRestart: () => void;
};

const scoreRows = [
  ["科学的意義得点", "scientificValue", 50],
  ["安全得点", "safety", 50],
] as const;

export function ResultCard({ burn1, burn2, flyby, scores, feedback, onBack, onRestart }: Props) {
  const beforeBurn2Scores = calculateDistributionScores(
    flyby.preBurn2Distribution,
    standardMissionPreset,
  );
  const scientificValueChange = scores.scientificValue - beforeBurn2Scores.scientificValue;
  const safetyChange = scores.safety - beforeBurn2Scores.safety;
  const formatChange = (value: number) => `${value >= 0 ? "+" : ""}${formatScore(value)}点`;
  const areaChangePercent = (flyby.finalEllipse.areaKm2 / flyby.preBurn2Ellipse.areaKm2 - 1) * 100;
  const formatPercentChange = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;

  return (
    <div className="result-workspace">
      <BPlanePanel preset={standardMissionPreset} flyby={flyby} stage={2} />
      <article className={`result-card tone-${feedback.tone}`}>
        <span className="eyebrow">チャレンジ結果</span>
        <h2>あなたのフライバイ作戦</h2>
        <div className="result-score">
          <span>最終分布スコア</span>
          <strong>{formatScore(scores.total)}<small>点</small></strong>
        </div>
        <p className="result-comment">{feedback.summary}</p>
        {scores.unsafeCapApplied && (
          <p className="result-comment">安全条件を満たしていないため、合計点は59点までです。</p>
        )}
        <div className="result-main-values">
          <div><span>赤い円までの余裕（3σ）</span><strong>{flyby.threeSigmaSafetyMarginKm.toFixed(2)} km</strong></div>
          <div><span>近くで見られる確率</span><strong>{Math.round(flyby.highResolutionProbability * 100)}%</strong></div>
          <div><span>安全に見られる確率</span><strong>{Math.round(flyby.safeObservationProbability * 100)}%</strong></div>
          <div><span>残ったΔV</span><strong>{flyby.deltaVRemainingMps.toFixed(3)} m/s</strong></div>
        </div>
        <div className="score-bars">
          {scoreRows.map(([label, key, max]) => (
            <div className={`score-row score-${key}`} key={key}>
              <div><span>{label}</span><strong>{formatScore(scores[key])}/{max}</strong></div>
              <progress value={scores[key]} max={max} />
            </div>
          ))}
        </div>
        <section className="operation-change">
          <span className="eyebrow">参考：2回目のΔVによる変化</span>
          <p>この変化量そのものは、ミッションスコアへ加点されません。</p>
          <div className="operation-change-values">
            <span>科学的意義 <strong>{formatChange(scientificValueChange)}</strong></span>
            <span>安全性 <strong>{formatChange(safetyChange)}</strong></span>
            <span>予想範囲の広さ <strong>{formatPercentChange(areaChangePercent)}</strong></span>
          </div>
        </section>
        <details className="tradeoff-explanation">
          <summary>保護者・もっと知りたい人向け：点数の考え方</summary>
          <div className="tradeoff-copy">
            <p>
              <strong>科学的意義得点</strong>は、トリフネへ近い通り道ほど高くなります。
              <strong>安全得点</strong>は反対に、遠い通り道ほど高くなり、約1.9 km付近で増え方が切り替わります。
            </p>
            <div className="formula-grid">
              <span>科学的意義 <strong>exp(-(距離 - 1 km)² / (2 × 2.5²))</strong></span>
              <span>安全性 <strong>x²(3 - 2x)、x = (距離 - 0.75 km) / 2.25 km</strong></span>
            </div>
            <p>
              最終予想分布から作った160本の通り道を両方の式で採点し、その平均を表示しています。
              操作の途中経過や使ったΔV量ではなく、最終的にできた通り道だけを採点します。
              どちらか一方だけでなく、作戦としてどこまで近づくかを考えるための教育用ルールです。
            </p>
            <p>
              科学的意義と安全性は反対方向へ動くため、100点を取れる作戦はありません。
              予想範囲が一点に集まる理想状態でも、この式による最高点は約87点です。
              実際のミッションでも、目的や許容できる危険を決めたうえで、何を「良い作戦」とするかを判断します。
            </p>
          </div>
        </details>
        <div className="feedback-grid">
          <section>
            <h3>達成したこと</h3>
            <ul>{feedback.achievements.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h3>次に改善できること</h3>
            <ul>{feedback.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>
        <details open>
          <summary>くわしい記録</summary>
          <div className="details-grid">
            <span>T-24 h ΔV_y <strong>{formatSigned(burn1.yMps, 3)} m/s</strong></span>
            <span>T-24 h ΔV_z <strong>{formatSigned(burn1.zMps, 3)} m/s</strong></span>
            <span>T-6 h ΔV_y <strong>{formatSigned(burn2.yMps, 3)} m/s</strong></span>
            <span>T-6 h ΔV_z <strong>{formatSigned(burn2.zMps, 3)} m/s</strong></span>
            <span>1回目に使った量 <strong>{flyby.deltaV1Mps.toFixed(3)} m/s</strong></span>
            <span>2回目に使った量 <strong>{flyby.deltaV2Mps.toFixed(3)} m/s</strong></span>
            <span>1回目後の中心からの距離 <strong>{Math.hypot(flyby.burn1Center.yKm, flyby.burn1Center.zKm).toFixed(1)} km</strong></span>
            <span>追加観察後の中心からの距離 <strong>{Math.hypot(flyby.postNavigationCenter.yKm, flyby.postNavigationCenter.zKm).toFixed(1)} km</strong></span>
            <span>最後の中心からの距離 <strong>{flyby.dCAKm.toFixed(2)} km</strong></span>
            <span>トリフネ表面からの距離目安 <strong>{flyby.surfaceClearanceKm.toFixed(2)} km</strong></span>
            <span>最終中心座標 <strong>{flyby.finalCenter.yKm.toFixed(1)}, {flyby.finalCenter.zKm.toFixed(1)} km</strong></span>
            <span>最後の予想範囲 3σ <strong>長い方向 ±{(flyby.finalEllipse.sigmaMajorKm * 3).toFixed(1)} / 短い方向 ±{(flyby.finalEllipse.sigmaMinorKm * 3).toFixed(1)} km</strong></span>
            <span>予想範囲の向き <strong>{flyby.finalEllipse.angleDeg.toFixed(0)}°</strong></span>
          </div>
        </details>
        <div className="button-row">
          <button className="button secondary" type="button" onClick={onBack}>再生画面に戻る</button>
          <button className="button primary" type="button" onClick={onRestart}>最初から挑戦する</button>
        </div>
        <p className="disclaimer compact">非公式教育シミュレーション｜誤差分布・確率は教育用の簡略モデルです</p>
      </article>
    </div>
  );
}
