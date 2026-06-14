import { useMemo, useState } from "react";
import { AboutPanel } from "./components/AboutPanel";
import { BPlanePanel } from "./components/BPlanePanel";
import { DeltaVControls } from "./components/DeltaVControls";
import { ResultCard } from "./components/ResultCard";
import { ScoreSummary } from "./components/ScoreSummary";
import { calculateFlyby } from "./lib/flybyModel";
import { standardMissionPreset } from "./lib/missionPresets";
import { calculateScores } from "./lib/scoring";
import { getStrategy } from "./lib/strategyType";

function App() {
  const [deltaVY, setDeltaVY] = useState(0);
  const [deltaVZ, setDeltaVZ] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const preset = standardMissionPreset;

  const flyby = useMemo(() => calculateFlyby(preset, deltaVY, deltaVZ), [preset, deltaVY, deltaVZ]);
  const scores = useMemo(() => calculateScores(flyby), [flyby]);
  const strategy = useMemo(() => getStrategy(flyby, preset), [flyby, preset]);

  const reset = () => {
    setDeltaVY(0);
    setDeltaVZ(0);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <div className="mission-mark" aria-hidden="true"><span /></div>
          <div>
            <span className="eyebrow">FLYBY OPERATIONS LAB</span>
            <h1>Flyby Control Challenge</h1>
            <p>ΔVで通過位置を動かし、安全でよく観測できる作戦を考えよう。</p>
          </div>
        </div>
      </header>

      <main>
        <div className="mission-strip">
          <span><i /> MISSION ACTIVE</span>
          <strong>{preset.title}</strong>
          <span>相対速度 {preset.displayVInf}</span>
        </div>
        <div className="workspace">
          <BPlanePanel preset={preset} flyby={flyby} />
          <div className="right-column">
            <ScoreSummary flyby={flyby} scores={scores} strategy={strategy} />
            <DeltaVControls
              preset={preset}
              deltaVY={deltaVY}
              deltaVZ={deltaVZ}
              onDeltaVYChange={setDeltaVY}
              onDeltaVZChange={setDeltaVZ}
              onReset={reset}
              onShowResult={() => setShowResult(true)}
            />
          </div>
        </div>
        <AboutPanel />
        <p className="disclaimer">本アプリは非公式教材です。軌道・スコアは教育用に簡略化しています。</p>
      </main>

      {showResult && (
        <ResultCard
          deltaVY={deltaVY}
          deltaVZ={deltaVZ}
          flyby={flyby}
          scores={scores}
          strategy={strategy}
          onClose={() => setShowResult(false)}
        />
      )}
    </>
  );
}

export default App;
