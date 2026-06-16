# 得点ポテンシャル図版

現行の採点式を中心距離 `0〜10 km`、刻み `0.01 km` で直接計算した高解像度PNGです。

- `score-potential-vs-distance.png`
  - 横軸：トリフネ中心からの距離。
  - 縦軸：科学的意義得点、安全得点、両者の合計。
  - 予想分布が一点に集まった場合の距離ポテンシャルを示す。
- `science-safety-tradeoff.png`
  - 横軸：科学的意義得点。
  - 縦軸：安全得点。
  - 曲線上の各点が中心距離に対応し、両得点のトレードオフを示す。
- `score-potential-data.csv`
  - PNGに使用した数値データ。別のグラフ作成や検算に利用できる。

再生成：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate_score_figures.ps1
```

この環境にはPython・Matplotlibが入っていないため、同じ数式を直接計算するPowerShell/System.Drawingスクリプトで生成しています。図中の値は `src/lib/scoring.ts` と一致します。
- `bplane-scientific-value-contour.png`
  - Bプレーン上の科学的意義ポテンシャル。中心から0.42 km未満の衝突コースは0。
- `bplane-safety-contour.png`
  - Bプレーン上の安全ポテンシャル。危険半径0.75 kmから3 kmまで増加する。
- `bplane-total-score-contour.png`
  - 各点における科学的意義50点と安全50点の合計ポテンシャル。
