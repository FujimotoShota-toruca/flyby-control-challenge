import type { FlybyResult } from "../lib/flybyModel";
import type { MissionPreset } from "../lib/missionPresets";

type Props = {
  preset: MissionPreset;
  flyby: FlybyResult;
};

const VIEW_RADIUS = 32;
const SIZE = 360;
const CENTER = SIZE / 2;
const SCALE = CENTER / VIEW_RADIUS;

const px = (km: number) => CENTER + km * SCALE;
const py = (km: number) => CENTER - km * SCALE;

export function BPlanePanel({ preset, flyby }: Props) {
  const initialX = px(preset.initialBYKm);
  const initialY = py(preset.initialBZKm);
  const afterX = px(flyby.bYAfterKm);
  const afterY = py(flyby.bZAfterKm);

  return (
    <section className="panel bplane-panel" aria-labelledby="bplane-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">B-PLANE PREDICTION</span>
          <h2 id="bplane-title">Bプレーン予測</h2>
        </div>
        <span className="status-dot">LIVE</span>
      </div>
      <p className="help-text">
        Bプレーンは、小惑星の近くをどのあたりで通るかを見る地図です。
      </p>

      <div className="bplane-frame">
        <svg
          className="bplane"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`修正後の予測通過点 B_y ${flyby.bYAfterKm.toFixed(1)} km、B_z ${flyby.bZAfterKm.toFixed(1)} km`}
        >
          <defs>
            <radialGradient id="spaceGlow">
              <stop offset="0%" stopColor="#14355a" />
              <stop offset="100%" stopColor="#071320" />
            </radialGradient>
            <filter id="pointGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L7,3 z" fill="#63e6ff" />
            </marker>
          </defs>

          <rect width={SIZE} height={SIZE} rx="18" fill="url(#spaceGlow)" />
          <circle cx={CENTER} cy={CENTER} r={30 * SCALE} className="zone far-zone" />
          <circle cx={CENTER} cy={CENTER} r={10 * SCALE} className="zone recommended-zone" />
          <circle cx={CENTER} cy={CENTER} r={2 * SCALE} className="zone priority-zone" />
          <circle cx={CENTER} cy={CENTER} r={1 * SCALE} className="zone caution-zone" />
          <circle cx={CENTER} cy={CENTER} r={0.5 * SCALE} className="zone danger-zone" />

          {[-20, -10, 10, 20].map((value) => (
            <g key={value}>
              <line x1={px(value)} y1="12" x2={px(value)} y2={SIZE - 12} className="grid-line" />
              <line x1="12" y1={py(value)} x2={SIZE - 12} y2={py(value)} className="grid-line" />
            </g>
          ))}
          <line x1="12" y1={CENTER} x2={SIZE - 12} y2={CENTER} className="axis-line" />
          <line x1={CENTER} y1="12" x2={CENTER} y2={SIZE - 12} className="axis-line" />

          <line
            x1={initialX}
            y1={initialY}
            x2={afterX}
            y2={afterY}
            className="trajectory-line"
            markerEnd="url(#arrow)"
          />
          <circle cx={initialX} cy={initialY} r="5" className="initial-point" />
          <circle cx={afterX} cy={afterY} r="7" className="after-point" filter="url(#pointGlow)" />
          <circle cx={CENTER} cy={CENTER} r="5" className="asteroid" />

          <text x={SIZE - 14} y={CENTER - 8} textAnchor="end" className="axis-label">+B_y</text>
          <text x={CENTER + 8} y="22" className="axis-label">+B_z</text>
          <text x={CENTER + 8} y={CENTER + 18} className="center-label">トリフネ</text>
        </svg>
        <div className="map-readout">
          <span>B_y <strong>{flyby.bYAfterKm.toFixed(1)} km</strong></span>
          <span>B_z <strong>{flyby.bZAfterKm.toFixed(1)} km</strong></span>
        </div>
      </div>

      <div className="legend" aria-label="Bプレーン凡例">
        <span><i className="legend-after" />ΔV後予測点</span>
        <span><i className="legend-before" />修正前予測点</span>
        <span><i className="legend-recommended" />おすすめ観測領域</span>
        <span><i className="legend-danger" />危険領域</span>
      </div>
    </section>
  );
}
