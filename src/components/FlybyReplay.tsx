import { useEffect, useMemo, useRef, useState } from "react";
import type { BPlanePoint, FlybyResult } from "../lib/flybyModel";
import {
  calculateReplayState,
  imagingDistanceKm,
  REPLAY_CLOSEST_APPROACH_PROGRESS,
} from "../lib/flybyReplay";
import type { MissionPreset } from "../lib/missionPresets";

type Props = {
  flyby: FlybyResult;
  preset: MissionPreset;
  trajectoryPoint: BPlanePoint;
  onBack: () => void;
  onComplete: () => void;
};

const REPLAY_DURATION_MS = 8_000;
const SHUTTER_TIMES_SEC = [-12, -8, -4, -1, 3];
const CAMERA_FOV_RAD = 0.105;

function apparentAsteroidSizePx(distanceKm: number, preset: MissionPreset): number {
  const angularDiameter = (preset.asteroidMaxRadiusKm * 2) / Math.max(distanceKm, 0.001);
  const frameHeightPx = 96;
  return Math.min(72, Math.max(5, (angularDiameter / CAMERA_FOV_RAD) * frameHeightPx));
}

export function FlybyReplay({ flyby, preset, trajectoryPoint, onBack, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const progressRef = useRef(0);
  const trajectoryClosestApproachKm = Math.hypot(trajectoryPoint.yKm, trajectoryPoint.zKm);

  useEffect(() => {
    if (!isPlaying) return;
    const startedAt = performance.now();
    const startedProgress = progressRef.current;
    let frame = 0;

    const animate = (now: number) => {
      const nextProgress = Math.min(
        1,
        startedProgress + (now - startedAt) / REPLAY_DURATION_MS,
      );
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (nextProgress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const replay = calculateReplayState(
    progress,
    trajectoryClosestApproachKm,
    preset.vInfKmPerSec,
  );
  const asteroidX = 80 + REPLAY_CLOSEST_APPROACH_PROGRESS * 740;
  const visualXForTime = (tSec: number) => asteroidX + Math.tanh(tSec / 24) * 340;
  const spacecraftX = visualXForTime(replay.tSec);
  const passDirection = trajectoryPoint.zKm >= 0 ? -1 : 1;
  const passOffset = Math.min(110, 18 + trajectoryClosestApproachKm * 10) * passDirection;
  const spacecraftY = 215 + passOffset;
  const trailStart = Math.max(80, spacecraftX - 180);
  const capturedImages = useMemo(
    () => SHUTTER_TIMES_SEC.map((tSec) => ({
      tSec,
      visible: tSec < 0,
      distanceKm: imagingDistanceKm(tSec, trajectoryClosestApproachKm, preset.vInfKmPerSec),
    })),
    [preset.vInfKmPerSec, trajectoryClosestApproachKm],
  );

  const togglePlayback = () => {
    if (progressRef.current >= 1) {
      progressRef.current = 0;
      setProgress(0);
    }
    setIsPlaying((current) => !current || progressRef.current >= 1);
  };

  const restartPlayback = () => {
    progressRef.current = 0;
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <section className="flyby-replay panel" aria-labelledby="flyby-replay-title">
      <div className="replay-heading">
        <div>
          <span className="eyebrow">FLYBY REPLAY</span>
          <h2 id="flyby-replay-title">抽選された1本の通り道を再生</h2>
        </div>
        <span className={`replay-phase phase-${replay.phase}`}>{replay.phase}</span>
      </div>

      <div className="replay-stage">
        <svg viewBox="0 0 900 430" role="img" aria-label="探査機がトリフネの近くを通過する簡易アニメーション">
          <defs>
            <radialGradient id="replay-space">
              <stop stopColor="#163650" />
              <stop offset="1" stopColor="#030a12" />
            </radialGradient>
            <radialGradient id="replay-rock">
              <stop stopColor="#eef5f8" />
              <stop offset=".65" stopColor="#98abb6" />
              <stop offset="1" stopColor="#536b78" />
            </radialGradient>
            <filter id="replay-glow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="900" height="430" rx="20" fill="url(#replay-space)" />
          {[...Array(32)].map((_, index) => (
            <circle
              key={index}
              cx={(index * 137) % 890}
              cy={(index * 83) % 420}
              r={index % 5 === 0 ? 1.6 : .8}
              fill="#d9f4ff"
              opacity={.3 + (index % 4) * .12}
            />
          ))}
          <circle cx={asteroidX} cy="215" r="42" fill="none" stroke="#ff7185" strokeWidth="2" strokeDasharray="8 9" opacity=".35" />
          <ellipse cx={asteroidX} cy="215" rx="18" ry="26" transform={`rotate(-24 ${asteroidX} 215)`} fill="url(#replay-rock)" stroke="#f4fbff" strokeWidth="2" />
          <path d={`M${asteroidX - 10} 202L${asteroidX + 3} 195L${asteroidX + 13} 209L${asteroidX + 6} 230L${asteroidX - 12} 224Z`} fill="none" stroke="#607782" strokeWidth="2" opacity=".7" />
          <circle cx={asteroidX} cy="215" r="4" fill="#ff7185" />
          <text x={asteroidX} y="310" textAnchor="middle" fill="#d8e7ef" fontSize="18" fontWeight="700">トリフネ</text>
          <path d={`M80 ${spacecraftY}H820`} stroke="#63e6ff" strokeWidth="2" strokeDasharray="7 8" opacity=".35" />
          {capturedImages.filter((image) => image.visible).map((image) => {
            const shotX = visualXForTime(image.tSec);
            const captured = replay.tSec >= image.tSec;
            return (
              <g key={image.tSec} opacity={captured ? .9 : .18}>
                <circle cx={shotX} cy={spacecraftY} r="8" fill="none" stroke="#ffcf70" strokeWidth="2" />
                <path d={`M${shotX - 5} ${spacecraftY - 12}L${shotX + 5} ${spacecraftY + 12}`} stroke="#ffcf70" strokeWidth="1.5" />
              </g>
            );
          })}
          <path d={`M${trailStart} ${spacecraftY}H${spacecraftX - 15}`} stroke="#63e6ff" strokeWidth="5" opacity=".55" filter="url(#replay-glow)" />
          <g transform={`translate(${spacecraftX} ${spacecraftY})`} filter="url(#replay-glow)">
            <path d="M-17-7L5-7L17 0L5 7L-17 7L-8 0Z" fill="#eaf8ff" stroke="#63e6ff" strokeWidth="2" />
            <path d="M-9-7V-20M-9 7V20" stroke="#63e6ff" strokeWidth="3" />
            <rect x="-19" y="-26" width="20" height="6" fill="#347cc4" stroke="#8bdcff" />
            <rect x="-19" y="20" width="20" height="6" fill="#347cc4" stroke="#8bdcff" />
          </g>
          <path d={`M${asteroidX} 215V${spacecraftY}`} stroke="#ffcf70" strokeWidth="2" strokeDasharray="5 6" opacity={Math.abs(replay.tSec) <= 10 ? .9 : .25} />
          <text x="25" y="395" fill="#9eb8c8" fontSize="16">最終分布160本から抽選した1本を、教育用直線モデルで再生</text>
        </svg>
        <div className="replay-readout">
          <span>時刻 <strong>{replay.tSec >= 0 ? "+" : ""}{replay.tSec.toFixed(1)} 秒</strong></span>
          <span>トリフネまで <strong>{replay.distanceKm < 100 ? replay.distanceKm.toFixed(2) : replay.distanceKm.toFixed(0)} km</strong></span>
          <span>今回の最接近距離 <strong>{trajectoryClosestApproachKm.toFixed(2)} km</strong></span>
          <span>観察状態 <strong>{replay.observation}</strong></span>
        </div>
      </div>

      <div className="replay-progress" aria-label="フライバイ再生進行">
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <section className="imaging-strip">
        <div>
          <span className="eyebrow">CAMERA SEQUENCE</span>
          <h3>姿勢固定カメラの撮像記録</h3>
          <p>最接近まではトリフネを画面に入れられます。最接近後は姿勢固定のまま通り過ぎるため、同じ向きのカメラには写らない扱いです。</p>
        </div>
        <div className="imaging-frames">
          {capturedImages.map((image) => {
            const captured = replay.tSec >= image.tSec;
            const apparentSize = apparentAsteroidSizePx(image.distanceKm, preset);
            return (
              <div
                className={`imaging-frame ${captured ? "captured" : ""} ${image.visible ? "" : "out-of-view"}`}
                key={image.tSec}
              >
                <span>T{image.tSec >= 0 ? "+" : ""}{image.tSec}s</span>
                <div className="camera-view">
                  {image.visible ? (
                    <i style={{ width: apparentSize, height: apparentSize * 1.35 }} />
                  ) : (
                    <em>視野外</em>
                  )}
                </div>
                <strong>{image.visible ? `${image.distanceKm.toFixed(1)} km` : "写らない"}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <p className="help-text">
        最接近は、画面上で探査機がトリフネの真横を通るT=0秒です。成績は再生後に「成績確認」を押すまで表示されません。
      </p>
      <div className="replay-buttons">
        <button className="button secondary" type="button" onClick={onBack}>2回目へ戻る</button>
        <button className="button secondary" type="button" onClick={togglePlayback}>{isPlaying ? "停止" : "再生"}</button>
        <button className="button secondary" type="button" onClick={restartPlayback}>最初から再生</button>
        <button className="button primary" type="button" onClick={onComplete}>成績確認</button>
      </div>
    </section>
  );
}
