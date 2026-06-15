import { useMemo, useState } from "react";
import { AboutPanel } from "./components/AboutPanel";
import { BPlanePanel } from "./components/BPlanePanel";
import { DeltaVControls } from "./components/DeltaVControls";
import { OperationProgress } from "./components/OperationProgress";
import { ResultCard } from "./components/ResultCard";
import {
  calculateTwoBurnFlyby,
  fitCommandToBudget,
  type DeltaVCommand,
} from "./lib/flybyModel";
import { standardMissionPreset } from "./lib/missionPresets";
import { getMissionFeedback } from "./lib/missionFeedback";
import { calculateScores } from "./lib/scoring";

type OperationStage = 1 | 2 | 3;
const ZERO_COMMAND: DeltaVCommand = { yMps: 0, zMps: 0 };
const createObservationSeed = () => Math.floor(Math.random() * 1_000_000_000);

function App() {
  const [stage, setStage] = useState<OperationStage>(1);
  const [burn1, setBurn1] = useState<DeltaVCommand>(ZERO_COMMAND);
  const [burn2, setBurn2] = useState<DeltaVCommand>(ZERO_COMMAND);
  const [observationSeed, setObservationSeed] = useState(createObservationSeed);
  const preset = standardMissionPreset;

  const flyby = useMemo(
    () => calculateTwoBurnFlyby(preset, burn1, burn2, observationSeed),
    [preset, burn1, burn2, observationSeed],
  );
  const beforeBurn2Flyby = useMemo(
    () => calculateTwoBurnFlyby(preset, burn1, ZERO_COMMAND, observationSeed),
    [preset, burn1, observationSeed],
  );
  const scores = useMemo(() => calculateScores(flyby, preset), [flyby, preset]);
  const feedback = useMemo(
    () => getMissionFeedback(flyby, scores, preset),
    [flyby, scores, preset],
  );
  const operationStage: 1 | 2 = stage === 1 ? 1 : 2;

  const restart = () => {
    setBurn1(ZERO_COMMAND);
    setBurn2(ZERO_COMMAND);
    setObservationSeed(createObservationSeed());
    setStage(1);
  };

  const goToStage2 = () => {
    setBurn2(ZERO_COMMAND);
    setObservationSeed(createObservationSeed());
    setStage(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBackToStage1 = () => {
    setBurn2(ZERO_COMMAND);
    setStage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // A flyby replay stage can be inserted here later before moving to stage 3.
  const completeOperations = () => {
    setStage(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <div className="mission-mark" aria-hidden="true"><span /></div>
          <div>
            <span className="eyebrow">FLYBY OPERATIONS LAB</span>
            <h1>Flyby Control Challenge</h1>
            <p>探査機の速度を2回変えて、安全によく見える通り道を作ろう。</p>
          </div>
        </div>
      </header>

      <main>
        <div className="mission-strip">
          <span><i /> チャレンジ中</span>
          <strong>{preset.title}</strong>
          <span>相対速度 {preset.displayVInf}</span>
        </div>
        <OperationProgress current={stage} />

        {stage < 3 ? (
          <div className="workspace">
            <BPlanePanel
              preset={preset}
              flyby={flyby}
              stage={operationStage}
              comparisonFlyby={stage === 2 ? beforeBurn2Flyby : undefined}
            />
            <div className="right-column">
              <DeltaVControls
                stage={operationStage}
                preset={preset}
                command={stage === 1 ? burn1 : burn2}
                flyby={flyby}
                comparisonFlyby={stage === 2 ? beforeBurn2Flyby : undefined}
                onChange={(command) => {
                  if (stage === 1) {
                    setBurn1(fitCommandToBudget(command, ZERO_COMMAND, preset.totalDeltaVBudgetMps));
                  } else {
                    setBurn2(fitCommandToBudget(command, burn1, preset.totalDeltaVBudgetMps));
                  }
                }}
                onBack={stage === 2 ? goBackToStage1 : undefined}
                onReset={() => stage === 1 ? setBurn1(ZERO_COMMAND) : setBurn2(ZERO_COMMAND)}
                onConfirm={stage === 1 ? goToStage2 : completeOperations}
              />
              {stage === 2 && (
                <section className="panel operation-log">
                  <span className="eyebrow">1回目の記録</span>
                  <h2>1回目の速度変更が完了</h2>
                  <p>使ったΔV: <strong>{flyby.deltaV1Mps.toFixed(3)} m/s</strong></p>
                  <p>1回目後の中心までの距離: <strong>{Math.hypot(flyby.burn1Center.yKm, flyby.burn1Center.zKm).toFixed(2)} km</strong></p>
                  <p>2回目に残したΔV: <strong>{(preset.totalDeltaVBudgetMps - flyby.deltaV1Mps).toFixed(3)} m/s</strong></p>
                </section>
              )}
            </div>
          </div>
        ) : (
          <ResultCard
            burn1={burn1}
            burn2={burn2}
            flyby={flyby}
            scores={scores}
            feedback={feedback}
            onBack={() => setStage(2)}
            onRestart={restart}
          />
        )}

        <AboutPanel />
        <p className="disclaimer">本アプリは非公式教材です。軌道・誤差分布・スコアは教育用に簡略化しています。</p>
      </main>
    </>
  );
}

export default App;
