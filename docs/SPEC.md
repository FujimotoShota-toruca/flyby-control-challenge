# SPEC.md

# Flyby Control Challenge v0.1 実装仕様

## 1. 概要

`Flyby Control Challenge` は、はやぶさ2・トリフネフライバイを題材にした非公式教育用Webアプリである。団員は `ΔV_y` と `ΔV_z` を操作し、Bプレーン上の通過点を動かしながら、安全でよく観測できるフライバイ作戦を考える。

本仕様はv0.1の実装対象を定義する。

## 2. 技術スタック

- React
- Vite
- TypeScript
- CSS Modulesまたは通常CSS
- SVGまたはCanvasによる2D描画
- GitHub Pages配信
- 完全静的Webアプリ

外部API、CDN、外部フォント、外部画像読み込み、サーバー通信は使わない。

## 3. ディレクトリ構成案

```txt
flyby-control-challenge/
  README.md
  AGENTS.md
  DECISIONS.md
  SPEC.md
  WORKSHEET.md
  MENTOR_CHEATSHEET.md
  package.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    components/
      MissionIntro.tsx
      BPlanePanel.tsx
      DeltaVControls.tsx
      ScoreSummary.tsx
      FlybyReplay.tsx
      ResultCard.tsx
      AboutPanel.tsx
    lib/
      missionPresets.ts
      flybyModel.ts
      scoring.ts
      strategyType.ts
      format.ts
    styles/
      global.css
    test/
      flybyModel.test.ts
      scoring.test.ts
```

## 4. 固定パラメータ

`src/lib/missionPresets.ts` に定義する。

```ts
export const standardMissionPreset = {
  id: "standard",
  title: "トリフネ フライバイ標準シナリオ",
  vInfKmPerSec: 5.25,
  displayVInf: "約5 km/s",
  tGoSec: 43200,
  initialBYKm: 8.0,
  initialBZKm: -12.0,
  deltaVMinMps: -0.20,
  deltaVMaxMps: 0.20,
  deltaVStepMps: 0.01,
  dangerRadiusKm: 0.5,
  cautionRadiusKm: 1.0,
  observationPriorityRadiusKm: 2.0,
  recommendedMinRadiusKm: 2.0,
  recommendedMaxRadiusKm: 10.0,
  farRadiusKm: 30.0,
};
```

値は教育用固定パラメータであり、実運用条件を再現するものではない。

## 5. 入力

団員が直接操作する入力は2つのみ。

- `ΔV_y`：横方向の速度調整 `[m/s]`
- `ΔV_z`：縦方向の速度調整 `[m/s]`

範囲はそれぞれ `-0.20 m/s` から `+0.20 m/s`、ステップは `0.01 m/s` とする。

v0.1では以下を操作させない。

- TCMタイミング
- 観測開始時刻
- 観測機器
- カメラ向き
- 誤差レベル
- 難易度

## 6. Bプレーン計算

```ts
bYAfterKm = initialBYKm + deltaVYMps * tGoSec / 1000;
bZAfterKm = initialBZKm + deltaVZMps * tGoSec / 1000;
dCAKm = Math.sqrt(bYAfterKm ** 2 + bZAfterKm ** 2);
deltaVTotalMps = Math.sqrt(deltaVYMps ** 2 + deltaVZMps ** 2);
safetyMarginKm = dCAKm - dangerRadiusKm;
```

`dCAKm` が `dangerRadiusKm` 未満の場合、安全条件未達とする。

## 7. 観測状態

厳密な視野判定は行わず、距離に基づく観測状態を用いる。

```txt
r(t) <= 10 km           高解像度観測域
10 km < r(t) <= 30 km   観測可能域
30 km < r(t)            遠距離
```

## 8. フライバイ再生

標準完成目標とする。最低完成条件ではない。

簡易モデル：

```ts
xKm = vInfKmPerSec * tSec;
rKm = Math.sqrt(xKm ** 2 + dCAKm ** 2);
```

推奨再生範囲：

- `t = -300 s` から `t = +60 s`
- 現在時刻、トリフネからの距離、観測状態を表示する。

v0.1では2D表示でよい。時間がある場合のみ、最近接付近を簡易3D・疑似3D演出にする。

## 9. スコア計算

合計100点。

```txt
観測スコア       40点
安全スコア       40点
ΔV効率           10点
照準バランス     10点
```

### 9.1 観測スコア案

距離が近いほど高い。ただし危険領域では安全条件未達として総合評価を下げる。

```ts
function observationScore(dCAKm: number): number {
  if (dCAKm < 0.5) return 35;       // 観測上は近いが危険
  if (dCAKm < 1.0) return 38;
  if (dCAKm < 2.0) return 40;
  if (dCAKm <= 10.0) return 40 - (dCAKm - 2.0) * 1.5;
  if (dCAKm <= 30.0) return Math.max(5, 28 - (dCAKm - 10.0) * 1.0);
  return 5;
}
```

実装時は、0〜40点に丸める。

### 9.2 安全スコア案

危険領域では0点。遠ざかるほど高くなるが、過度に遠いことは観測スコアで不利になる。

```ts
function safetyScore(dCAKm: number): number {
  if (dCAKm < 0.5) return 0;
  if (dCAKm < 1.0) return 10;
  if (dCAKm < 2.0) return 25;
  if (dCAKm <= 10.0) return 40;
  if (dCAKm <= 30.0) return 40;
  return 40;
}
```

### 9.3 ΔV効率スコア案

少ない `ΔV` ほど高い。

```ts
function deltaVEfficiencyScore(deltaVTotalMps: number): number {
  const maxUseful = 0.25;
  const raw = 10 * (1 - deltaVTotalMps / maxUseful);
  return clamp(raw, 0, 10);
}
```

### 9.4 照準バランススコア案

Bプレーン上で、過度に片軸へ偏らず、説明しやすい通過点を評価する。

```ts
function aimingBalanceScore(bYKm: number, bZKm: number): number {
  const absY = Math.abs(bYKm);
  const absZ = Math.abs(bZKm);
  const maxAxis = Math.max(absY, absZ, 1e-6);
  const minAxis = Math.min(absY, absZ);
  const ratio = minAxis / maxAxis;
  return 5 + 5 * ratio;
}
```

照準バランスは教材的な補助評価であり、厳密な軌道評価ではない。

## 10. 作戦タイプ判定

推奨ロジック：

```txt
d_CA < dangerRadius        危険領域
0.5 <= d_CA < 1.0          攻めすぎ型
1.0 <= d_CA < 2.0          観測重視型
2.0 <= d_CA <= 10.0        バランス型
10.0 < d_CA <= 30.0        安全重視型
30.0 < d_CA                遠すぎ型
ΔV_total が極端に小さく初期点と大差ない場合 調整不足型
```

判定順では、危険領域を最優先する。

## 11. 画面構成

### 11.1 トップ画面

表示内容：

- アプリ名：`Flyby Control Challenge`
- 副題：`はやぶさ2・トリフネフライバイを題材にした非公式教育シミュレーション`
- 短い説明：`ΔVでBプレーン上の通過点を動かし、安全でよく観測できるフライバイ作戦を考えよう。`
- 開始ボタン
- 短い非公式注記

### 11.2 操作画面

スマホでは縦積み。PCでは2カラム可。

必須表示：

- Bプレーン図
- 修正前予測点
- 修正後予測点
- 危険領域
- おすすめ観測領域
- 安全だが遠い領域
- `ΔV_y` スライダー
- `ΔV_z` スライダー
- `d_CA`
- 安全余裕
- 予想ミッションスコア
- 結果を見るボタン
- リセットボタン

### 11.3 結果画面

必須表示：

- ミッションスコア `[点]`
- 作戦タイプ
- 最近接距離 `d_CA [km]`
- 安全余裕 `[km]`
- `ΔV合計 [m/s]`
- 観測スコア `[点]`
- 安全スコア `[点]`
- `ΔV` 効率 `[点]`
- 照準バランス `[点]`
- 作戦コメント
- もう一度挑戦ボタン

ワークシートに記入する値が一目で見つかること。

### 11.4 About

表示内容：

- 非公式教育シミュレーションであること。
- 実運用再現ではないこと。
- `ΔV` とBプレーンの簡単な説明。
- 参考資料リンクまたは参考資料名。
- 固定パラメータ簡略モデルであること。

## 12. レスポンシブ要件

主対象はスマートフォン縦画面。

スマホ：

```txt
上：タイトル・主要値
中：Bプレーン
下：ΔVスライダー
下部：結果ボタン・詳細表示
```

PC：

```txt
左：Bプレーン／フライバイ再生
右：ΔV操作／スコア／結果カード
```

横画面専用UI、ピンチズーム必須UI、複雑なジェスチャ操作は禁止。

## 13. UI文言

### 基本説明

```txt
ΔVとは、探査機の速度を少し変えることです。
小さなΔVでも、時間がたつとトリフネの近くを通る位置が変わります。
この通過位置をBプレーン上の点として見てみましょう。
```

```txt
Bプレーンとは、小惑星の近くをどのあたりで通るかを見る地図です。
```

### 非公式注記

```txt
本アプリは非公式教材です。軌道・スコアは教育用に簡略化しています。
```

または：

```txt
非公式教育シミュレーション｜実際の運用を再現するものではありません
```

## 14. 結果コメント例

### バランス型

```txt
観測と安全のバランスがよい作戦です。近すぎず遠すぎない通過位置を選べています。
```

### 観測重視型

```txt
近くを通ってよく観測しようとする作戦です。観測スコアは高めですが、安全余裕も確認しましょう。
```

### 安全重視型

```txt
安全余裕を大きく取った作戦です。もう少し近づけると、観測スコアが上がるかもしれません。
```

### 攻めすぎ型

```txt
かなり近い通過位置です。観測には有利ですが、本物の探査では安全の余裕が重要です。
```

### 遠すぎ型

```txt
安全ですが、トリフネから遠いため観測しにくい作戦です。少し近づける調整を試してみましょう。
```

### 危険領域

```txt
危険領域に入っています。安全に観測するため、もう少し外側を通るようにΔVを調整しましょう。
```

## 15. 受け入れ条件

- `npm run build` が成功する。
- スマートフォン縦画面で操作可能。
- `ΔV_y` と `ΔV_z` を動かすとBプレーン上の点が即時に更新される。
- 結果カードの値がワークシート欄と一致する。
- 外部API通信が発生しない。
- GitHub Pages上でアセットパスが壊れない。
- 危険領域時に破壊的表現を出さない。
- Aboutまたはトップ画面に非公式教材であることを表示する。
- ランキング、ログイン、サーバー集計が存在しない。

## 16. 将来拡張候補

優先度順：

1. フライバイ再生の演出強化。
2. 最近接付近の簡易3D・疑似3D表示。
3. 複数ミッションプリセット。
4. 誤差円・安全マージンの表示強化。
5. メンター用デモモード。
6. 事前計算済み軌道データとの比較表示。

v0.1では、拡張よりも当日確実に動く中核機能を優先する。
