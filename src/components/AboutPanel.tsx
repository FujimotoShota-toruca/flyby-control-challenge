export function AboutPanel() {
  return (
    <details className="about-panel panel">
      <summary>このシミュレーションについて</summary>
      <div className="about-content">
        <p>
          <strong>ΔV</strong>は、探査機の速度を少し変えることです。
          <strong>Bプレーン</strong>は、小惑星の近くをどのあたりで通るかを見る地図です。
        </p>
        <p>
          このアプリは、はやぶさ2・トリフネフライバイを題材にした非公式教材です。
          固定パラメータによる教育用簡略モデルであり、実際の軌道や運用を再現するものではありません。
        </p>
      </div>
    </details>
  );
}
