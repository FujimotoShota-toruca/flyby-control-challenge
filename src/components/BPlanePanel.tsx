import { useState } from "react";
import { DISPLAY_SIGMA, type Ellipse, type FlybyResult } from "../lib/flybyModel";
import type { MissionPreset } from "../lib/missionPresets";

type Props = {
  preset: MissionPreset;
  flyby: FlybyResult;
  stage: 1 | 2;
  comparisonFlyby?: FlybyResult;
};

const SIZE = 360;
const CENTER = SIZE / 2;
export function BPlanePanel({ preset, flyby, stage, comparisonFlyby }: Props) {
  const [viewRadius, setViewRadius] = useState(40);
  const scale = CENTER / viewRadius;
  const px = (km: number) => CENTER + km * scale;
  const py = (km: number) => CENTER - km * scale;

  const ellipse = (
    center: { yKm: number; zKm: number },
    shape: Ellipse,
    className: string,
    gradientId: string,
  ) => (
    <ellipse
      cx={px(center.yKm)}
      cy={py(center.zKm)}
      rx={shape.sigmaMajorKm * scale * DISPLAY_SIGMA}
      ry={shape.sigmaMinorKm * scale * DISPLAY_SIGMA}
      transform={`rotate(${-shape.angleDeg} ${px(center.yKm)} ${py(center.zKm)})`}
      className={className}
      fill={`url(#${gradientId})`}
    />
  );

  const threeSigmaOutline = (
    center: { yKm: number; zKm: number },
    shape: Ellipse,
    className: string,
  ) => (
    <ellipse
      cx={px(center.yKm)}
      cy={py(center.zKm)}
      rx={shape.sigmaMajorKm * scale * DISPLAY_SIGMA}
      ry={shape.sigmaMinorKm * scale * DISPLAY_SIGMA}
      transform={`rotate(${-shape.angleDeg} ${px(center.yKm)} ${py(center.zKm)})`}
      className={`three-sigma-outline ${className}`}
    />
  );

  const beforeCenter = stage === 1
    ? { yKm: preset.initialBYKm, zKm: preset.initialBZKm }
    : comparisonFlyby?.finalCenter ?? flyby.postNavigationCenter;
  const beforeEllipse = stage === 1
    ? flyby.initialEllipse
    : comparisonFlyby?.finalEllipse ?? flyby.preBurn2Ellipse;
  const afterCenter = stage === 1 ? flyby.burn1Center : flyby.finalCenter;
  const afterEllipse = stage === 1 ? flyby.burn1Ellipse : flyby.finalEllipse;
  const areaRatio = afterEllipse.areaKm2 / Math.max(beforeEllipse.areaKm2, 1e-9);
  const observationAreaRatio = flyby.preBurn2Ellipse.areaKm2 / Math.max(flyby.burn1Ellipse.areaKm2, 1e-9);
  return (
    <section className="panel bplane-panel" aria-labelledby="bplane-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">通過位置マップ（Bプレーン）</span>
          <h2 id="bplane-title">{stage === 1 ? "1回目でトリフネへ近づける" : "2回目で安全な観測コースへ仕上げる"}</h2>
        </div>
        <span className="status-dot">LIVE</span>
      </div>
      <p className="help-text">
        {stage === 1
          ? "色が濃いほど通りやすく、外側ほど可能性が低くなります。色が消えるあたりを3σの目安にしています。"
          : "黄色は1回目の後、灰色は追加の観察後、水色は2回目の後です。濃い中心ほど通りやすい予想です。"}
      </p>
      <div className="zoom-controls" aria-label="Bプレーン表示範囲">
        {[40, 12, 4].map((radius) => (
          <button
            className={viewRadius === radius ? "active" : ""}
            key={radius}
            type="button"
            onClick={() => setViewRadius(radius)}
          >
            {radius === 40 ? "全体" : `${radius} km圏`}
          </button>
        ))}
      </div>
      <div className="bplane-frame">
        <svg className="bplane" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="トリフネの近くを通る場所と予想範囲">
          <defs>
            <radialGradient id="spaceGlow"><stop offset="0%" stopColor="#14355a" /><stop offset="100%" stopColor="#071320" /></radialGradient>
            <radialGradient id="amberDistribution">
              <stop offset="0%" stopColor="#ffcf70" stopOpacity=".42" />
              <stop offset="38%" stopColor="#ffcf70" stopOpacity=".23" />
              <stop offset="72%" stopColor="#ffcf70" stopOpacity=".08" />
              <stop offset="100%" stopColor="#ffcf70" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="amberHistoryDistribution">
              <stop offset="0%" stopColor="#ffcf70" stopOpacity=".22" />
              <stop offset="45%" stopColor="#ffcf70" stopOpacity=".11" />
              <stop offset="100%" stopColor="#ffcf70" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="comparisonDistribution">
              <stop offset="0%" stopColor="#a6b2bd" stopOpacity=".30" />
              <stop offset="42%" stopColor="#a6b2bd" stopOpacity=".14" />
              <stop offset="100%" stopColor="#a6b2bd" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="finalDistribution">
              <stop offset="0%" stopColor="#63e6ff" stopOpacity=".50" />
              <stop offset="38%" stopColor="#63e6ff" stopOpacity=".27" />
              <stop offset="72%" stopColor="#63e6ff" stopOpacity=".09" />
              <stop offset="100%" stopColor="#63e6ff" stopOpacity="0" />
            </radialGradient>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#63e6ff" /></marker>
          </defs>
          <rect width={SIZE} height={SIZE} rx="18" fill="url(#spaceGlow)" />
          <circle cx={CENTER} cy={CENTER} r={30 * scale} className="zone far-zone" />
          <circle cx={CENTER} cy={CENTER} r={preset.recommendedMaxRadiusKm * scale} className="zone recommended-zone" />
          <circle cx={CENTER} cy={CENTER} r={preset.highResolutionMaxRadiusKm * scale} className="zone priority-zone" />
          <circle cx={CENTER} cy={CENTER} r={preset.cautionRadiusKm * scale} className="zone caution-zone" />
          <circle cx={CENTER} cy={CENTER} r={preset.dangerRadiusKm * scale} className="zone danger-zone" />
          <circle cx={CENTER} cy={CENTER} r={preset.asteroidMaxRadiusKm * scale} className="asteroid-body" />
          {[-30, -20, -10, -5, -2, 2, 5, 10, 20, 30].filter((value) => Math.abs(value) < viewRadius).map((value) => (
            <g key={value}>
              <line x1={px(value)} y1="12" x2={px(value)} y2={SIZE - 12} className="grid-line" />
              <line x1="12" y1={py(value)} x2={SIZE - 12} y2={py(value)} className="grid-line" />
            </g>
          ))}
          <line x1="12" y1={CENTER} x2={SIZE - 12} y2={CENTER} className="axis-line" />
          <line x1={CENTER} y1="12" x2={CENTER} y2={SIZE - 12} className="axis-line" />
          <line x1={px(beforeCenter.yKm)} y1={py(beforeCenter.zKm)} x2={px(afterCenter.yKm)} y2={py(afterCenter.zKm)} className={stage === 1 ? "burn1-line" : "trajectory-line"} markerEnd="url(#arrow)" />
          {stage === 2 && ellipse(flyby.burn1Center, flyby.burn1Ellipse, "observation-before-ellipse", "amberHistoryDistribution")}
          {stage === 2 && (
            <line
              x1={px(flyby.burn1Center.yKm)}
              y1={py(flyby.burn1Center.zKm)}
              x2={px(flyby.postNavigationCenter.yKm)}
              y2={py(flyby.postNavigationCenter.zKm)}
              className="observation-update-line"
            />
          )}
          {stage === 2 && (
            <circle
              cx={px(flyby.burn1Center.yKm)}
              cy={py(flyby.burn1Center.zKm)}
              r="3"
              className="burn1-point"
            />
          )}
          {ellipse(beforeCenter, beforeEllipse, "comparison-ellipse", "comparisonDistribution")}
          {ellipse(
            afterCenter,
            afterEllipse,
            stage === 1 ? "burn1-ellipse" : "final-ellipse",
            stage === 1 ? "amberDistribution" : "finalDistribution",
          )}
          {stage === 2 && threeSigmaOutline(flyby.burn1Center, flyby.burn1Ellipse, "outline-history")}
          {threeSigmaOutline(beforeCenter, beforeEllipse, "outline-comparison")}
          {threeSigmaOutline(afterCenter, afterEllipse, stage === 1 ? "outline-burn1" : "outline-final")}
          <circle cx={px(beforeCenter.yKm)} cy={py(beforeCenter.zKm)} r="4" className="initial-point" />
          <circle cx={px(afterCenter.yKm)} cy={py(afterCenter.zKm)} r="6" className={stage === 1 ? "burn1-point" : "after-point"} />
          <circle cx={CENTER} cy={CENTER} r="3" className="asteroid" />
          <text x={SIZE - 14} y={CENTER - 8} textAnchor="end" className="axis-label">+B_y</text>
          <text x={CENTER + 8} y="22" className="axis-label">+B_z</text>
        </svg>
        <div className="map-readout">
          {stage === 2 && (
            <span>追加観察でせまくなった範囲 <strong>{flyby.burn1Ellipse.areaKm2.toFixed(2)} → {flyby.preBurn2Ellipse.areaKm2.toFixed(2)} km²</strong></span>
          )}
          <span>通り道の広さ（3σ） <strong>{beforeEllipse.areaKm2.toFixed(2)} → {afterEllipse.areaKm2.toFixed(2)} km²</strong></span>
          <span>{stage === 2 ? "追加観察後の比" : "広さの変化"} <strong>{stage === 2 ? observationAreaRatio.toFixed(2) : areaRatio.toFixed(2)}×</strong></span>
        </div>
      </div>
      <div className="legend" aria-label="Bプレーン凡例">
        {stage === 2 && <span><i className="legend-observation-before" />1回目の後</span>}
        <span><i className="legend-comparison" />今回の修正前</span>
        <span><i className={stage === 1 ? "legend-burn1" : "legend-after"} />今回の修正後（破線が3σ）</span>
        <span><i className="legend-asteroid" />トリフネ本体</span>
        <span><i className="legend-danger" />赤い危険エリア</span>
      </div>
      <div className="zone-legend" aria-label="トリフネからの距離エリア">
        <strong>円の色と中心からの距離</strong>
        <div>
          <span><i className="zone-key asteroid-key" />トリフネ本体：約0.42 km</span>
          <span><i className="zone-key danger-key" />赤：0.75 km以内</span>
          <span><i className="zone-key caution-key" />オレンジ：1 km以内</span>
          <span><i className="zone-key priority-key" />黄：1〜3 km・近くで見る</span>
          <span><i className="zone-key recommended-key" />青：3〜10 km・安全に見る</span>
          <span><i className="zone-key far-key" />破線：30 km</span>
        </div>
      </div>
    </section>
  );
}
