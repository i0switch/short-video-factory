# Remotion ランキング縦動画テンプレート — 実装設計書

---

## A. 設計方針サマリ

### 目的
参照動画（「入社して気づく会社のやばい特徴ランキング」形式）の表現をピクセル・フレーム単位で再現し、JSON差し替えだけで同フォーマットの量産動画を生成できるテンプレートアプリを構築する。

### 確定事実（参照動画の実測値）
- 出力: 1080×1920 / 30fps
- 総尺: 約60秒（1800フレーム）
- 構成: OP(3s) + ランキング10段(各5〜6s) + ED(3s)
- 背景: オレンジ系サンバーストパターン、常時緩速回転
- 1順位は必ず2フェーズ（タイトルフェーズ → コメントフェーズ）で構成される
- コメントフェーズには青枠Box + 赤枠Boxの2段構成がある
- 素材画像はイラスト系（透過背景推奨）
- テキストは極太ゴシック＋白縁取り＋ドロップシャドウ

### 設計上の推奨
- 全シーンデータをJSON配列で外部化し、コンポーネントはステートレスに保つ
- アニメーションはプリセット関数として切り出し、タイミングだけ外から渡す
- Remotion の `useCurrentFrame()` + `interpolate()` を全アニメーションの基盤とする
- 画像は `/public/assets/` に配置し、パスだけJSONで指定する構造にする

---

## B. ディレクトリ構成案

```
remotion-ranking-template/
├── src/
│   ├── Root.tsx                    # Remotion ルート Composition 登録
│   ├── Video.tsx                   # メイン Composition（全シーンのオーケストレーション）
│   │
│   ├── components/
│   │   ├── scenes/
│   │   │   ├── OpeningScene.tsx     # OPシーン
│   │   │   ├── RankingScene.tsx     # 1順位分のシーン（2フェーズ内包）
│   │   │   ├── EndingScene.tsx      # EDシーン
│   │   │   └── SceneRouter.tsx      # シーン配列→Sequence変換
│   │   │
│   │   ├── layers/
│   │   │   ├── BackgroundLayer.tsx  # サンバースト背景
│   │   │   ├── ForegroundLayer.tsx  # 前景要素のコンテナ
│   │   │   └── SafeAreaGuide.tsx    # セーフエリア（開発時のみ表示）
│   │   │
│   │   ├── elements/
│   │   │   ├── RankHeader.tsx       # 「第N位」テキスト
│   │   │   ├── MainTitleText.tsx    # 大タイトルテキスト（縁取り付き）
│   │   │   ├── CaptionBox.tsx       # コメントボックス（青枠/赤枠）
│   │   │   ├── AssetImage.tsx       # 素材画像（fallback対応）
│   │   │   ├── OpeningTitle.tsx     # OPの複数行タイトル
│   │   │   └── EndingCTA.tsx        # EDのCTAテキスト
│   │   │
│   │   └── animations/
│   │       ├── presets.ts           # アニメーションプリセット関数群
│   │       ├── easings.ts           # カスタムイージング定義
│   │       └── stagger.ts           # stagger演出ユーティリティ
│   │
│   ├── schemas/
│   │   ├── videoSchema.ts          # Zod スキーマ定義（全体）
│   │   ├── sceneSchema.ts          # 1シーン単位
│   │   └── types.ts                # 型エクスポート
│   │
│   ├── data/
│   │   └── sampleData.ts           # サンプルJSON（開発用）
│   │
│   ├── hooks/
│   │   ├── useAnimation.ts         # アニメーション計算フック
│   │   └── useTextFit.ts           # テキスト自動縮小フック
│   │
│   ├── utils/
│   │   ├── layout.ts               # レイアウト定数・計算
│   │   ├── colors.ts               # カラー定数
│   │   └── fonts.ts                # フォント読み込み
│   │
│   └── config/
│       └── constants.ts            # FPS, WIDTH, HEIGHT など
│
├── public/
│   └── assets/
│       ├── images/                 # 素材画像ディレクトリ
│       └── fonts/                  # ローカルフォント
│
├── input.json                      # 本番用入力データ（外部から差し替え）
├── remotion.config.ts
├── package.json
└── tsconfig.json
```

### ファイル分割方針
- **1ファイル1責務**: コンポーネントは描画のみ、ロジックはhooks/utilsに分離
- **scenes/**: シーン単位の「構成」を担当。要素の配置順とタイミングを定義
- **elements/**: 再利用可能なUI部品。propsだけで完結し、シーン情報に依存しない
- **animations/**: 純粋関数。`(frame, startFrame, duration) => styleObject` の形式

---

## C. コンポーネント一覧と責務

### C-1. Root.tsx
| 項目 | 内容 |
|------|------|
| 役割 | Remotion の `<Composition>` を登録するエントリポイント |
| props | なし |
| 内部責務 | JSONデータの読み込み、`<Composition>` へのinputProps受け渡し、総フレーム数計算 |
| 再利用性 | なし（エントリポイント） |

```tsx
// 総フレーム数の計算式
const totalFrames = OPENING_FRAMES + (rankingItems.length * FRAMES_PER_RANK) + ENDING_FRAMES;
```

### C-2. Video.tsx（メインComposition）
| 項目 | 内容 |
|------|------|
| 役割 | 全シーンを `<Sequence>` で時系列配置するオーケストレーター |
| props | `VideoInputProps`（JSON全体の型） |
| 内部責務 | BackgroundLayerの常時描画 + SceneRouterによるシーン切替 |
| 依存 | BackgroundLayer, SceneRouter |

```tsx
<AbsoluteFill>
  <BackgroundLayer config={data.background} />
  <SceneRouter scenes={data.scenes} />
</AbsoluteFill>
```

### C-3. BackgroundLayer
| 項目 | 内容 |
|------|------|
| 役割 | サンバースト放射パターンの描画と回転アニメーション |
| props | `{ pattern: 'sunburst', color1: string, color2: string, rotationSpeed: number, center: {x,y} }` |
| 内部責務 | CSS `conic-gradient` or SVG で放射線描画、`useCurrentFrame()` で回転角計算 |
| 再利用性 | 高（背景パターンを差し替え可能に設計） |
| 差し替え要素 | `color1`, `color2`, `rotationSpeed` |

**実装詳細（確定）:**
- パターン: 放射状ストライプ（24〜32本）
- color1: `#E8951D`（濃いオレンジ）
- color2: `#F5C542`（明るい黄色）
- 回転速度: 約 360°/120秒 = 3°/秒 = 0.1°/frame
- 回転中心: canvas中央 (540, 960)
- サイズ: 対角線以上（2400×2400程度）にして回転時に隅が見えないようにする

```tsx
const frame = useCurrentFrame();
const rotation = (frame * 0.1) % 360; // 0.1°/frame
```

### C-4. SceneRouter
| 項目 | 内容 |
|------|------|
| 役割 | `scenes[]` 配列を走査し、各シーンを `<Sequence>` で配置 |
| props | `{ scenes: SceneData[] }` |
| 内部責務 | 累積フレーム計算、シーンタイプに応じたコンポーネント分岐 |
| 依存 | OpeningScene, RankingScene, EndingScene |

```tsx
let frameOffset = 0;
scenes.map((scene) => {
  const el = (
    <Sequence from={frameOffset} durationInFrames={scene.durationFrames}>
      {scene.type === 'opening' && <OpeningScene {...scene} />}
      {scene.type === 'ranking' && <RankingScene {...scene} />}
      {scene.type === 'ending' && <EndingScene {...scene} />}
    </Sequence>
  );
  frameOffset += scene.durationFrames;
  return el;
});
```

### C-5. RankingScene（最重要コンポーネント）
| 項目 | 内容 |
|------|------|
| 役割 | 1つの順位シーンを丸ごと描画。タイトルフェーズ→コメントフェーズの2段構成を制御 |
| props | `RankingSceneProps`（後述） |
| 内部責務 | フェーズ切替タイミング計算、子要素のstagger制御 |
| 依存 | RankHeader, MainTitleText, CaptionBox, AssetImage |

**2フェーズ構成（確定）:**
```
Phase 1: タイトルフェーズ（0〜75frame = 2.5秒）
  - RankHeader: 「第N位」
  - MainTitleText: タイトル大文字
  - AssetImage: イラスト画像（下部）

Phase 2: コメントフェーズ（75〜165frame = 3.0秒）
  - RankHeader: 「第N位」（維持）
  - CaptionBox[0]: 青枠コメント
  - CaptionBox[1]: 赤枠ツッコミ
  - AssetImage: 同じ or 別画像（下部）
```

**シーンによるバリエーション:**
- 一部の順位はタイトルフェーズのみ（コメントフェーズなし）
- 一部の順位はコメントフェーズのみ（タイトルフェーズ省略）
- JSON側の `phases[]` 配列で制御

### C-6. RankHeader
| 項目 | 内容 |
|------|------|
| 役割 | 「第N位」のランク表示テキスト |
| props | `{ rank: number, animationDelay: number }` |
| 内部責務 | テキストレンダリング + ポップインアニメーション |

**レイアウト仕様（実測）:**
- 位置: 画面上部、Y = 80〜180px（上端から約5〜10%）
- 水平: 中央揃え
- フォントサイズ: 120px相当（1080幅基準）
- フォント: 極太ゴシック（weight 900）
- テキスト装飾: 黒文字 + 白縁取り(4px) + 黒ドロップシャドウ(2px, 2px)
- 出現: scaleポップイン（0→1.1→1.0, 8frame, overshoot easing）

### C-7. MainTitleText
| 項目 | 内容 |
|------|------|
| 役割 | 順位タイトルの大文字テキスト（タイトルフェーズ用） |
| props | `{ text: string, fontSize?: number, animationDelay: number }` |
| 内部責務 | 自動改行、テキスト縮小、縁取り描画 |

**レイアウト仕様（実測）:**
- 位置: 画面中央〜やや下、Y = 800〜1200px
- 水平: 中央揃え
- フォントサイズ: 96〜110px（文字数に応じて自動縮小）
- 最大幅: 980px（左右50px余白）
- フォント: 極太ゴシック（weight 900）
- テキスト装飾: 黒文字 + 白縁取り(3px) + ドロップシャドウ
- 特殊行の色分け: JSON側で `highlights[]` として行ごとの色指定可能
- 出現: 下からスライドイン + フェードイン（10frame, easeOut）

### C-8. CaptionBox
| 項目 | 内容 |
|------|------|
| 役割 | コメントボックス（青枠 or 赤枠） |
| props | `{ text: string, variant: 'blue' \| 'red', animationDelay: number, index: number }` |
| 内部責務 | ボックス描画 + テキスト配置 + スライドインアニメーション |

**レイアウト仕様（実測）:**
- ボックス幅: 940px（画面幅の87%）
- ボックス高さ: テキスト依存（padding 20px上下）
- 水平: 中央揃え
- Y位置: index=0 → 280px, index=1 → 520px（順位ヘッダの下）
- 背景: 白 (`#FFFFFF`)
- 枠線: 3px solid
  - blue variant: `#0033CC`
  - red variant: `#CC0000`
- テキスト: 黒、極太ゴシック、48〜56px
- 出現: 左からスライドイン（translateX -1080→0, 8frame, easeOut）
  - index=0: delay 0
  - index=1: delay +8frame（stagger）

### C-9. AssetImage
| 項目 | 内容 |
|------|------|
| 役割 | 素材画像の表示（fallback対応） |
| props | `{ src: string, fallbackSrc?: string, width: number, height: number, position: {x,y}, animationDelay: number }` |
| 内部責務 | 画像読み込み、エラー時fallback切替、フェードインアニメーション |

**レイアウト仕様（実測）:**
- タイトルフェーズ時: 画面下部中央、Y = 1200〜1700px、幅 = 400〜600px
- コメントフェーズ時: 画面下部中央、Y = 1300〜1800px、幅 = 350〜500px
- objectFit: `contain`（透過イラスト想定）
- fallback: グレー矩形 + 「No Image」テキスト（Fallback文字列は表示しない）
- 出現: フェードイン（opacity 0→1, 10frame, linear）

### C-10. OpeningScene
| 項目 | 内容 |
|------|------|
| 役割 | OPタイトル画面 |
| props | `{ title: string[], image: ImageConfig, durationFrames: number }` |

**レイアウト仕様（実測）:**
- タイトル: 画面上部30%、複数行の大文字
  - 行ごとに色分け可能（白文字行、赤文字行、黄色文字行）
  - フォントサイズ: 90〜100px
  - 各行: 左揃え or 中央揃え
- 画像: 画面下部60〜80%に配置、幅 = 500px程度
- 各行 stagger: 0.1s（3frame）間隔でポップイン

### C-11. EndingScene
| 項目 | 内容 |
|------|------|
| 役割 | EDのCTAテキスト |
| props | `{ text: string, durationFrames: number }` |

**レイアウト仕様（実測）:**
- テキスト: 画面中央、超大文字（100〜120px）
- 色: 黒 + 赤アクセント（「コメント欄」部分）+ 白太縁取り(4px)
- 出現: scaleポップイン（0→1, 10frame, overshoot）

### C-12. SafeAreaGuide（開発用）
| 項目 | 内容 |
|------|------|
| 役割 | 開発プレビュー時のセーフエリア表示 |
| props | `{ visible: boolean }` |
| 表示内容 | 上下左右60px、タイトルセーフ120pxの枠線をオーバーレイ |

---

## D. データスキーマ設計

### D-1. 動画全体スキーマ（VideoInput）

```typescript
// schemas/types.ts
interface VideoInput {
  meta: {
    title: string;               // 管理用タイトル
    fps: 30;                     // 固定
    width: 1080;                 // 固定
    height: 1920;                // 固定
  };
  background: BackgroundConfig;
  opening: OpeningConfig;
  rankings: RankingItem[];        // 10件推奨（可変対応）
  ending: EndingConfig;
  defaults: DefaultConfig;        // 各要素のデフォルト値
}
```

### D-2. 背景設定スキーマ

```typescript
interface BackgroundConfig {
  pattern: 'sunburst';           // 将来拡張: 'dots' | 'grid' | 'solid'
  color1: string;                // '#E8951D'
  color2: string;                // '#F5C542'
  stripeCount: number;           // 28（放射線の本数）
  rotationSpeed: number;         // 0.1（度/frame）
  center: { x: number; y: number }; // { x: 540, y: 960 }
}
```

### D-3. OPスキーマ

```typescript
interface OpeningConfig {
  durationFrames: number;         // 90 (3s)
  titleLines: {
    text: string;
    color: string;                // '#000000' | '#CC0000' | '#FFD700'
    fontSize: number;             // 90-100
  }[];
  image: ImageConfig;
}
```

### D-4. 1順位スキーマ（最重要）

```typescript
interface RankingItem {
  rank: number;                   // 10, 9, 8, ... 1
  phases: RankingPhase[];         // 1〜2個
}

interface RankingPhase {
  type: 'title' | 'comment';
  durationFrames: number;         // title: 75, comment: 90

  // title フェーズ用
  titleText?: string;             // 大文字タイトル
  titleFontSize?: number;         // 自動計算（デフォルト96px）

  // comment フェーズ用
  comments?: CommentData[];       // 0〜2個

  // 共通
  image?: ImageConfig;
}

interface CommentData {
  text: string;
  variant: 'blue' | 'red';
  fontSize?: number;              // デフォルト52px
}
```

### D-5. 素材画像スキーマ

```typescript
interface ImageConfig {
  src: string;                    // '/assets/images/rank10.png'
  fallbackSrc?: string;           // フォールバック画像パス
  width: number;                  // 表示幅px（500がデフォルト）
  height?: number;                // 未指定時はアスペクト比維持
  position: {
    x: number;                    // 540（中央）がデフォルト
    y: number;                    // 1400がデフォルト
  };
  objectFit: 'contain' | 'cover'; // 'contain'がデフォルト
}
```

### D-6. EDスキーマ

```typescript
interface EndingConfig {
  durationFrames: number;         // 90 (3s)
  text: string;
  highlights?: {                  // 色分け部分
    substring: string;
    color: string;
  }[];
  fontSize: number;               // 110
}
```

### D-7. デフォルト設定

```typescript
interface DefaultConfig {
  titlePhaseDuration: number;     // 75 frames (2.5s)
  commentPhaseDuration: number;   // 90 frames (3.0s)
  defaultTitleFontSize: number;   // 96
  defaultCommentFontSize: number; // 52
  defaultImageWidth: number;      // 500
  defaultImageY: number;          // 1400
  fontFamily: string;             // 'Noto Sans JP'
}
```

### D-8. 文字量超過ルール

```
規則1: MainTitleText
  - 1行あたり最大7文字 → 自動改行
  - 3行超過時 → fontSize を 80px に縮小
  - 4行超過時 → fontSize を 68px に縮小
  - 5行超過 → エラー（データ側で修正を促す）

規則2: CaptionBox
  - 1行あたり最大10文字 → 自動改行
  - 3行超過時 → fontSize を 44px に縮小
  - ボックス高さは内容に応じて伸長（最大 320px）

規則3: RankHeader
  - 「第N位」固定フォーマット → 文字量変動なし
  - N が 2桁の場合、自動的に fontSize 110px に縮小
```

### D-9. 画像未設定ルール

```
規則1: src が空文字 or undefined → FallbackView 表示
  - FallbackView: グレー矩形 (#E0E0E0) + 中央に「?」アイコン
  - サイズ: 指定の width × height を維持

規則2: 画像読み込みエラー → fallbackSrc を試行
  - fallbackSrc も失敗 → FallbackView 表示

規則3: 画像が未設定のシーンでも、レイアウトは崩れない
  - 画像領域は常に確保される（空間が詰まらない）
```

---

## E. タイムライン/アニメーション設計

### E-1. 全体タイムライン構成

```
フレーム   秒数    内容
─────────────────────────────────
0-89       0-3s    OP: OpeningScene
90-254     3-8.5s  第10位: RankingScene (165f = 5.5s)
  90-164   3-5.5s    Phase1: タイトル (75f = 2.5s)
  165-254  5.5-8.5s  Phase2: コメント (90f = 3.0s)
255-419    8.5-14s 第9位: RankingScene (165f)
420-584    14-19.5s 第8位
585-749    19.5-25s 第7位
750-914    25-30.5s 第6位
915-1079   30.5-36s 第5位
1080-1244  36-41.5s 第4位
1245-1409  41.5-47s 第3位
1410-1574  47-52.5s 第2位
1575-1739  52.5-58s 第1位
1740-1829  58-61s  ED: EndingScene
─────────────────────────────────
合計: 1830f = 61秒
```

**注:** シーンごとの durationFrames は JSON で可変。上記はデフォルト値。

### E-2. フレームベース制御方式

```typescript
// 全アニメーションはこのパターンで統一
const frame = useCurrentFrame();
const localFrame = frame; // Sequence内なので0始まり

const value = interpolate(
  localFrame,
  [startFrame, endFrame],    // 入力範囲
  [fromValue, toValue],      // 出力範囲
  { extrapolateRight: 'clamp', extrapolateLeft: 'clamp', easing: easingFn }
);
```

### E-3. アニメーションプリセット一覧

#### PRESET-01: popIn（ポップイン / スケール登場）
| 項目 | 値 |
|------|------|
| 用途 | RankHeader, EndingCTA の登場 |
| 入力 | `(frame, delay, duration=8)` |
| 初期値 | scale=0, opacity=0 |
| 最終値 | scale=1.0, opacity=1 |
| 中間 | scale=1.15 (70%地点でオーバーシュート) |
| easing | `cubicBezier(0.34, 1.56, 0.64, 1)` |

```typescript
function popIn(frame: number, delay: number, duration = 8) {
  const f = frame - delay;
  const scale = interpolate(f, [0, duration * 0.7, duration], [0, 1.15, 1.0], { clamp: true });
  const opacity = interpolate(f, [0, duration * 0.3], [0, 1], { clamp: true });
  return { transform: `scale(${scale})`, opacity };
}
```

#### PRESET-02: slideInLeft（左からスライドイン）
| 項目 | 値 |
|------|------|
| 用途 | CaptionBox の登場 |
| 入力 | `(frame, delay, duration=8)` |
| 初期値 | translateX=-1080, opacity=0 |
| 最終値 | translateX=0, opacity=1 |
| easing | `Easing.out(Easing.cubic)` |

```typescript
function slideInLeft(frame: number, delay: number, duration = 8) {
  const f = frame - delay;
  const x = interpolate(f, [0, duration], [-1080, 0], {
    clamp: true, easing: Easing.out(Easing.cubic)
  });
  const opacity = interpolate(f, [0, duration * 0.3], [0, 1], { clamp: true });
  return { transform: `translateX(${x}px)`, opacity };
}
```

#### PRESET-03: slideInUp（下からスライドアップ）
| 項目 | 値 |
|------|------|
| 用途 | MainTitleText の登場 |
| 入力 | `(frame, delay, duration=10)` |
| 初期値 | translateY=200, opacity=0 |
| 最終値 | translateY=0, opacity=1 |
| easing | `Easing.out(Easing.quad)` |

#### PRESET-04: fadeIn（フェードイン）
| 項目 | 値 |
|------|------|
| 用途 | AssetImage の登場 |
| 入力 | `(frame, delay, duration=10)` |
| 初期値 | opacity=0 |
| 最終値 | opacity=1 |
| easing | `linear` |

#### PRESET-05: fadeOut（フェードアウト）
| 項目 | 値 |
|------|------|
| 用途 | シーン退場時の全要素 |
| 入力 | `(frame, sceneEnd, duration=6)` |
| 変化 | opacity 1→0（sceneEnd - duration 〜 sceneEnd） |

#### PRESET-06: continuousRotation（常時回転）
| 項目 | 値 |
|------|------|
| 用途 | BackgroundLayer |
| 入力 | `(frame, speed=0.1)` |
| 変化 | rotation = frame * speed (mod 360) |
| easing | linear（等速回転） |

### E-4. RankingScene 内部のアニメーションタイムライン

```
Phase 1 (タイトル): 75 frames
──────────────────────────
  f0-8:   RankHeader popIn
  f4-14:  MainTitleText slideInUp (delay +4f stagger)
  f8-18:  AssetImage fadeIn (delay +8f stagger)
  f65-75: 全要素 fadeOut (退場)

Phase 2 (コメント): 90 frames
──────────────────────────
  f0-8:   RankHeader popIn (or 維持)
  f4-12:  CaptionBox[0] slideInLeft (delay +4f)
  f12-20: CaptionBox[1] slideInLeft (delay +12f, stagger)
  f14-24: AssetImage fadeIn (delay +14f)
  f80-90: 全要素 fadeOut (退場)
```

### E-5. 背景と前景の同期

```
BackgroundLayer: 
  - useCurrentFrame() でグローバルフレームを参照
  - 常時回転（シーン遷移に影響されない）
  - z-index: 0

ForegroundLayer (各シーン):
  - Sequence 内の localFrame を参照
  - シーンごとに独立したアニメーション
  - z-index: 1

→ 背景はグローバル、前景はローカル。完全に独立。
```

### E-6. シーン遷移方式

```
方式: カット遷移（トランジション演出なし）
理由: 参照動画がカット遷移であることを実測で確認済み

実装:
  - 各シーン末尾の6frameで全要素をfadeOut
  - 次のシーン冒頭で新要素がpopIn/slideIn
  - Sequence の隙間は0frame（シームレス切替）

将来拡張:
  - crossfade, wipe 等のトランジションを追加する場合は
    TransitionLayer コンポーネントを Sequence 間に挿入する設計にする
```

---

## F. レイアウト設計ルール

### F-1. セーフエリア

```
┌──────────────────────────────┐ 0px
│  ┌────────────────────────┐  │ 60px (ACTION SAFE)
│  │  ┌──────────────────┐  │  │ 120px (TITLE SAFE)
│  │  │                  │  │  │
│  │  │   コンテンツ領域  │  │  │
│  │  │                  │  │  │
│  │  └──────────────────┘  │  │ 1800px
│  └────────────────────────┘  │ 1860px
└──────────────────────────────┘ 1920px

幅: 1080px
ACTION SAFE: 上下左右60px → 有効領域 960×1800
TITLE SAFE: 上下左右120px → テキスト配置領域 840×1680
```

### F-2. 各要素のY座標基準

```
要素                    Y座標          画面比率
─────────────────────────────────────────────
RankHeader 上端        80px           4.2%
RankHeader 下端        220px          11.5%
CaptionBox[0] 上端     280px          14.6%
CaptionBox[0] 下端     ~460px         ~24%
CaptionBox[1] 上端     500px          26%
CaptionBox[1] 下端     ~680px         ~35.4%
MainTitleText 中心     850px          44.3%    ← タイトルフェーズ時
AssetImage 上端        1100-1300px    57-68%
AssetImage 下端        1600-1800px    83-94%
```

### F-3. テキスト自動調整ルール

```typescript
// useTextFit.ts
function useTextFit(text: string, maxWidth: number, baseFontSize: number): number {
  const charsPerLine = Math.floor(maxWidth / (baseFontSize * 0.6)); // 日本語の概算
  const lines = Math.ceil(text.length / charsPerLine);

  if (lines <= 2) return baseFontSize;        // そのまま
  if (lines === 3) return baseFontSize * 0.85; // 15%縮小
  if (lines === 4) return baseFontSize * 0.7;  // 30%縮小
  return baseFontSize * 0.6;                   // 40%縮小（最小）
}
```

### F-4. 画像差し替えトリミング戦略

```
原則: objectFit: 'contain' を基本とする（イラスト前提）

写真素材に差し替える場合:
  - objectFit: 'cover' に切り替え
  - borderRadius: 16px を適用
  - 4px solid #E8951D の枠を追加（背景色に溶け込み防止）

アスペクト比違い対応:
  - 横長画像: 指定width内に収め、上下に余白
  - 縦長画像: 指定height内に収め、左右に余白
  - 正方形: そのままcontain

ImageConfig.objectFit で制御可能にしておく
```

### F-5. Z-index ルール

```
z-index  レイヤー
────────────────────
0        BackgroundLayer（サンバースト）
1        AssetImage（素材画像）
2        CaptionBox（コメントボックス）
3        MainTitleText（大タイトル）
4        RankHeader（順位表示）
5        SafeAreaGuide（開発時のみ）
```

---

## G. 実装優先順位

### Phase 1: MVP（再現度60%達成）

| 順序 | タスク | 成果物 |
|------|--------|--------|
| 1 | プロジェクト初期化 + Remotion セットアップ | 空の Composition が表示される |
| 2 | `constants.ts` + `types.ts` + `sampleData.ts` | 型定義とサンプルデータ |
| 3 | `BackgroundLayer` 実装 | サンバースト回転背景が表示される |
| 4 | `RankHeader` 実装 | 「第N位」が表示される |
| 5 | `SceneRouter` + `RankingScene` 骨格 | 10シーンが順番に切り替わる |
| 6 | `MainTitleText` 実装 | タイトルフェーズが動く |
| 7 | `CaptionBox` 実装（青/赤） | コメントフェーズが動く |
| 8 | `AssetImage` 実装（fallback込み） | 素材画像が表示される |
| 9 | `OpeningScene` + `EndingScene` | OP/ED が動く |
| 10 | 全体通し再生確認 + タイミング調整 | 60秒動画が一本通る |

### Phase 2: 再現度向上（80%達成）

| 順序 | タスク |
|------|--------|
| 11 | アニメーションプリセット精緻化（popIn, slideIn のイージング微調整） |
| 12 | stagger タイミング参照動画と秒単位で合わせ込み |
| 13 | フォント読み込み（Noto Sans JP Black） |
| 14 | テキスト縁取り + ドロップシャドウの再現 |
| 15 | CaptionBox の枠線太さ・色の最終調整 |
| 16 | RankHeader の文字サイズ・位置の微調整 |

### Phase 3: ポリッシュ（90%+達成）

| 順序 | タスク |
|------|--------|
| 17 | テキスト自動縮小（useTextFit）実装 |
| 18 | 画像アスペクト比対応 |
| 19 | OP/ED の色分けテキスト対応 |
| 20 | SafeAreaGuide 実装 |
| 21 | レイアウト崩れの境界値テスト |

### Phase 4: 将来拡張

- 背景パターン追加（ドット、グリッド、グラデーション）
- シーン遷移エフェクト（crossfade, wipe）
- BGM / SE のオーバーレイ
- JSON入力のGUIエディタ
- バッチレンダリング（複数JSON → 複数動画）
- 字幕トラック出力
- ランキング数の完全可変対応（3〜20）

---

## H. テスト戦略

### H-1. レイアウト崩れ検知

```
テストケース:
  - タイトル 3文字 / 7文字 / 14文字 / 21文字 / 28文字
  - コメント 5文字 / 15文字 / 30文字
  - 画像: 横長 / 縦長 / 正方形 / 未設定
  - ランキング数: 3 / 5 / 10 / 15

方法:
  - 各ケースでスクリーンショットを撮り、セーフエリア内に収まっているか確認
  - Remotion の <Still> で静止画出力し、画像比較ツールで検証
```

### H-2. テキスト量差し替え破綻検知

```
テストケース:
  - 全角1文字のみ
  - 20文字（4行以上になる長文）
  - 絵文字混在
  - 英数字混在

検証基準:
  - テキストがセーフエリア外にはみ出さないこと
  - フォントサイズが最小値（60px）を下回らないこと
  - 行間が詰まりすぎないこと（line-height 1.3 以上）
```

### H-3. 画像欠損 fallback 検証

```
テストケース:
  - src が空文字
  - src が存在しないパス
  - src が壊れた画像ファイル
  - fallbackSrc も存在しない

検証基準:
  - FallbackView が表示されること
  - 「Fallback XX」のような生テキストが表示されないこと
  - レイアウトが崩れないこと
```

### H-4. タイミングずれ検知

```
方法:
  - 参照動画と出力動画を同時再生し、各シーン開始タイミングを比較
  - 許容誤差: ±3frame（0.1秒）以内

チェックポイント:
  - 各順位の切り替わりタイミング
  - コメントフェーズの開始タイミング
  - OP/ED の開始/終了タイミング
  - 要素のアニメーション開始タイミング
```

### H-5. 参照動画比較チェックリスト

```
□ 背景色が一致しているか
□ 背景の回転方向・速度が一致しているか
□ 「第N位」のフォントサイズ・位置が一致しているか
□ コメントボックスの枠線色・太さが一致しているか
□ 青枠/赤枠の色が正しく切り替わっているか
□ テキストの縁取りが参照と同等か
□ 画像の配置位置・サイズが一致しているか
□ 各要素のアニメーション方向が一致しているか
□ シーン切り替えのテンポが一致しているか
□ 総尺が ±2秒以内か
```

---

## I. 実装開始順序（最初の3日間のタスクブレイク）

### Day 1: 基盤構築

```
1. npm init + Remotion インストール
   npx create-video@latest --template=blank

2. constants.ts 作成
   export const FPS = 30;
   export const WIDTH = 1080;
   export const HEIGHT = 1920;
   export const TITLE_PHASE_FRAMES = 75;
   export const COMMENT_PHASE_FRAMES = 90;

3. types.ts + videoSchema.ts 作成
   Zod スキーマ + TypeScript 型

4. sampleData.ts 作成
   10順位分のサンプルデータ（参照動画のテキストを使用）

5. BackgroundLayer 実装 + 動作確認
   - conic-gradient でサンバースト
   - useCurrentFrame() で回転

6. Root.tsx + Video.tsx の骨格
   - サンプルデータを読み込み
   - BackgroundLayer だけ表示される状態
```

### Day 2: シーン構成

```
7. SceneRouter 実装
   - scenes[] を Sequence に変換
   - フレームオフセット計算

8. RankingScene 骨格実装
   - 2フェーズ切替ロジック

9. RankHeader 実装
   - popIn アニメーション付き

10. MainTitleText 実装
    - slideInUp アニメーション付き
    - 自動改行（簡易版）

11. CaptionBox 実装
    - blue/red variant
    - slideInLeft アニメーション
    - stagger

12. 10順位の通し再生確認
```

### Day 3: 完成度向上

```
13. AssetImage 実装（fallback込み）

14. OpeningScene 実装

15. EndingScene 実装

16. フォント適用（Noto Sans JP Black）

17. テキスト縁取り・シャドウの CSS 実装
    - -webkit-text-stroke
    - text-shadow

18. 全体タイミング調整
    - 参照動画と並べて秒単位で確認
    - FRAMES_PER_RANK を微調整

19. 本番レンダリングテスト
    npx remotion render Video out.mp4
```

---

## 付録: サンプルデータ構造（sampleData.ts抜粋）

```typescript
export const sampleData: VideoInput = {
  meta: { title: "会社やばい特徴ランキング", fps: 30, width: 1080, height: 1920 },
  background: {
    pattern: 'sunburst',
    color1: '#E8951D',
    color2: '#F5C542',
    stripeCount: 28,
    rotationSpeed: 0.1,
    center: { x: 540, y: 960 },
  },
  opening: {
    durationFrames: 90,
    titleLines: [
      { text: '入社して気づく', color: '#000000', fontSize: 90 },
      { text: '会社のやばい', color: '#CC0000', fontSize: 100 },
      { text: '特徴ランキング', color: '#000000', fontSize: 100 },
      { text: 'を挙げてけww', color: '#FFD700', fontSize: 90 },
    ],
    image: { src: '/assets/images/opening.png', width: 500, position: { x: 540, y: 1500 }, objectFit: 'contain' },
  },
  rankings: [
    {
      rank: 10,
      phases: [
        {
          type: 'title',
          durationFrames: 75,
          titleText: '求人票のアットホームの文字',
          image: { src: '/assets/images/rank10_title.png', width: 400, position: { x: 540, y: 1400 }, objectFit: 'contain' },
        },
        {
          type: 'comment',
          durationFrames: 90,
          comments: [
            { text: '家族だから残業代なしって意味？！', variant: 'blue' },
            { text: '絆で飯は食えんからな', variant: 'red' },
          ],
          image: { src: '/assets/images/rank10_comment.png', width: 350, position: { x: 540, y: 1500 }, objectFit: 'contain' },
        },
      ],
    },
    // ... 第9位〜第1位 同様の構造
  ],
  ending: {
    durationFrames: 90,
    text: 'みんなの意見はコメント欄へ！',
    highlights: [{ substring: 'コメント欄', color: '#CC0000' }],
    fontSize: 110,
  },
  defaults: {
    titlePhaseDuration: 75,
    commentPhaseDuration: 90,
    defaultTitleFontSize: 96,
    defaultCommentFontSize: 52,
    defaultImageWidth: 500,
    defaultImageY: 1400,
    fontFamily: 'Noto Sans JP',
  },
};
```
