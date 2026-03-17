# 動画完全再現 — Claude Code Phase分割指示書

## 前提

プロジェクトルートに以下の設計書がある。実装時に参照すること。
- `video_analysis_prompt.md` — 理想動画の完全仕様（シーン構成・レイアウト・アニメ・色）
- `動画差分レポート.md` — 現状outputと理想の定量差分分析
- `Remotion設計書.md` — コンポーネント設計・スキーマ・アニメプリセット・レイアウト定数

**この指示書の各Phaseを順番に実装する。**
**各Phase完了時に必ず `pnpm render` でMP4を出力し、ブラウザで目視確認した結果を報告すること。**
**前のPhaseが動作確認できるまで次に進まない。**

---

## 戦略: 「1シーン完全再現 → 全体連結」

一気に全シーン作ると前回の二の舞になる。
まず Rank5 の1シーンだけを理想動画と完全一致させる。
それが動いたら Opening → 全ランキング → Ending を連結する。

---

## Phase 1: 骨格リセット（既存コンポーネントを設計書ベースに置換）

### ゴール
新しいディレクトリ構成とスキーマで、空のcompositionがレンダリングできる状態。

### やること

1. `src/remotion/` 以下を `Remotion設計書.md` セクションB のディレクトリ構成に合わせてリファクタ:

```
src/remotion/
  Root.tsx
  compositions/
    RankingVideoComposition.tsx
  components/
    scene/
      VideoScene.tsx
      OpeningScene.tsx
      RankingScene.tsx
      CtaScene.tsx
    background/
      BackgroundLayer.tsx
      BurstBackground.tsx
    text/
      RankHeader.tsx
      MainTitleText.tsx
      CaptionBox.tsx
    asset/
      AssetImage.tsx
    animation/
      AnimationPreset.ts
      easing.ts
    timeline/
      TimelineController.ts
  constants/
    layout.ts
    timing.ts
    typography.ts
    zIndex.ts
    colors.ts
  types/
    video.ts
    scene.ts
  data/
    sample-video-config.json
```

2. `types/video.ts` と `types/scene.ts` を `Remotion設計書.md` セクションD から作成

3. `constants/` を `Remotion設計書.md` セクションF から作成。特に重要な値:
   - layout.ts: RankHeader zone y=6-20%, Caption zone y=30-62%, Asset zone y=74-95%
   - timing.ts: Opening=102f, Ranking=162f, CTA=63f
   - typography.ts: フォント、縁取り、影の定義

4. `data/sample-video-config.json` を `Remotion設計書.md` セクションD-1 のスキーマに沿って作成。
   **まずRank5のデータ1件だけ入れる**（10件全部はPhase 5で）

5. Root.tsx + RankingVideoComposition.tsx の空実装

6. `pnpm preview` が起動してエラーなく空画面が出ることを確認

### 確認
- [ ] ディレクトリ構成が設計書と一致
- [ ] types, constants が定義済み
- [ ] sample-video-config.json にRank5のデータが入っている
- [ ] `pnpm preview` がエラーなし

---

## Phase 2: サンバースト背景（回転あり）

### ゴール
回転するサンバースト背景が1080x1920で正しく描画される。

### やること

1. `BurstBackground.tsx` を実装:
   - conic-gradient で放射状背景を生成
   - 色: `#FE9D18` と `#FFD34C`（設計書の値）
   - セクター数: 34
   - 中心: (50%, 53%)

2. `BackgroundLayer.tsx` を実装:
   - BurstBackground をラップ
   - `useCurrentFrame()` で回転制御
   - 回転速度: 15°/秒（`rotation = (frame / fps) * 15`）
   - **回転時に角が露出しないよう150%サイズで描画、-25%オフセット**

3. `VideoScene.tsx` に BackgroundLayer を組み込み

4. `pnpm render` で3秒のMP4を出力し、背景が回転していることを確認

### 確認
- [ ] サンバーストが回転している（静止していない）
- [ ] 角が露出していない
- [ ] 色が理想（オレンジ〜ゴールド系）と近い

---

## Phase 3: Rank5 1シーン — テキスト要素

### ゴール
Rank5の1シーンで、第5位 + 赤トピックテキスト + 青枠コメント1 + 赤枠コメント2 が正しいレイアウトで表示される。

### やること

1. `RankHeader.tsx` を実装:
   - 「第5位」を上部中央に表示
   - `Remotion設計書.md` セクションC-5 の RankHeader 仕様に従う
   - bbox: x=248, y=230, w=540, h=250（1080基準）
   - 白文字、黒シャドウ強め（blur 14px）
   - フォント: 極太ゴシック

2. `MainTitleText.tsx` を実装（ランキングシーンでは「赤トピックテキスト」として使用）:
   - `動画差分レポート.md` のRank5: 「尊敬できる上司が / 一人もいない」
   - 赤 `#E12626`、白縁4px、黒影16px
   - bbox: x=65, y=787, w=950, h=326

3. `CaptionBox.tsx` を実装:
   - 2種類のvariant: primary（青枠）と secondary（赤枠）
   - primary: 白背景 `#F6F6F1`、青枠 `#243BFF` 6px、黒テキスト
   - secondary: 白背景 `#F6F6F1`、赤枠 `#FF3B30` 6px、黒テキスト
   - bbox:
     - Box1: x=22, y=557, w=1004, h=307
     - Box2: x=43, y=922, w=961, h=288
   - 左揃え、太字ゴシック、内部padding 18-26px

4. `RankingScene.tsx` にすべてを統合:
   - 全要素を最初から表示（アニメーションはPhase 4で追加）
   - レイアウトが `Remotion設計書.md` セクションF のゾーン定義と一致すること

5. `pnpm render` で Rank5 の 162f (5.4秒) をレンダリング

### 確認
- [ ] 「第5位」が上部中央にある
- [ ] 赤トピックテキストが中央付近にある
- [ ] 青枠コメント1が中段にある
- [ ] 赤枠コメント2がその下にある
- [ ] **画面全体を使っている（上半分に詰まっていない）**
- [ ] テキストの縁取りと影が十分に太い

---

## Phase 4: Rank5 1シーン — 段階進行アニメーション

### ゴール
Rank5のシーン内で、要素が段階的に出現する。

### やること

1. `AnimationPreset.ts` を実装。`Remotion設計書.md` セクションE-5 から以下のプリセットを実装:
   - `rankPopIn`: scale 1.18→1.0, opacity 0→1, blur 6→0 (12-24f)
   - `captionBoxSlidePop`: translateX -36→0, scale 0.97→1.0, blur 8→0 (28-48f)
   - `captionBoxSecondarySlidePop`: 同様だが44-64f
   - `assetFloatIn`: translateY 42→0, scale 0.9→1.0 (36-60f)

2. `easing.ts` を実装:
   - outCubic, outQuad, outBack 関数

3. `RankingScene.tsx` にアニメーションを適用:
   - 0-24f: 「第5位」がポップイン
   - 20-36f: 赤トピックテキストがフェードイン
   - 28-48f: 青枠コメント1が左からスライドイン
   - 44-64f: 赤枠コメント2が左からスライドイン
   - 36-60f: 素材画像が下からフロートイン
   - 65f以降: hold（微動はPhase 6で）

4. `pnpm render` で確認

### 確認
- [ ] 要素が**一度に全部出ない**（段階的に出現する）
- [ ] ランク番号が最初にポップで出る
- [ ] コメントボックスが左からスライドで入る
- [ ] 出現順序: ランク → トピック → Box1 → Box2 → 画像

---

## Phase 5: 素材画像の下端固定

### ゴール
素材画像が画面下部に小さく固定配置される。

### やること

1. `AssetImage.tsx` を実装:
   - 位置: Asset zone y=74-95%（下端固定）
   - サイズ: width 28%, maxHeight 18%
   - fit: contain
   - anchor: bottom-center
   - asset が null の場合は非表示（placeholder表示しない）

2. RankingScene に AssetImage を統合

3. `pnpm render` で確認

### 確認
- [ ] 画像が**画面下部**にある（中央に浮いていない）
- [ ] 画像が小さめ（補助的な存在）
- [ ] テキストが画面の主役に見える

---

## Phase 6: 背景と前景の微動（breathing）

### ゴール
hold区間で要素が微妙に動き続け、「静止画感」がなくなる。

### やること

1. `AnimationPreset.ts` に追加:
   - `backgroundBurstZoom`: scale 1.0→1.045, translateY drift (0-145f)
   - `foregroundBreathing`: scale ±0.006, translateY ±4px (sine wave, 65-145f)

2. BackgroundLayer に backgroundBurstZoom を適用

3. RankingScene の hold 区間に foregroundBreathing を適用

4. `pnpm render` で確認

### 確認
- [ ] 背景が**ゆっくりズームしている**（静止していない）
- [ ] テキストやボックスが**微妙に呼吸している**
- [ ] 動画の「生命感」が前より明らかに上がっている

---

## Phase 7: シーン遷移（4fブリッジ）

### ゴール
シーン切替が「短いにじみ+フェード」で行われる。

### やること

1. `SceneTransition.tsx` を実装:
   - `Remotion設計書.md` セクションE-5-10 の sceneBridgeOutIn を実装
   - out: opacity 1→0.92, scale 1→0.985 (duration-12 ~ duration-1)
   - in: opacity 0→1, translateY 16→0 (0-10f)

2. VideoScene.tsx に SceneTransition を組み込み

3. `pnpm render` でRank5前後の切替を確認

### 確認
- [ ] シーン切替がハードカット+軽いにじみに見える
- [ ] 真っ黒や真っ白のブランクフレームがない

---

## Phase 8: Opening + Ending

### ゴール
Openingとエンディングが理想に近い形で表示される。

### やること

1. `OpeningScene.tsx` を実装:
   - タイトル4行: 行ごとにstagger出現（8f間隔）
   - 色: 白/赤の使い分け（`video_analysis_prompt.md` のタイトル詳細参照）
   - 下部にイラスト画像
   - duration: 102f (3.4秒)
   - **冒頭に空白フレームを入れない（0fから表示開始）**

2. `CtaScene.tsx` を実装:
   - 「みんなの / 意見は / コメント欄へ！」の3行
   - 赤 `#CC0000` + 黒縁取り + 太字
   - 最終行にアクセントpop
   - duration: 63f (2.1秒)

3. `pnpm render` で全体を通して確認

### 確認
- [ ] Openingが3.4秒で、0fからテキストが出る
- [ ] タイトルの赤/白が正しく使い分けられている
- [ ] CTAが2.1秒で、赤文字で強い
- [ ] **Opening前後の空白フレームがゼロ**

---

## Phase 9: 全10ランキング連結

### ゴール
Opening + 10ランキング + CTA = 約60秒の完全な動画。

### やること

1. `data/sample-video-config.json` を全10件に拡充:
   - `Remotion設計書.md` セクションB-2 の全シーンデータを入力
   - 各シーンの duration は設計書の実測値を使用
   - 各シーンのテキスト内容は設計書の通り

2. `TimelineController.ts` を実装:
   - scene配列から startFrame / endFrame を累積算出
   - 各シーン内の localFrame を計算
   - Opening(102f) → Rank10(143f) → Rank9(166f) → ... → CTA(64f)

3. `RankingVideoComposition.tsx` で全シーンを Sequence で連結

4. `pnpm render` で**全編**をレンダリング

### 確認
- [ ] 総尺が約59-60秒
- [ ] 10ランキングが5.4秒テンポで進む
- [ ] 全シーンで段階進行アニメーションが動作
- [ ] シーン遷移にブランクなし
- [ ] Opening/CTAが正しい位置にある

---

## Phase 10: 品質仕上げ

### ゴール
理想動画と並べて見て「同じテンプレート」に見えるレベル。

### やること

1. フォント・縁取り・影の微調整:
   - RankHeader: 黒シャドウ blur 14px, 文字はグラデ風塗り
   - MainTitle: 赤 `#E12626`, 白内縁4px, 黒影blur 16px
   - CaptionBox: 枠線6px、角丸ほぼなし

2. レイアウト微調整:
   - 各要素のbboxが `Remotion設計書.md` セクションC-1 の値に±3%以内

3. タイミング微調整:
   - Box1が scene開始から1.7-2.3秒後
   - Box2が Box1の1.5-2.0秒後

4. `pnpm render` で最終MP4を出力

### 最終チェックリスト
- [ ] 背景がオレンジサンバーストで回転している
- [ ] 第◯位が上部中央に固定
- [ ] 赤トピックテキストが中央付近
- [ ] 青枠Box1と赤枠Box2が2段で順次表示
- [ ] 素材画像が下部にあり小さめ
- [ ] CTA が赤文字で中央3行
- [ ] 全体60秒、10ランキング
- [ ] 静止フレーム率が低い（微動がある）
- [ ] ブランクフレームがゼロ
- [ ] placeholder露出がゼロ

---

## 重要なルール（全Phase共通）

1. **各Phase完了時に必ず `pnpm render` でMP4を出力して目視確認する**
2. **目視確認の結果を報告してから次のPhaseに進む**
3. **設計書の数値（px, frame, 色コード）は勝手に変更しない**
4. **「実装した」ではなく「実装して動作確認した」が完了条件**
5. **エラーが出たら、エラー全文を報告して修正してから次に進む**
