# Short Video Factory — アプリ構想書 v4

> **最優先ゴール**: 固定デザインの ranking 動画を 1コマンドで mp4 出力できること。
> MVP外（YouTube投稿、複数テンプレート、コメントキャラ、いらすとやスクレイピング、高度な装飾）は後回しにし、まずは Pexels + fallback + VOICEVOX + Remotion の最短構成でエンドツーエンドを完成させること。

> **開発体制**: Claude Code (CLI) をメインに、ChatGPT をレビュー相手として併用
> **ステータス**: 構想 v4（デザイン仕様を実動画から正確に再現） → MVP実装へ

---

## 1. 何を作るか

### 動画仕様

| 項目 | 値 |
|------|-----|
| アスペクト比 | 9:16（縦型） |
| 解像度 | 1080 × 1920 |
| 長さ | 30〜90秒 |
| FPS | 30 |
| 出力形式 | MP4 (H.264 + AAC) |

### 動画構成（ランキング形式）

```
[タイトルコール 固定3秒] ← 音声なし
  → サンバースト背景
  → テーマ文字（超大文字、画面の60〜70%を占拠）
  → 関連画像（下部に小さく添える）

[第N位〜第1位 各シーン = 音声尺 + 0.5秒]
  → サンバースト背景
  → 順位表示「第N位」（上部、超大文字）
  → 見出しテキスト（青枠白背景ボックス、大文字）
  → 関連画像（下半分に配置）
  → VOICEVOXナレーション（body テキストを読み上げ）
  ※ 画面に body テキストは表示しない（音声のみ）

[エンディング 固定3秒] ← 音声なし
  → サンバースト背景
  → CTA文字（超大文字、画面の60〜70%を占拠）
```

**尺設計ルール:**
- intro / outro は **固定3秒・音声なし**
- ランキング各項目のみ VOICEVOX で音声生成し、音声尺 + 0.5秒パディングがシーン長
- `total = 3 + Σ(audio_duration + 0.5) + 3`

---

## 2. フォーマット戦略

MVP では ranking のみ。CLIとスキーマに `format: "ranking"` を残し、将来拡張可能にする。

| フォーマットID | MVP | 備考 |
|---------------|-----|------|
| `ranking` | ✅ | 第N位形式 |
| `listicle` | Phase 6 | 「〇選」形式 |
| `quiz` | Phase 6 | 問題→答え形式 |

---

## 3. パイプライン設計

```
Input: テーマ文字列
  │
  ▼
┌─────────────────────────────────┐
│ Step 1: 台本生成 (LLM)          │
│   テーマ → Script JSON           │
│   出力: generated/jobs/{id}/script.json
└──────────────┬──────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│ Step 2: 画像  │ │ Step 3: 音声  │  ← 並列実行
│  Pexels API  │ │ VOICEVOX      │
│  → fallback  │ │               │
└──────┬───────┘ └──────┬───────┘
       │               │
       └───────┬───────┘
               ▼
┌─────────────────────────────────┐
│ Step 3.5: RenderPlan 組立       │
│   Script + assets → RenderPlan   │
│   出力: generated/jobs/{id}/render-plan.json
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ Step 4: 動画レンダリング         │
│   RenderPlan → Remotion → MP4    │
│   出力: generated/jobs/{id}/output.mp4
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ Step 5: 昇格                    │
│   成功時のみ latest にコピー     │
└─────────────────────────────────┘
```

### ジョブ隔離

```
generated/
├── jobs/
│   └── 20260317-143022/
│       ├── script.json
│       ├── audio/
│       ├── images/
│       ├── render-plan.json
│       └── output.mp4
└── latest/                  # 最新の成功ジョブのコピー
```

- 各ジョブは `generated/jobs/{timestamp}/` に出力
- 失敗時はジョブディレクトリごと削除
- 全Step成功 → `generated/latest/` にコピー
- Promise.all で並列実行。片方失敗 → もう片方の結果も破棄（ジョブごと削除）

### 画像取得: 2段フォールバック（MVP）

1. **Pexels API** — `imageKeywordsEn`（英語）で検索。portrait 優先
2. **assets/fallback/** — ローカル汎用画像。ランダム選択

### Pexels 英語検索

LLM に日本語と英語の両方を返させる:
```json
"imageKeywords": ["朝礼", "会社員"],
"imageKeywordsEn": ["morning meeting", "office worker"]
```

---

## 4. スキーマ設計（2段構成）

### 4-A. Script スキーマ（LLM出力）

```json
{
  "videoTitle": "入社して気づく会社のやばい特徴ランキング",
  "intro": "入社して気づく会社のやばい特徴ランキングを挙げてけww",
  "items": [
    {
      "rank": 5,
      "title": "朝礼がやたら長い",
      "body": "毎朝の朝礼が30分以上。内容はほとんど精神論で正直キツい。",
      "imageKeywords": ["朝礼", "会社員"],
      "imageKeywordsEn": ["morning meeting", "office worker"]
    }
  ],
  "outro": "みんなの意見はコメント欄へ！"
}
```

```typescript
// src/schema/script.ts
import { z } from 'zod'

const RankingItemSchema = z.object({
  rank: z.number().int().positive(),
  title: z.string().min(1).max(24),           // 青枠ボックスに収まる長さ（2行以内）
  body: z.string().min(1).max(100),           // VOICEVOX読み上げ用（画面に表示しない）
  imageKeywords: z.array(z.string()).min(1).max(5),
  imageKeywordsEn: z.array(z.string()).min(1).max(5),
})

const ScriptSchema = z.object({
  videoTitle: z.string().min(1).max(40),
  intro: z.string().min(1).max(40),           // タイトルコール用テキスト
  items: z.array(RankingItemSchema)
    .min(3).max(10)
    .refine(
      items => new Set(items.map(i => i.rank)).size === items.length,
      { message: 'rank must be unique' }
    )
    .refine(
      items => items.every((item, i, arr) =>
        i === 0 || item.rank < arr[i - 1].rank
      ),
      { message: 'items must be in descending rank order' }
    ),
  outro: z.string().min(1).max(30),           // エンディングCTA
})

export type Script = z.infer<typeof ScriptSchema>
```

**body は画面に表示しない。VOICEVOX が読み上げるためだけのフィールド。**
画面には title（見出し）のみ表示する。これが実動画の設計。

### 4-B. RenderPlan スキーマ

```typescript
// src/schema/render-plan.ts
import { z } from 'zod'

const RenderSceneSchema = z.object({
  type: z.enum(['title', 'ranking', 'ending']),
  rank: z.number().optional(),
  title: z.string(),                            // 画面に表示するテキスト
  imagePath: z.string(),
  audioPath: z.string().nullable(),             // title/ending は null
  audioDurationSec: z.number().nullable(),
  durationInFrames: z.number().int().positive(),
  fallbackUsed: z.boolean(),
})

const RenderPlanSchema = z.object({
  videoTitle: z.string(),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  totalDurationInFrames: z.number().int().positive(),
  scenes: z.array(RenderSceneSchema).min(5),
})

export type RenderPlan = z.infer<typeof RenderPlanSchema>
export type RenderScene = z.infer<typeof RenderSceneSchema>
```

### データフロー

```
LLM → Script → (images + audio) → RenderPlan → Remotion
                                     ↑
                            唯一のRemotionへの入力
```

### 壊れたJSON対策

1. LLM の JSON mode / response_format を使用（対応モデルの場合）
2. zodバリデーション失敗 → エラーメッセージを LLM に渡してリトライ（最大3回）
3. 3回失敗 → エラー終了

---

## 5. デザイン仕様（v4 で全面改訂）

参考動画を正確に分析した結果に基づく。この動画フォーマットの特徴は
**「テキストが巨大」「縁取りが太い」「画像は添え物」** の3点。

### 5-1. 共通: サンバースト背景

全シーン共通の放射状背景。集中線が細く密であることが「2chまとめ風」の特徴。

```tsx
const Sunburst: React.FC<{ color1?: string; color2?: string }> = ({
  color1 = '#D4881E',
  color2 = '#F2C76B',
}) => (
  <AbsoluteFill style={{
    background: `repeating-conic-gradient(
      from 0deg,
      ${color1} 0deg 5deg,
      ${color2} 5deg 10deg
    )`,
  }} />
)
```

- 角度: **5deg 間隔**（10deg だと太すぎて別物になる）
- 色: 濃いオレンジ `#D4881E` と薄いゴールド `#F2C76B`
- サンバーストの中心は画面中央

### 5-2. 共通: テキストスタイル

この動画フォーマットの最大の特徴は **極太テキスト + 太い黒縁取り**。
Remotion (React) では `-webkit-text-stroke` と `text-shadow` の組み合わせで表現する。

```tsx
// 太い黒縁取り + ドロップシャドウ（全テキスト共通のベーススタイル）
const outlineStyle = (size: number, weight: number = 900): React.CSSProperties => ({
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: size,
  fontWeight: weight,
  color: '#FFFFFF',
  WebkitTextStroke: '6px #000000',
  paintOrder: 'stroke fill',          // stroke を先に描画して fill が上に来る
  textShadow: '0 4px 8px rgba(0,0,0,0.4)',
  lineHeight: 1.2,
  textAlign: 'center' as const,
})
```

**`paintOrder: 'stroke fill'` が重要。** これがないと stroke が文字の内側を侵食して細く見える。

| 用途 | フォントサイズ | 色 | 縁取り |
|------|--------------|-----|--------|
| タイトルシーン テーマ文字 | **110px** | 白 / キーワード部分は黄色 `#FFE066` | 黒 6px + shadow |
| 順位「第N位」 | **120px** | 白 | 黒 6px + shadow |
| 見出しボックス内 | **64px** | 黒（縁取りなし） | なし（ボックス内は黒文字） |
| エンディング CTA | **110px** | 白 / キーワード部分は黄色 | 黒 6px + shadow |

### 5-3. タイトルシーン

テーマ文字が **画面の60〜70%を占拠** する。画像は下部に小さく添える。

```
┌──────────────────────────┐  1080 × 1920
│                          │
│    (サンバースト背景)      │
│                          │
│   ┌──────────────────┐   │
│   │  入社して気づく    │   │  ← 110px / 白 / 縁取り6px
│   │  会社のやばい      │   │
│   │  特徴ランキング    │   │  ← キーワード部分は黄色 #FFE066
│   │  を挙げてけww      │   │
│   └──────────────────┘   │
│                          │  ← テキスト領域: y=200〜1200 (約1000px)
│       ┌────────┐         │
│       │  画像  │         │  ← 最大 500×400, 中央下寄せ
│       │        │         │     y=1300〜1700
│       └────────┘         │
│                          │
└──────────────────────────┘
```

テキストの配置:
- 垂直: 画面上部 1/3 付近から開始（y ≈ 200px）
- 水平: 中央揃え
- 改行: 自然な区切りで改行。1行あたり8〜10文字目安
- キーワード部分（ランキング名/テーマの核心）を黄色 `#FFE066` にする

画像の配置:
- 画面下部 1/3 に配置
- 最大サイズ: 500 × 400px
- 中央揃え

### 5-4. ランキングシーン

**実動画の重要な特徴: body テキスト（赤枠）は表示しない。**
画面には「順位 + 見出し(青枠) + 画像」の3要素のみ。body は VOICEVOX が読むだけ。

```
┌──────────────────────────┐  1080 × 1920
│                          │
│    (サンバースト背景)      │
│                          │
│        第 5 位            │  ← 120px / 白 / 縁取り6px
│                          │     y ≈ 150〜350
│   ┌──────────────────┐   │
│   │                  │   │
│   │  朝礼がやたら     │   │  ← 64px / 黒 / 白背景 / 青枠 #0044AA 3px
│   │  長い             │   │     幅: 画面の85% (≈920px)
│   │                  │   │     y ≈ 420〜700
│   └──────────────────┘   │
│                          │
│                          │
│       ┌────────┐         │
│       │        │         │  ← 画像: 最大 600×600
│       │  画像  │         │     中央配置
│       │        │         │     y ≈ 900〜1600
│       └────────┘         │
│                          │
└──────────────────────────┘
```

見出しボックス:
- 背景: 白 `rgba(255, 255, 255, 0.95)`
- 枠線: 青 `#0044AA`, 太さ 3px
- 角丸: 8px
- パディング: 上下 24px, 左右 32px
- テキスト: 黒 `#000000`, 64px, Bold 900, 中央揃え
- 最大2行。title の zod 制約（max 24文字）で収まる

画像:
- 下半分に配置（ランキングシーンでは画面の主役はテキスト）
- 最大 600 × 600px
- 中央揃え

### 5-5. エンディングシーン

タイトルシーン同様、テキストが画面を支配する。画像なし。

```
┌──────────────────────────┐  1080 × 1920
│                          │
│    (サンバースト背景)      │
│                          │
│                          │
│   ┌──────────────────┐   │
│   │  みんなの         │   │  ← 110px / 白 / 縁取り6px
│   │  意見は           │   │
│   │  コメント欄       │   │  ← キーワード部分は黄色
│   │  へ！             │   │
│   └──────────────────┘   │
│                          │  ← テキスト中央配置（垂直・水平とも）
│                          │
└──────────────────────────┘
```

### 5-6. シーン遷移アニメーション（MVP最小限）

MVPでも以下の最低限のアニメーションを入れる。
なしだと紙芝居感が強すぎて動画として成立しない。

```tsx
// 全シーン共通: シーン開始時のフェードイン
const fadeIn = (frame: number, startFrame: number): React.CSSProperties => ({
  opacity: interpolate(frame - startFrame, [0, 8], [0, 1], {
    extrapolateRight: 'clamp',
  }),
})

// ランキングシーン: 要素の順次出現（stagger）
// 1. 順位テキスト: 0〜8フレーム で出現
// 2. 見出しボックス: 6〜14フレーム で出現（少し遅れて）
// 3. 画像: 12〜20フレーム で出現（さらに遅れて）
```

Remotion の `interpolate` + `spring` を使う。
複雑なアニメーションは Phase 6。MVP は opacity のフェードインとスケール（0.9→1.0）のみ。

### 5-7. デザイントークンまとめ

```typescript
// src/remotion/design-tokens.ts

export const DESIGN = {
  // サンバースト
  sunburst: {
    color1: '#D4881E',
    color2: '#F2C76B',
    angleDeg: 5,               // 集中線の間隔
  },

  // テキスト
  text: {
    fontFamily: "'Noto Sans JP', sans-serif",
    titleFontSize: 110,        // タイトル/エンディング
    rankFontSize: 120,         // 「第N位」
    headingFontSize: 64,       // 見出しボックス内
    fontWeight: 900,
    color: '#FFFFFF',
    highlightColor: '#FFE066', // キーワード強調
    strokeWidth: '6px',
    strokeColor: '#000000',
    shadow: '0 4px 8px rgba(0,0,0,0.4)',
  },

  // 見出しボックス（青枠）
  headingBox: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#0044AA',
    borderWidth: 3,
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 32,
    textColor: '#000000',
    widthPercent: 85,          // 画面幅に対する割合
  },

  // 画像
  image: {
    title: { maxWidth: 500, maxHeight: 400 },    // タイトルシーン
    ranking: { maxWidth: 600, maxHeight: 600 },   // ランキングシーン
  },

  // アニメーション
  animation: {
    fadeInDuration: 8,         // フレーム数（≈0.27秒 @30fps）
    staggerDelay: 6,           // 要素間の遅延フレーム
  },

  // シーン尺
  timing: {
    introDurationSec: 3,
    outroDurationSec: 3,
    scenePaddingSec: 0.5,      // 音声後の余白
  },
} as const
```

---

## 6. 技術スタック

| 役割 | 技術 |
|------|------|
| 言語 | TypeScript (strict) |
| パッケージ管理 | pnpm |
| 動画エンジン | Remotion |
| 音声合成 | VOICEVOX (localhost:50021) |
| 画像取得 | Pexels API → fallback |
| 台本生成 | OpenAI API / Anthropic API (.envで切替) |
| 動画書き出し | FFmpeg |
| CLI | commander |
| バリデーション | zod |

### 環境要件

- Node.js >= 18
- pnpm
- FFmpeg (system install)
- VOICEVOX (ローカル起動)
- Noto Sans JP フォント（Bold 900 必須）
- Windows / WSL 両対応

### サポート構成

| 構成 | MVP サポート | 備考 |
|------|-------------|------|
| A: すべて Windows (PowerShell) | ✅ 正式 | VOICEVOX + Node 同一マシン |
| B: Node は WSL, VOICEVOX は Windows | ✅ 正式 | VOICEVOX_URL で接続 |
| C: すべて WSL/Linux | ⚠️ ベストエフォート | VOICEVOX Linux 版が必要 |

---

## 7. VOICEVOX 連携仕様

### API フロー

```
POST /audio_query?text={テキスト}&speaker={ID}  → audio query JSON
POST /synthesis?speaker={ID}  body: query JSON   → WAV バイナリ
```

### Speaker ID

| ID | キャラクター |
|----|-------------|
| 3 | ずんだもん（ノーマル） |
| 4 | 東北きりたん |
| 8 | 春日部つむぎ |

### 音量補正

.env の `VOICEVOX_GAIN` で設定（デフォルト 1.5）

### 起動チェック

パイプライン開始前に `GET /version` で確認。失敗時は明示的エラー。

### 音声を生成するシーン

- **intro**: 音声なし（固定3秒テキスト表示）
- **ranking items**: 音声あり（`item.body` を読み上げ。**body は画面に表示しない**）
- **outro**: 音声なし（固定3秒テキスト表示）

---

## 8. ディレクトリ構成（MVP版）

```
short-video-factory/
├── CLAUDE.md
├── SPEC.md
├── src/
│   ├── cli/
│   │   └── index.ts
│   ├── llm/
│   │   ├── client.ts
│   │   └── generate-script.ts
│   ├── schema/
│   │   ├── script.ts          # Script (4-A)
│   │   └── render-plan.ts     # RenderPlan (4-B)
│   ├── services/
│   │   ├── image/
│   │   │   ├── pexels.ts
│   │   │   ├── fallback.ts
│   │   │   └── index.ts
│   │   ├── voicevox/
│   │   │   └── index.ts
│   │   └── renderer/
│   │       ├── build-plan.ts   # Script + assets → RenderPlan
│   │       └── render.ts
│   ├── remotion/
│   │   ├── Root.tsx
│   │   ├── RankingVideo.tsx
│   │   ├── Sunburst.tsx
│   │   ├── TitleScene.tsx
│   │   ├── RankingScene.tsx
│   │   ├── EndingScene.tsx
│   │   ├── TextBox.tsx         # 青枠ボックス
│   │   ├── OutlineText.tsx     # 縁取りテキスト共通コンポーネント
│   │   └── design-tokens.ts   # デザイン定数（v4で追加）
│   └── utils/
│       ├── logger.ts
│       ├── config.ts
│       ├── errors.ts
│       ├── paths.ts
│       └── job.ts
├── fixtures/
│   └── sample-script.json
├── assets/
│   └── fallback/
├── generated/
│   ├── jobs/
│   └── latest/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── remotion.config.ts
└── README.md
```

### v3 から追加

- `src/remotion/OutlineText.tsx` — 縁取りテキスト共通コンポーネント
- `src/remotion/design-tokens.ts` — デザイン定数の一元管理

---

## 9. CLI仕様

```bash
pnpm generate --topic "入社して気づく会社のやばい特徴ランキング"
pnpm generate --topic "一人暮らしで困ること" --items 7
pnpm generate --topic "転職のミス" --dry-run
pnpm preview
```

| フラグ | 型 | デフォルト | 説明 |
|--------|------|-----------|------|
| `--topic` | string | **必須** | テーマ |
| `--format` | string | `ranking` | フォーマットID |
| `--items` | number | `5` | 項目数（3〜10） |
| `--speaker` | number | `3` | VOICEVOX speaker ID |
| `--dry-run` | boolean | `false` | script.json 生成まで |
| `--output` | string | `generated/latest/` | 出力先 |

---

## 10. 環境変数（.env）

```env
# LLM
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
LLM_MODEL=gpt-4o

# 画像
PEXELS_API_KEY=xxx

# VOICEVOX
VOICEVOX_URL=http://localhost:50021
VOICEVOX_SPEAKER=3
VOICEVOX_GAIN=1.5

# 動画
VIDEO_WIDTH=1080
VIDEO_HEIGHT=1920
VIDEO_FPS=30
```

---

## 11. 実装フェーズ（レンダリング先行）

### Phase 1: 固定データで1本出す（Day 1-3）★最重要

- [ ] プロジェクト初期化（pnpm + TypeScript + Remotion）
- [ ] Script / RenderPlan の zod スキーマ定義
- [ ] design-tokens.ts 作成
- [ ] config / logger / errors / paths / job ユーティリティ
- [ ] `fixtures/sample-script.json` + `fixtures/sample-render-plan.json` を手書き
- [ ] Remotion コンポーネント:
  - [ ] Sunburst（5deg 間隔の放射状背景）
  - [ ] OutlineText（縁取りテキスト共通）
  - [ ] TitleScene（超大文字テーマ + 下部画像）
  - [ ] RankingScene（順位 + 青枠見出し + 下部画像 + stagger アニメ）
  - [ ] EndingScene（超大文字CTA）
  - [ ] TextBox（青枠白背景ボックス）
  - [ ] RankingVideo（composition 統合）
- [ ] **固定 RenderPlan + fallback画像 + 無音 → MP4 が出て、見た目が参考動画に近いことを確認**

### Phase 2: VOICEVOX 連携（Day 4-5）

- [ ] VOICEVOX 起動チェック
- [ ] API クライアント
- [ ] 音量補正（VOICEVOX_GAIN）
- [ ] WAV duration 解析
- [ ] build-plan.ts（Script + audio → RenderPlan、durationInFrames 計算）
- [ ] **固定JSON + fallback画像 + 実音声 → MP4**

### Phase 3: Pexels 画像取得（Day 6）

- [ ] Pexels API クライアント（英語キーワード、portrait優先）
- [ ] フォールバック処理
- [ ] build-plan.ts に imagePath 統合
- [ ] **固定JSON + 実画像 + 実音声 → MP4**

### Phase 4: LLM 台本生成 + CLI統合（Day 7-9）

- [ ] LLM クライアント（OpenAI/Anthropic切替、JSON mode対応）
- [ ] 台本生成プロンプト（英語キーワード含む、テキスト長制約含む）
- [ ] zod リトライロジック
- [ ] CLI オーケストレーション
- [ ] **テーマ入力 → MP4 出力のエンドツーエンド完成** ← MVP ゴール

### Phase 5: 仕上げ（Day 10）

- [ ] README
- [ ] .env.example
- [ ] エラーメッセージ改善
- [ ] 動作テスト（3テーマ以上）

### Phase 6: 拡張（MVP後）

- [ ] いらすとやスクレイパー
- [ ] コメントキャラ（赤枠ボックス + CommentScene）
- [ ] YouTube Data API v3 自動投稿
- [ ] 複数フォーマット + テンプレートシステム
- [ ] Pexels キャッシュ
- [ ] JSON repair parser
- [ ] フォント同梱
- [ ] BGM / 高度なアニメーション
- [ ] 自動サムネイル生成

---

## 12. エラー分類

| クラス名 | 発生箇所 | 対応 |
|---------|---------|------|
| `ConfigError` | config.ts | 環境変数不足 → 即終了 |
| `VoicevoxError` | voicevox/ | 起動未確認 or API失敗 → 即終了 |
| `ScriptValidationError` | llm/ | zodバリデーション失敗 → リトライ |
| `AssetFetchError` | image/ | Pexels失敗 → fallback。fallbackも失敗 → 終了 |
| `RenderError` | renderer/ | Remotion/FFmpeg失敗 → 即終了 |
| `JobError` | job.ts | ジョブ操作失敗 |

---

## 13. リスクと対策

| リスク | 対策 |
|--------|------|
| VOICEVOX起動忘れ | 起動チェック + VoicevoxError |
| LLM壊れJSON | JSON mode + zodリトライ(3回) |
| Pexels API上限 | fallbackで継続。Phase 6でキャッシュ |
| Pexels日本語検索精度 | imageKeywordsEn で英語検索 |
| 日本語フォントなし | README にNoto Sans JP (Bold 900)インストール手順 |
| テキストはみ出し | zod max制約 + design-tokens で固定サイズ |
| 並列処理の中途ファイル | ジョブ隔離 |
| Win/WSL環境差異 | サポート構成明記 + README構成別手順 |

---

## 14. ライセンス・クレジット

- **VOICEVOX**: クレジット表記必須（例: VOICEVOX:ずんだもん）
- **Pexels**: 無料。クレジット推奨
- **いらすとや**（Phase 6）: 非商用20点まで無料

---

## 15. このドキュメントの使い方

- **Claude Code**: CLAUDE.md + SPEC.md をプロジェクトルートに配置
- **ChatGPT**: SPEC.md 全文を貼り付けてモジュール単位で実装を依頼

---

## 変更履歴

### v4（デザイン仕様を実動画から再現）

参考動画のフレームを詳細分析し、7つのギャップを修正:

1. **レイアウト順序を修正**: ランキングシーンは「順位→見出し(青枠)→画像(下部)」。赤枠の補足テキストはMVPでは表示しない。body は VOICEVOX 読み上げ専用
2. **テキストサイズを大幅拡大**: タイトル/エンディング 110px、順位 120px、見出し 64px（v3 は 80/48 で迫力不足だった）
3. **縁取りを太く**: stroke-width 3px → 6px + paintOrder + drop shadow
4. **サンバースト密度を修正**: 10deg → 5deg間隔
5. **タイトル/エンディングの「画面支配」を明記**: テキストが画面の60〜70%を占める配置ルールとY座標を具体的に記載
6. **赤枠ボックスの役割を修正**: MVPでは表示しない。コメントキャラ機能（Phase 6）用
7. **シーン遷移アニメーション追加**: フェードイン + stagger（要素順次出現）を MVP に含める
8. **design-tokens.ts の追加**: デザイン定数を1ファイルに集約
9. **OutlineText.tsx の追加**: 縁取りテキスト共通コンポーネント
10. **title の max文字数を 30→24 に変更**: 64px × 2行に収まるよう厳密化

### v3

- Critical: intro/outro 尺確定、ジョブ隔離
- High: RenderPlan 追加、Pexels英語検索
- Medium: zod制約強化、VOICEVOX_GAIN、エラー分類

### v2

- 台本スキーマスリム化、いらすとやMVP外、レンダリング先行
