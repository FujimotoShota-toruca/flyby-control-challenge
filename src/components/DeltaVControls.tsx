import type { MissionPreset } from "../lib/missionPresets";
import { formatSigned } from "../lib/format";

type Props = {
  preset: MissionPreset;
  deltaVY: number;
  deltaVZ: number;
  onDeltaVYChange: (value: number) => void;
  onDeltaVZChange: (value: number) => void;
  onReset: () => void;
  onShowResult: () => void;
};

type SliderProps = {
  id: string;
  label: string;
  direction: string;
  value: number;
  preset: MissionPreset;
  onChange: (value: number) => void;
};

function DeltaVSlider({ id, label, direction, value, preset, onChange }: SliderProps) {
  return (
    <label className="slider-control" htmlFor={id}>
      <span className="slider-label">
        <span>
          <strong>{label}</strong>
          <small>{direction}</small>
        </span>
        <output>{formatSigned(value)} <small>m/s</small></output>
      </span>
      <input
        id={id}
        type="range"
        min={preset.deltaVMinMps}
        max={preset.deltaVMaxMps}
        step={preset.deltaVStepMps}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="range-labels"><span>-0.20</span><span>0</span><span>+0.20</span></span>
    </label>
  );
}

export function DeltaVControls(props: Props) {
  return (
    <section className="panel controls-panel" aria-labelledby="controls-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TRAJECTORY CORRECTION</span>
          <h2 id="controls-title">ΔVを調整</h2>
        </div>
        <span className="tgo">T-12 h</span>
      </div>
      <p className="help-text">
        ΔVは、探査機の速度を少し変えること。小さな調整でも、時間がたつと通過位置が動きます。
      </p>
      <div className="sliders">
        <DeltaVSlider
          id="delta-v-y"
          label="ΔV_y"
          direction="横方向の速度調整"
          value={props.deltaVY}
          preset={props.preset}
          onChange={props.onDeltaVYChange}
        />
        <DeltaVSlider
          id="delta-v-z"
          label="ΔV_z"
          direction="縦方向の速度調整"
          value={props.deltaVZ}
          preset={props.preset}
          onChange={props.onDeltaVZChange}
        />
      </div>
      <div className="button-row">
        <button className="button secondary" type="button" onClick={props.onReset}>リセット</button>
        <button className="button primary" type="button" onClick={props.onShowResult}>結果を見る</button>
      </div>
    </section>
  );
}
