# 最終決定版 — 動画完全再現 実装指示書 v3

**過去の指示書は全て破棄。本ドキュメントのみに従うこと。**

本ドキュメントは以下4本のChatGPT分析書を統合した決定版:
- `動画差分レポート.md` (v1) — 構造差分・モーション定量分析
- `Remotion設計書.md` (v1) — コンポーネント設計・スキーマ
- `動画差分レポートv2.md` — 実装優先度つき詳細差分
- `Remotion設計書v2.md` — 最終コンポーネント・アニメーション設計

---

## ■ 絶対ルール（全Step共通）

1. 背景は**静止**。回転・ズーム・パンなし
2. シーン遷移は**1f黒フラッシュ + 10f明転**。クロスフェード禁止。暗転禁止
3. Phase1の見出しは**途中で消える**（OUT animation あり）
4. 画像スロットは**1シーン2枚**（assetA = Phase1用、assetB = Phase2用）
5. ボックス内テキストは**左揃え**
6. 各Step完了時に `pnpm render` → 目視確認 → 報告。確認なしで次に進まない
7. debug用fallbackプレースホルダーをrender出力に出さない

---

## ■ 動画構造（確定事実）

### メタ情報
| 項目 | 値 |
|------|------|
| 解像度 | 1080×1920 |
| FPS | 30 |
| 総フレーム | 1785f |
| 総尺 | 59.5秒 |

### 全体タイムライン
| Scene | Start | Frames | 尺 |
|-------|-------|--------|-----|
| Intro | 0 | 102f | 3.40s |
| Rank10 | 102 | 143f | 4.77s |
| Rank9 | 245 | 166f | 5.53s |
| Rank8 | 411 | 166f | 5.53s |
| Rank7 | 577 | 164f | 5.47s |
| Rank6 | 741 | 147f | 4.90s |
| Rank5 | 888 | 164f | 5.47s |
| Rank4 | 1052 | 144f | 4.80s |
| Rank3 | 1196 | 174f | 5.80s |
| Rank2 | 1370 | 174f | 5.80s |
| Rank1 | 1544 | 178f | 5.93s |
| Outro | 1722 | 63f | 2.10s |

**注意: シーン長は均一ではない。** 上記の実測値を使うこと。
ただしテンプレート運用時は162f固定でも許容。

### 各ランキングシーンのマイクロタイムライン（共通）
| 相対f | イベント |
|-------|---------|
| 0 | **1f 全画面黒** |
| 1–10 | 新シーン暗→明転（brightness 0.15→1.0, linear） |
| 24–33 | **Phase1 見出し IN**（scale 0.93→1.0, blur 8→0, opacity 0→1） |
| 39–48 | **画像A IN**（translateY +20→0, scale 0.98→1.0, opacity 0→1） |
| 75–84 | **見出し OUT + 画像A OUT**（opacity 1→0, scale 1.0→0.97） |
| 107–115 | **上段コメントボックス IN**（translateX +24→0, blur 6→0, opacity 0→1） |
| 117–126 | **画像B IN**（同 assetRiseIn） |
| 123–131 | **下段コメントボックス IN**（同 captionSlideFadeIn） |
| 131–sceneEnd | Phase2 ホールド |
| sceneEnd | 次シーンへ（1f黒フラッシュ） |

---

## ■ レイアウト（px固定値 / 1080×1920基準）

### 背景
- 種類: 放射状サンバースト（**静止**）
- 色A: `#FB9B18`（濃オレンジ）
- 色B: `#FED04B`（薄イエロー）
- 中心: (540, 979) = (50%, 51%)
- セクター数: 約40
- 差分レポートv2指摘: 参照は細い線ではなく太めのray + chevron/zigzag面構成が混ざる
  → 初期実装は単純放射でOK。第2段階で厚みを追加

### 固定ゾーン
| 要素 | x | y | w | h | 備考 |
|------|---|---|---|---|------|
| RankHeader | 357 | 242 | 372 | 110 | 中央揃え |
| Phase1 見出し | 270 | 805 | 540 | 220 | 中央揃え |
| 上段ボックス | 28 | 376 | 992 | 117 | 左揃え |
| 下段ボックス | 54 | 570 | 936 | 116-190 | 左揃え、上段よりやや右 |
| 画像A/B | 392 | 1524 | 296 | 298 | 正方形、中央固定 |

差分レポートv2の補足レイアウト範囲:
| 要素 | 推奨ゾーン |
|------|-----------|
| 順位 | 上15% (y=120-300) |
| メイン文言 | 中35-55% (y=620-1040) |
| 素材画像 | 下72-92% (y=1320-1710) |
| コメント箱 | 後半25-55% (y=300-700) |

### テキストスタイル

**見出し(Phase1)テキストの色について注意:**
分析書間で矛盾がある:
- 設計書v2: 白fill + 赤stroke
- 差分レポートv2: 赤fill + 白stroke
実際のフレームでは赤く見えるため、以下を採用:

| 要素 | fill | stroke | strokeWidth | shadow | align | fontSize |
|------|------|--------|------------|--------|-------|----------|
| RankHeader | 白 `#FFFFFF` | 黒 `#111111` | 8px | 黒 blur14 | center | 110-125px |
| Phase1見出し | 赤 `#D6332C` | 白 `#FFFFFF` | 10-14px | 黒 blur18-28 | center | 72-88px |
| ボックス内 | 黒 `#111111` | — | — | — | **left** | 48-56px |
| Intro 1行目 | 黒 | — | — | 黒shadow | center | 72-80px |
| Intro 2行目 | 赤 + 黒縁 | — | — | — | center | 72-80px |
| Intro 3行目 | 黒 | — | — | — | center | 72-80px |
| Intro 4行目 | 黄 + 黒縁 | — | — | — | center | 72-80px |
| Outro CTA | 赤 `#CC0000` | 黒 | 8px | 黒shadow | center | 100-120px |

**もし見出しが赤すぎる/白すぎる場合、fill と stroke を swap して試す。これは1行変更で済む。**

### コメントボックス
| 要素 | 背景 | 枠色 | 枠太さ | 角丸 |
|------|------|------|--------|------|
| 上段 | `#F5F6EF` | 青 `#233CFF` | 6px | なし |
| 下段 | `#F5F6EF` | 赤 `#FA4A3A` | 6px | なし |

- padding: 左右22px, 上下18px
- 下段は上段より**x方向に+26px右寄せ**
- 下段: 1行=h116, 2行=h190

### Z-index
| レイヤー | z-index |
|---------|---------|
| background | 0 |
| scene fade overlay | 5 |
| asset image | 20 |
| main title | 30 |
| caption box | 40 |
| rank header | 50 |
| black flash | 1000 |
| debug guide | 9999 |

---

## ■ アニメーションプリセット

### blackFlash1f
- F0: 全画面黒 opacity=1
- F1以降: opacity=0

### sceneFadeIn10f
- F1→F10: brightness 0.15→1.0, easing: linear

### headlinePopIn
- F24→F33: opacity 0→1, scale 0.93→1.0, blur 8→0
- easing: easeOutCubic

### headlineFadeOut
- F75→F84: opacity 1→0, scale 1.0→0.97
- easing: easeInCubic

### assetRiseIn
- 画像A: F39→F48, 画像B: F117→F126
- opacity 0→1, translateY +20→0, scale 0.98→1.0
- easing: easeOutCubic

### assetFadeOut
- 画像A: F75→F84
- opacity 1→0, easing: easeInCubic

### captionSlideFadeIn
- 上段: F107→F115, 下段: F123→F131
- opacity 0→1, translateX +24→0, blur 6→0
- easing: easeOutCubic

### introLinePopIn
- 行1: F3→F9, 行2: F11→F18, 行3: F19→F26, 行4: F26→F32
- opacity 0→1, scale 0.88→1.0, blur 6→0
- easing: easeOutCubic

### outroLinePopIn
- 行1: F2→F8, 行2: F11→F16, 行3: F18→F23
- opacity 0→1, scale 0.9→1.0, blur 6→0
- easing: easeOutCubic

---

## ■ ディレクトリ構成

```
src/
  remotion/
    Root.tsx
    compositions/
      RankingTemplate.tsx
      RankingTemplate.types.ts
      RankingTemplate.constants.ts
    components/
      layout/
        VideoScene.tsx
        SceneTransition.tsx
        SafeAreaGuide.tsx
      background/
        BackgroundLayer.tsx
      text/
        RankHeader.tsx
        MainTitleText.tsx
        CaptionBox.tsx
        IntroTitleBlock.tsx
        OutroCtaBlock.tsx
      media/
        AssetImage.tsx
        FallbackView.tsx
      animation/
        AnimationPreset.ts
        easing.ts
    timeline/
      TimelineController.ts
    lib/
      textFit.ts
      validation.ts
    data/
      sample-video.json
public/
  assets/
    fallback/
```

---

## ■ 実装順序（10 Step）

### 実装優先度の根拠（差分レポートv2より）
> 今のズレは「背景」より「素材が出てない」「本文が弱い」「シーン内の出し順が違う」が支配的。

よって実装順は: **スキーマ → タイムライン → 素材画像 → メイン文言 → ボックス → 遷移 → 背景 → Intro/Outro → 結合 → 微調整**

### Step 1: 型・定数・スキーマ
- `RankingTemplate.types.ts` — 全型定義
- `RankingTemplate.constants.ts` — レイアウトpx値、タイミングf値、色コード
- `sample-video.json` — 全10シーンのサンプルデータ
- `validation.ts` — スキーマ検証
- 確認: `pnpm preview` がエラーなし

### Step 2: タイムライン計算
- `TimelineController.ts`
- Intro(102f) + 各Rank(実測値) + Outro(63f) の累積算出
- scene内の要素window（マイクロタイムラインの全行）をフレーム単位で返す
- 確認: ログ出力でフレーム計算が正しいこと

### Step 3: 背景 + シーンコンテナ + 遷移
- `BackgroundLayer.tsx` — **静止**サンバースト（conic-gradient、回転なし）
- `VideoScene.tsx` — 1シーン単位のコンテナ（Z順制御）
- `SceneTransition.tsx` — 1f黒フラッシュ + 10f明転
- 確認: `pnpm render` で背景+黒フラッシュ遷移が見える

### Step 4: 素材画像（最優先）
- `AssetImage.tsx`
- Phase1で画像A表示（F39-48 IN, F75-84 OUT）
- Phase2で画像B表示（F117-126 IN, 以後ホールド）
- 位置固定: x=392, y=1524, w=296, h=298（正方形）
- objectFit: cover
- fallback: FallbackView（preview時のみ表示、render時は非表示）
- **シーン開始直後から素材領域を確保（遅延表示しない）**
- 確認: `pnpm render` で画像A→画像Bの切替が見える

### Step 5: RankHeader + Phase1見出し
- `RankHeader.tsx` — 白fill + 黒stroke8px + 黒shadow blur14
  - 位置: x=357-729, y=242-352, 中央揃え
  - シーン全体を通して常時表示
- `MainTitleText.tsx` — 赤fill + 白stroke10-14px + 黒shadow blur18-28
  - 位置: x=270-810, y=805-1025, 中央揃え
  - **IN: F24-33, OUT: F75-84（消える）**
  - 2行固定、1行あたり全角10-12文字推奨
  - 超過時: fontSize段階縮小（88→84→80→76→72→68→64）
- 確認: `pnpm render` でRank5の見出しIN→OUTが見える

### Step 6: コメントボックス
- `CaptionBox.tsx` — variant="top" | "bottom"
  - 上段: x=28, y=376, w=992, 青枠 `#233CFF`（F107-115 IN）
  - 下段: x=54, y=570, w=936, 赤枠 `#FA4A3A`（F123-131 IN）
  - 背景: `#F5F6EF`, 角丸なし, padding 22×18
  - テキスト: 黒, 太字, **左揃え**, fontSize 48-56px
  - 最大2行。超過時: fontSize縮小 56→52→48
  - OUTなし（次の黒フラッシュで消える）
- 確認: `pnpm render` でPhase2にボックス2段が表示される

### Step 7: Intro + Outro
- `IntroTitleBlock.tsx` — 4行、行ごとに色が異なる
  - 行1: 黒, 行2: 赤+黒縁, 行3: 黒, 行4: 黄+黒縁
  - 各行stagger: introLinePopIn のタイミング
  - duration: 102f
  - **0fは1f黒から開始**
- `OutroCtaBlock.tsx` — 3行赤文字CTA
  - 赤 + 黒縁 + 黒shadow
  - fontSize: 100-120px（最終行はさらに大きく）
  - 各行stagger: outroLinePopIn のタイミング
  - duration: 63f
- 確認: `pnpm render` でIntro→Outroが正しい

### Step 8: 全シーン結合
- `RankingTemplate.tsx` で全体composition
- `TimelineController` で全シーンを `<Sequence>` で連結
- sample-video.json の全10件を反映
- 確認: `pnpm render` で**全編約59.5秒のMP4**が出力される

### Step 9: テキスト量耐性
- `textFit.ts`
  - MainTitle: 2行固定、段階縮小、minFontSize=64
  - CaptionBox: 最大2行、段階縮小 56→52→48
  - validation error で上限超過を検出
- fallback: render時はdebug placeholder非表示

### Step 10: 参照動画との比較微調整
- キーフレーム比較点: F45(1.5s) / F141(4.7s) / F300(10.0s) / F936(31.2s) / F1032(34.4s) / F1740(58.0s)
- 各フレームで以下を確認:
  - RankHeader位置
  - 見出しの大きさ・色・影
  - ボックス位置・サイズ・枠色
  - 画像位置
  - 背景の見え方
  - 暗転混入の有無
- font-size / strokeWidth / blur / shadow を微調整

---

## ■ 禁止事項チェックリスト

- [ ] 背景を回転させていない
- [ ] 1f黒フラッシュが各シーン頭にある
- [ ] 黒ディップ（暗転遷移）を入れていない
- [ ] Phase1見出しがPhase2で消えている
- [ ] ボックス内テキストが左揃えである
- [ ] 画像スロットが2つある（assetA + assetB）
- [ ] debug fallbackがrender出力に出ていない
- [ ] シーン内に空白時間がない（0fから情報が埋まる）
