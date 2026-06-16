type Props = {
  current: 1 | 2 | 3 | 4;
};

export function OperationProgress({ current }: Props) {
  const steps = ["1回目で近づける", "2回目で仕上げる", "フライバイ再生", "作戦の結果"];

  return (
    <nav className="operation-progress" aria-label="運用進行状況">
      {steps.map((label, index) => {
        const step = index + 1;
        return (
          <div className={step === current ? "active" : step < current ? "complete" : ""} key={label}>
            <span>{step < current ? "✓" : step}</span>
            <strong>{label}</strong>
          </div>
        );
      })}
    </nav>
  );
}
