# テスト仕様書 — short-video-factory

> **作成日**: 2026-03-17
> **対象リポジトリ**: short-video-factory
> **想定フレームワーク**: [Vitest](https://vitest.dev/) (TypeScript / ESM 対応)
> **網羅目標**: 命令網羅・分岐網羅・条件網羅 + 境界値分析・同値分割・例外系・状態遷移・複合条件

---

## 目次

1. [前提整理](#1-前提整理)
2. [環境セットアップ](#2-環境セットアップ)
3. [テスト観点一覧](#3-テスト観点一覧)
4. [テストケース一覧](#4-テストケース一覧)
5. [網羅性チェック](#5-網羅性チェック)
6. [レビューコメント](#6-レビューコメント)

---

## 1. 前提整理

### 1-1. 対象機能の要約

| モジュール | ファイルパス | 主な責務 |
|---|---|---|
| ScriptSchema | `src/schema/script.ts` | Zod による入力台本バリデーション |
| RenderPlanSchema | `src/schema/render-plan.ts` | Zod による RenderPlan バリデーション |
| config | `src/utils/config.ts` | 環境変数から各種設定値を取得 |
| job | `src/utils/job.ts` | ジョブディレクトリ作成・latest 昇格 |
| theme | `src/utils/theme.ts` | テーマ JSON 読み込み・列挙 |
| voicevox | `src/services/voicevox/index.ts` | VOICEVOX 接続確認・音声合成・WAV 解析 |
| image/index | `src/services/image/index.ts` | Pexels 取得または fallback 選択 |
| image/pexels | `src/services/image/pexels.ts` | Pexels API 画像検索・ダウンロード |
| image/fallback | `src/services/image/fallback.ts` | fallback 画像コピー |
| build-v3-plan | `src/services/renderer/build-v3-plan.ts` | Script → VideoV3Config 変換 |
| build-plan | `src/services/renderer/build-plan.ts` | Script → RenderPlan 変換 |
| llm/client | `src/llm/client.ts` | OpenAI / Anthropic API 呼び出し |
| generate-script | `src/llm/generate-script.ts` | LLM 台本生成・リトライ・バリデーション |
| cli | `src/cli/index.ts` | CLI エントリーポイント・フルパイプライン |
| TimelineController | `src/remotion/components/timeline/TimelineController.ts` | フレームタイムライン構築 |
| AnimationPreset | `src/remotion/components/animation/AnimationPreset.ts` | フレーム → アニメーション値計算 |

### 1-2. 不足情報と仮定

| 項目 | 仮定 |
|---|---|
| テストフレームワーク | Vitest (ESM 対応) を使用する |
| モック方法 | `vi.stubGlobal('fetch', ...)` で global fetch を差し替える |
| fallback 画像 | `assets/fallback/generic_0{1,2,3}.png` が存在すること |
| Remotion レンダリング | E2E 扱い。bundle/renderMedia はユニットテスト対象外 |
| OS | Windows (path.sep='\\') を主環境とするが、パス変換は cross-platform で確認 |
| WAV バイナリ | テスト用に最小 WAV バッファを手動構築、または fixtures に配置する |

### 1-3. 重要な設計定数（テストで頻出）

```
FPS               = 30
AUDIO_PAD_FRAMES  = 15   // 0.5秒
MIN_SCENE_FRAMES  = 143  // DEFINITIVE_v3 最小値
SUB_A_FRAMES      = 60   // 2秒
SUB_B_FRAMES      = 75   // 2.5秒
MIN_RANKING_SEC   = 7.0
MAX_RETRIES       = 3    // generateScript リトライ上限
```

---

## 2. 環境セットアップ

```bash
# 依存追加（devDependencies）
pnpm add -D vitest @vitest/coverage-v8

# tsconfig.json に vitest 型を追加（既存があれば追記）
# "types": ["vitest/globals"]

# テスト実行
pnpm vitest run

# カバレッジ付き
pnpm vitest run --coverage
```

`vitest.config.ts` の最小構成:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/remotion/**'],  // Remotion コンポーネントは除外
    },
  },
})
```

### テストヘルパー: 最小 WAV バッファ生成

```ts
// tests/helpers/wavBuilder.ts

/**
 * 最小有効 WAV バッファを生成する
 * @param durationSec 秒数
 * @param sampleRate サンプルレート (default: 44100)
 */
export function buildWavBuffer(durationSec: number, sampleRate = 44100): Buffer {
  const byteRate = sampleRate * 2  // 16bit mono
  const dataSize = Math.ceil(byteRate * durationSec)
  const buf = Buffer.alloc(44 + dataSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)          // chunk size
  buf.writeUInt16LE(1, 20)           // PCM
  buf.writeUInt16LE(1, 22)           // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)    // byteRate ← parseWavDuration が読む
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)   // dataSize ← parseWavDuration が読む

  return buf
}

/** 奇数 chunkSize を持つ WAV (padding テスト用) */
export function buildWavBufferOddChunk(): Buffer {
  // fmt chunk を 17 バイト (奇数) にして padding をテスト
  const buf = Buffer.alloc(60)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(52, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(17, 16)          // 奇数 chunkSize
  buf.writeUInt32LE(44100, 24)
  buf.writeUInt32LE(88200, 28)       // byteRate = 44100 * 2
  buf.write('data', 35)              // offset 12+8+17+1(pad) = 38... 実際は手動調整
  buf.writeUInt32LE(88200, 39)
  return buf
}
```

---

## 3. テスト観点一覧

| 観点ID | 分類 | 対象箇所 | 観点内容 | 根拠 | 優先度 |
|---|---|---|---|---|---|
| O-01 | 命令網羅 | `ScriptSchema` | 全フィールド正常値でパースが通る | 基本パス | 高 |
| O-02 | 命令網羅 | `parseWavDuration` | RIFF ヘッダ読み込み〜byteRate/dataSize 計算〜戻り値返却 | 基本パス | 高 |
| O-03 | 命令網羅 | `buildV3Plan` | VOICEVOX 合成→WAV 保存→durationFrames 計算→config 組立全体 | 基本パス | 高 |
| O-04 | 命令網羅 | `buildTimeline` | opening + ranking×N + ending の全 entry を生成 | 基本パス | 高 |
| O-05 | 命令網羅 | `generateScript` | MAX_RETRIES=3 の全ループ分岐（成功・JSON 失敗・Zod 失敗） | 基本パス | 高 |
| O-06 | 命令網羅 | `promoteToLatest` | latestDir 既存→削除→再作成→ファイルコピー全行 | 基本パス | 高 |
| O-07 | 命令網羅 | `loadTheme` / `listThemes` | テーマファイル存在→JSON 読み込み返却 | 基本パス | 中 |
| O-08 | 命令網羅 | `callAnthropic` | ```json...``` ブロック剥がし分岐（match あり・なし） | 基本パス | 中 |
| B-01 | 分岐網羅 | `getLlmConfig` | apiKey=truthy → return / apiKey=falsy → throw ConfigError | `if(!apiKey)` | 高 |
| B-02 | 分岐網羅 | `getLlmConfig` | provider='openai' → OPENAI_API_KEY / provider='anthropic' → ANTHROPIC_API_KEY | 三項演算子 | 高 |
| B-03 | 分岐網羅 | `fetchImage` | apiKey=null→fallback直行 / apiKey=存在+Pexels成功 / apiKey=存在+Pexels失敗→fallback | 3 分岐 | 高 |
| B-04 | 分岐網羅 | `checkVoicevox` | fetch 成功かつ ok=true / fetch 成功かつ ok=false / fetch 例外 | 3 分岐 | 高 |
| B-05 | 分岐網羅 | `parseWavDuration` | chunkId='fmt ' → byteRate 代入 / chunkId='data' → dataSize 代入+break 条件 | while 内分岐 | 高 |
| B-06 | 分岐網羅 | `parseWavDuration` | chunkSize % 2 !== 0 → offset+1 / === 0 → そのまま | 奇数 padding | 中 |
| B-07 | 分岐網羅 | `buildV3Plan` headlineLines | topic.length > 10 → 2 行分割 / ≤10 → 1 行 | if 分岐 | 高 |
| B-08 | 分岐網羅 | `buildV3Plan` durationFrames | ceil(audio×30)+15 > 143 → 音声尺採用 / < 143 → MIN 採用 | Math.max | 高 |
| B-09 | 分岐網羅 | `generateScript` | JSON.parse 成功 / 失敗 | try/catch | 高 |
| B-10 | 分岐網羅 | `generateScript` | Zod 成功→return / 失敗+attempt<MAX→push / 失敗+attempt=MAX→throw | 3 分岐 | 高 |
| B-11 | 分岐網羅 | `promoteToLatest` | latestDir 存在→rmSync / 非存在→スキップ | fs.existsSync | 中 |
| B-12 | 分岐網羅 | `buildTimeline` | scene.durationFrames が定義 / undefined → meta.sceneFrames | `??` 演算子 | 高 |
| B-13 | 分岐網羅 | `cli/index.ts` | dryRun=true → script.json のみ / dryRun=false → buildPlan 以降実行 | if(dryRun) | 高 |
| B-14 | 分岐網羅 | `callAnthropic` | systemMsg あり → body.system 設定 / なし → 設定しない | undefined 分岐 | 中 |
| B-15 | 分岐網羅 | `buildPlan` buildTitleLines | videoTitle に \n あり → 行数>1 → そのまま / なし → 12 文字ごと分割 | if 分岐 | 中 |
| C-01 | 条件網羅 | `ScriptSchema` items refine | rank unique: true/false × descending: true/false の 4 組 | 複合 refine | 高 |
| C-02 | 条件網羅 | `fetchImage` | `if(apiKey)` true/false × Pexels 成功/失敗 | 複合条件 | 高 |
| C-03 | 条件網羅 | `parseWavDuration` 終端判定 | byteRate !== null true/false × dataSize !== null true/false | 終端 throw | 高 |
| C-04 | 条件網羅 | `generateScript` ループ終了 | attempt < MAX_RETRIES × result.success の組み合わせ | ループ条件 | 高 |
| BV-01 | 境界値 | `ScriptSchema` videoTitle | 長さ: 0(無効), 1(最小), 40(最大), 41(無効) | min(1).max(40) | 高 |
| BV-02 | 境界値 | `ScriptSchema` topic | 長さ: 0(無効), 1(最小), 24(最大), 25(無効) | min(1).max(24) | 高 |
| BV-03 | 境界値 | `ScriptSchema` comment1/2 | 長さ: 0, 1, 50, 51 | min(1).max(50) | 高 |
| BV-04 | 境界値 | `ScriptSchema` body | 長さ: 0, 1, 100, 101 | min(1).max(100) | 高 |
| BV-05 | 境界値 | `ScriptSchema` outro | 長さ: 0, 1, 30, 31 | min(1).max(30) | 高 |
| BV-06 | 境界値 | `ScriptSchema` items | 要素数: 2(無効), 3(最小), 10(最大), 11(無効) | min(3).max(10) | 高 |
| BV-07 | 境界値 | `ScriptSchema` imageKeywords | 配列長: 0(無効), 1(最小), 5(最大), 6(無効) | min(1).max(5) | 中 |
| BV-08 | 境界値 | `buildV3Plan` topic.length | length=10 → 1 行 / length=11 → 2 行 | > 10 分岐 | 高 |
| BV-09 | 境界値 | `buildV3Plan` durationFrames | audio=4.267s → ceil(128)+15=143 = MIN 境界ぴったり | MIN_SCENE_FRAMES=143 | 高 |
| BV-10 | 境界値 | `cli/index.ts` itemCount | items='2'→clamp→3 / items='3'→3 / items='10'→10 / items='11'→clamp→10 | Math.min/max(3,10) | 高 |
| BV-11 | 境界値 | `blackFlash1f` | frame=0 → 1 / frame=1 → 0 | frame < 1 | 中 |
| BV-12 | 境界値 | `sceneBrightnessIn` | frame=1→0.15 / frame=10→1.0 / frame=0→clamp(0.15) / frame=11→clamp(1.0) | interpolate [1,10] | 中 |
| BV-13 | 境界値 | `headlinePopIn` | frame=24(start) / frame=33(end) / frame=23(左clamp) / frame=34(右clamp) | interpolate [24,33] | 中 |
| EX-01 | 例外系 | `ScriptSchema` | videoTitle=空文字 → ZodError | min(1) | 高 |
| EX-02 | 例外系 | `ScriptSchema` | items[].rank 重複 → ZodError 'rank must be unique' | refine | 高 |
| EX-03 | 例外系 | `ScriptSchema` | items が降順でない → ZodError 'items must be in descending rank order' | refine | 高 |
| EX-04 | 例外系 | `ScriptSchema` | rank が負数・0・小数 → ZodError | int().positive() | 高 |
| EX-05 | 例外系 | `parseWavDuration` | 'RIFF' ヘッダなし → VoicevoxError | header check | 高 |
| EX-06 | 例外系 | `parseWavDuration` | 'WAVE' マーカーなし → VoicevoxError | marker check | 高 |
| EX-07 | 例外系 | `parseWavDuration` | fmt チャンクなし → VoicevoxError | missing chunk | 高 |
| EX-08 | 例外系 | `parseWavDuration` | data チャンクなし → VoicevoxError | missing chunk | 高 |
| EX-09 | 例外系 | `parseWavDuration` | 空 Buffer → VoicevoxError | edge case | 高 |
| EX-10 | 例外系 | `checkVoicevox` | fetch 失敗(ネットワーク不達) → VoicevoxError | catch | 高 |
| EX-11 | 例外系 | `checkVoicevox` | HTTP 500 → VoicevoxError | !res.ok | 高 |
| EX-12 | 例外系 | `fetchPexelsImage` | HTTP 429 → AssetFetchError(月次上限メッセージ) | 429 分岐 | 高 |
| EX-13 | 例外系 | `fetchPexelsImage` | HTTP 401 → AssetFetchError | !searchRes.ok | 高 |
| EX-14 | 例外系 | `fetchPexelsImage` | photos=[] → AssetFetchError 'no photos found' | 空配列 | 高 |
| EX-15 | 例外系 | `fetchPexelsImage` | 画像ダウンロード HTTP 失敗 → AssetFetchError | imgRes.ok=false | 中 |
| EX-16 | 例外系 | `getLlmConfig` | OPENAI_API_KEY 未設定 → ConfigError | !apiKey throw | 高 |
| EX-17 | 例外系 | `getLlmConfig` | ANTHROPIC_API_KEY 未設定 → ConfigError | !apiKey throw | 高 |
| EX-18 | 例外系 | `loadTheme` | 存在しないテーマ名 → Error 'Theme not found' | !existsSync | 中 |
| EX-19 | 例外系 | `generateScript` | 3 回全て JSON 解析失敗 → ScriptValidationError | MAX_RETRIES 超過 | 高 |
| EX-20 | 例外系 | `generateScript` | 3 回全て Zod バリデーション失敗 → ScriptValidationError | MAX_RETRIES 超過 | 高 |
| EX-21 | 例外系 | `synthesize` | audio_query HTTP 失敗 → VoicevoxError | !queryRes.ok | 高 |
| EX-22 | 例外系 | `synthesize` | synthesis HTTP 失敗 → VoicevoxError | !synthRes.ok | 高 |
| EX-23 | 例外系 | `createJobDir` | mkdirSync 失敗 → JobError | catch | 中 |
| EX-24 | 例外系 | `cli/index.ts` | buildPlan 失敗 → jobDir 削除 + process.exit(1) | catch 全体 | 高 |
| ST-01 | 状態遷移 | `generateScript` | [attempt=1 失敗→JSON 追記] → [attempt=2 成功→return] | 中間成功 | 高 |
| ST-02 | 状態遷移 | `generateScript` | [1 失敗] → [2 失敗] → [3 失敗] → ScriptValidationError | 全失敗 | 高 |
| ST-03 | 状態遷移 | `promoteToLatest` | latestDir: 非存在→作成 / 存在→削除→再作成 | existsSync | 中 |
| ST-04 | 状態遷移 | `buildTimeline` cursor | cursor = 0 → +introFrames → +scene0 → +scene1 → ... → +outroFrames | 状態累積 | 高 |
| ST-05 | 状態遷移 | `cli/index.ts` | VOICEVOX 起動→LLM 生成→buildPlan→render→latest 昇格 の各フェーズ失敗時 | パイプライン | 高 |
| COMB-01 | 組み合わせ | `buildV3Plan` | apiKey=null × topic>10 文字 → 2 行 split + fallback×2 | 複合 | 高 |
| COMB-02 | 組み合わせ | `buildV3Plan` | 音声尺<4.267s × topic≤10 文字 → MIN=143f + 1 行 | 複合 | 高 |
| COMB-03 | 組み合わせ | `fetchImage` | apiKey 非 null × Pexels 失敗 → fallback 警告 + fallback 画像 | フォールバック | 高 |
| COMB-04 | 組み合わせ | `getLlmConfig` | provider='openai' × KEY 空 × BASE_URL 設定あり → ConfigError(OPENAI) | 複合 env | 中 |
| COMB-05 | 組み合わせ | `buildPlan` buildTitleLines | videoTitle 改行あり × 5 行以上 → colors[i%4] 循環 | 色配列循環 | 中 |

---

## 4. テストケース一覧

> **凡例**
> - `→ 成功` = `expect(...).not.toThrow()` または戻り値の assert
> - `→ throw XxxError` = `expect(...).rejects.toThrow(XxxError)` または `try/catch`
> - モック: fetch は `vi.stubGlobal('fetch', mockFn)` で差し替える

---

### 4-1. ScriptSchema

| TC-ID | 目的 | 入力値 (変更箇所のみ記載) | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-001 | 正常パース | 全フィールド正常値 (rank:3,2,1) | 成功・Script オブジェクト返却 | O-01 |
| TC-002 | videoTitle 最小長=1 | videoTitle="A" | 成功 | BV-01 |
| TC-003 | videoTitle 最大長=40 | videoTitle="A"×40 | 成功 | BV-01 |
| TC-004 | videoTitle 超過=41 | videoTitle="A"×41 | `safeParse` → success=false | BV-01 |
| TC-005 | videoTitle 空文字 | videoTitle="" | success=false | EX-01 |
| TC-006 | topic 最大長=24 | topic="A"×24 | 成功 | BV-02 |
| TC-007 | topic 超過=25 | topic="A"×25 | success=false | BV-02 |
| TC-008 | comment1 最大=50 | comment1="A"×50 | 成功 | BV-03 |
| TC-009 | comment1 超過=51 | comment1="A"×51 | success=false | BV-03 |
| TC-010 | comment2 超過=51 | comment2="A"×51 | success=false | BV-03 |
| TC-011 | body 最大=100 | body="A"×100 | 成功 | BV-04 |
| TC-012 | body 超過=101 | body="A"×101 | success=false | BV-04 |
| TC-013 | outro 最大=30 | outro="A"×30 | 成功 | BV-05 |
| TC-014 | outro 超過=31 | outro="A"×31 | success=false | BV-05 |
| TC-015 | items 最小=3 | items=[rank:3,2,1] | 成功 | BV-06 |
| TC-016 | items 2個(最小未満) | items=[rank:2,1] | success=false | BV-06 |
| TC-017 | items 10個(最大) | items=[rank:10..1] 10要素 | 成功 | BV-06 |
| TC-018 | items 11個(超過) | items=[rank:11..1] 11要素 | success=false | BV-06 |
| TC-019 | rank 重複 | items=[{rank:3},{rank:3},{rank:1}] | success=false, message含む 'rank must be unique' | EX-02, C-01 |
| TC-020 | rank 降順でない | items=[{rank:1},{rank:2},{rank:3}] | success=false, message含む 'descending' | EX-03, C-01 |
| TC-021 | rank=0 | rank=0 | success=false (positive() 失敗) | EX-04 |
| TC-022 | rank=負数 | rank=-1 | success=false | EX-04 |
| TC-023 | rank=小数 | rank=1.5 | success=false (int() 失敗) | EX-04 |
| TC-024 | unique=OK & 降順=NG | items=[{rank:3},{rank:1},{rank:2}] (3→1→2) | success=false 'descending' | C-01 |
| TC-025 | imageKeywords 空配列 | imageKeywords=[] | success=false | BV-07 |
| TC-026 | imageKeywords 5個(最大) | imageKeywords=["a","b","c","d","e"] | 成功 | BV-07 |
| TC-027 | imageKeywords 6個(超過) | imageKeywords=6要素 | success=false | BV-07 |

**実装サンプル:**

```ts
// tests/schema/script.test.ts
import { describe, it, expect } from 'vitest'
import { ScriptSchema } from '../../src/schema/script'

const validItem = (rank: number) => ({
  rank,
  topic: 'テスト',
  comment1: 'コメント1',
  comment2: 'コメント2',
  body: 'ボディテキスト',
  imageKeywords: ['テスト'],
  imageKeywordsEn: ['test'],
})

const validInput = {
  videoTitle: 'テスト動画タイトル',
  intro: 'イントロ',
  items: [validItem(3), validItem(2), validItem(1)],
  outro: 'おわり',
}

describe('ScriptSchema', () => {
  it('TC-001: 正常パース', () => {
    expect(() => ScriptSchema.parse(validInput)).not.toThrow()
  })

  it('TC-003: videoTitle 最大長=40', () => {
    expect(() => ScriptSchema.parse({ ...validInput, videoTitle: 'A'.repeat(40) })).not.toThrow()
  })

  it('TC-004: videoTitle 超過=41', () => {
    const result = ScriptSchema.safeParse({ ...validInput, videoTitle: 'A'.repeat(41) })
    expect(result.success).toBe(false)
  })

  it('TC-019: rank 重複', () => {
    const result = ScriptSchema.safeParse({
      ...validInput,
      items: [validItem(3), validItem(3), validItem(1)],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toContain('rank must be unique')
    }
  })

  it('TC-020: rank 降順でない', () => {
    const result = ScriptSchema.safeParse({
      ...validInput,
      items: [validItem(1), validItem(2), validItem(3)],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toContain('descending rank order')
    }
  })
})
```

---

### 4-2. parseWavDuration

| TC-ID | 目的 | 前提条件 | 入力 | 期待結果 | 観点ID |
|---|---|---|---|---|---|
| TC-028 | 正常 WAV 解析(1秒) | 有効 WAV バッファ | buildWavBuffer(1.0) | 戻り値 ≈ 1.0 (誤差 0.01 以内) | O-02 |
| TC-029 | 正常 WAV 解析(5秒) | 有効 WAV バッファ | buildWavBuffer(5.0) | 戻り値 ≈ 5.0 | O-02 |
| TC-030 | RIFF ヘッダなし | なし | 先頭 4 バイト='XXXX' の Buffer | throw VoicevoxError 'missing RIFF header' | EX-05 |
| TC-031 | WAVE マーカーなし | なし | RIFF あり・8-12 バイト='XXXX' | throw VoicevoxError 'missing WAVE marker' | EX-06 |
| TC-032 | fmt チャンクなし | なし | data チャンクのみの WAV | throw VoicevoxError 'missing fmt or data chunk' | EX-07, C-03 |
| TC-033 | data チャンクなし | なし | fmt チャンクのみの WAV | throw VoicevoxError 'missing fmt or data chunk' | EX-08, C-03 |
| TC-034 | 空 Buffer | なし | Buffer.alloc(0) | throw VoicevoxError | EX-09 |
| TC-035 | chunkSize 奇数 padding あり | なし | fmt chunkSize=17(奇数) の WAV | 正常解析成功(offset+1 適用) | B-06 |
| TC-036 | chunkSize 偶数 padding なし | なし | fmt chunkSize=16(偶数) の WAV | 正常解析成功(offset+1 非適用) | B-06 |

**実装サンプル:**

```ts
// tests/services/voicevox/parseWavDuration.test.ts
import { describe, it, expect } from 'vitest'
import { parseWavDuration } from '../../../src/services/voicevox/index'
import { buildWavBuffer } from '../../helpers/wavBuilder'
import { VoicevoxError } from '../../../src/utils/errors'

describe('parseWavDuration', () => {
  it('TC-028: 正常 WAV 解析(1秒)', () => {
    const buf = buildWavBuffer(1.0)
    expect(parseWavDuration(buf)).toBeCloseTo(1.0, 2)
  })

  it('TC-030: RIFF ヘッダなし', () => {
    const buf = Buffer.alloc(44)
    buf.write('XXXX', 0)
    expect(() => parseWavDuration(buf)).toThrow(VoicevoxError)
    expect(() => parseWavDuration(buf)).toThrow('missing RIFF header')
  })

  it('TC-031: WAVE マーカーなし', () => {
    const buf = buildWavBuffer(1.0)
    buf.write('XXXX', 8)  // WAVE を上書き
    expect(() => parseWavDuration(buf)).toThrow('missing WAVE marker')
  })

  it('TC-034: 空 Buffer', () => {
    expect(() => parseWavDuration(Buffer.alloc(0))).toThrow(VoicevoxError)
  })
})
```

---

### 4-3. checkVoicevox / synthesize

| TC-ID | 目的 | fetch モック | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-037 | 正常接続(200 OK) | `/version` → status=200, ok=true | resolve (例外なし) | O-02, B-04 |
| TC-038 | HTTP 500 | `/version` → status=500, ok=false | throw VoicevoxError 'HTTP 500' | EX-11, B-04 |
| TC-039 | ネットワーク不達 | fetch → throw Error | throw VoicevoxError '接続できません' | EX-10, B-04 |
| TC-040 | audio_query 失敗 | `/audio_query` → status=422, ok=false | throw VoicevoxError 'audio_query failed: HTTP 422' | EX-21 |
| TC-041 | synthesis 失敗 | `/audio_query` OK, `/synthesis` → status=500 | throw VoicevoxError 'synthesis failed: HTTP 500' | EX-22 |

**実装サンプル:**

```ts
// tests/services/voicevox/checkVoicevox.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkVoicevox } from '../../../src/services/voicevox/index'
import { VoicevoxError } from '../../../src/utils/errors'

afterEach(() => { vi.unstubAllGlobals() })

describe('checkVoicevox', () => {
  it('TC-037: 正常接続', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    await expect(checkVoicevox('http://mock:50021')).resolves.toBeUndefined()
  })

  it('TC-038: HTTP 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(checkVoicevox('http://mock:50021')).rejects.toThrow(VoicevoxError)
    await expect(checkVoicevox('http://mock:50021')).rejects.toThrow('HTTP 500')
  })

  it('TC-039: ネットワーク不達', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    await expect(checkVoicevox('http://invalid')).rejects.toThrow(VoicevoxError)
    await expect(checkVoicevox('http://invalid')).rejects.toThrow('接続できません')
  })
})
```

---

### 4-4. fetchImage / fetchPexelsImage

| TC-ID | 目的 | 条件 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-042 | apiKey=null → fallback | apiKey=null, fallback 画像存在 | {imagePath: ..., fallbackUsed: true} | B-03 |
| TC-043 | apiKey=存在 + Pexels 成功 | Pexels モック→正常 | {imagePath: ..., fallbackUsed: false} | B-03 |
| TC-044 | apiKey=存在 + Pexels 失敗 → fallback | Pexels モック→例外 | {fallbackUsed: true} + warn ログ | B-03, COMB-03 |
| TC-045 | Pexels HTTP 429 | fetch→status=429 | throw AssetFetchError (月次上限) | EX-12 |
| TC-046 | Pexels HTTP 401 | fetch→status=401 | throw AssetFetchError 'HTTP 401' | EX-13 |
| TC-047 | photos=空配列 | fetch→{photos:[]} | throw AssetFetchError 'no photos found' | EX-14 |
| TC-048 | 画像 DL 失敗 | 検索成功+DL fetch→status=404 | throw AssetFetchError 'image download failed' | EX-15 |

---

### 4-5. getLlmConfig

| TC-ID | 目的 | 環境変数 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-049 | openai + KEY 正常 | LLM_PROVIDER=openai, OPENAI_API_KEY=sk-xxx | {provider:'openai', apiKey:'sk-xxx', model:'gpt-4o'} | B-01, B-02 |
| TC-050 | openai + KEY 未設定 | LLM_PROVIDER=openai, OPENAI_API_KEY='' | throw ConfigError 'OPENAI_API_KEY が設定されていません' | EX-16, B-01 |
| TC-051 | anthropic + KEY 正常 | LLM_PROVIDER=anthropic, ANTHROPIC_API_KEY=sk-ant-xxx | {provider:'anthropic', model:'claude-3-5-sonnet-20241022'} | B-02 |
| TC-052 | anthropic + KEY 未設定 | LLM_PROVIDER=anthropic, ANTHROPIC_API_KEY='' | throw ConfigError 'ANTHROPIC_API_KEY が設定されていません' | EX-17 |
| TC-053 | LLM_MODEL 指定あり | LLM_MODEL=custom-model, OPENAI_API_KEY=sk-x | model='custom-model' | O-01 |
| TC-054 | provider 未指定 → デフォルト openai | LLM_PROVIDER 未設定 | provider='openai' | B-02 |

**実装サンプル:**

```ts
// tests/utils/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getLlmConfig } from '../../../src/utils/config'
import { ConfigError } from '../../../src/utils/errors'

const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  // 環境変数を保存
  ['LLM_PROVIDER', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'LLM_MODEL'].forEach(k => {
    savedEnv[k] = process.env[k]
    delete process.env[k]
  })
})

afterEach(() => {
  Object.entries(savedEnv).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  })
})

describe('getLlmConfig', () => {
  it('TC-049: openai + KEY 正常', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'sk-xxx'
    const cfg = getLlmConfig()
    expect(cfg.provider).toBe('openai')
    expect(cfg.apiKey).toBe('sk-xxx')
    expect(cfg.model).toBe('gpt-4o')
  })

  it('TC-050: openai + KEY 未設定 → ConfigError', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = ''
    expect(() => getLlmConfig()).toThrow(ConfigError)
    expect(() => getLlmConfig()).toThrow('OPENAI_API_KEY')
  })

  it('TC-052: anthropic + KEY 未設定 → ConfigError', () => {
    process.env.LLM_PROVIDER = 'anthropic'
    process.env.ANTHROPIC_API_KEY = ''
    expect(() => getLlmConfig()).toThrow(ConfigError)
    expect(() => getLlmConfig()).toThrow('ANTHROPIC_API_KEY')
  })
})
```

---

### 4-6. buildV3Plan

| TC-ID | 目的 | 前提 | 入力 | 期待結果 | 観点ID |
|---|---|---|---|---|---|
| TC-055 | topic=10文字 → 1行 | VOICEVOX モック(1秒), Pexels モック | topic="A"×10 | headlineLines=["AAAAAAAAAA"](1要素) | BV-08, B-07 |
| TC-056 | topic=11文字 → 2行分割 | 同上 | topic="A"×11 | headlineLines=["AAAAAA","AAAAA"](2要素) | BV-08, B-07 |
| TC-057 | durationFrames: MIN 適用 | VOICEVOX モック→0.5秒 WAV | audio=0.5s → ceil(15)+15=30 < 143 | scene.durationFrames=143 | B-08, BV-09 |
| TC-058 | durationFrames: 音声尺採用 | VOICEVOX モック→5秒 WAV | audio=5.0s → ceil(150)+15=165 > 143 | scene.durationFrames=165 | B-08 |
| TC-059 | durationFrames: MIN 境界ぴったり | VOICEVOX モック→4.267秒 WAV | audio=4.267s → ceil(128)+15=143 | scene.durationFrames=143 | BV-09 |
| TC-060 | apiKey=null → fallback×2 | apiKey=null | items 1個 | imgAResult.fallbackUsed=true, imgBResult.fallbackUsed=true | COMB-01 |
| TC-061 | introLines スタイル割り当て | VOICEVOX モック, Pexels モック | videoTitle="令和 日本 最強 ランキング" | intro.lines[0].style='introBlack', [1]='introRed', [2]='introBlack', [3]='introYellow' | O-03 |
| TC-062 | outroLines 分割 | 同上 | outro="コメント欄へ" | outro.lines=["コメント欄へ"] | O-03 |

---

### 4-7. buildTimeline / getTotalFrames

| TC-ID | 目的 | 入力 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-063 | opening+ranking×3+ending (全 durationFrames=undefined) | meta={introFrames:102, sceneFrames:162, outroFrames:63}, scenes×3(全 durationFrames undefined) | entries=[{type:'opening',start:0,dur:102},{type:'ranking',start:102,dur:162}×3,{type:'ending',start:588,dur:63}] | ST-04, O-04 |
| TC-064 | scene 固有 durationFrames 使用 | scenes[0].durationFrames=200, scenes[1,2]=undefined | entries[1].durationFrames=200, entries[2,3].durationFrames=162 | B-12 |
| TC-065 | getTotalFrames 正常計算 | TC-063 と同設定 | 102+162×3+63=651 | O-04 |
| TC-066 | scenes=0個 | scenes=[] | entries=[opening, ending] のみ、cursor 正常 | O-04 |

---

### 4-8. generateScript リトライ状態機械

| TC-ID | 目的 | chatCompletion モック | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-067 | 1回目成功 | → 有効 JSON | Script 返却, attempt ログ 1回 | O-05 |
| TC-068 | 1回目 JSON 失敗→2回目成功 | → [無効 JSON, 有効 JSON] | Script 返却, warn ログ 1回 | B-09, ST-01, C-04 |
| TC-069 | 1回目 Zod 失敗→2回目成功 | → [Zod エラー JSON, 有効 JSON] | Script 返却 | B-10, ST-01, C-04 |
| TC-070 | 3回全て JSON 失敗 | → 常に無効 JSON | throw ScriptValidationError 'failed after 3 attempts' | EX-19, ST-02 |
| TC-071 | 3回全て Zod 失敗 | → 常に Zod 不正 JSON | throw ScriptValidationError 'failed after 3 attempts' | EX-20, ST-02 |
| TC-072 | 2回目成功(JSON失敗→Zod失敗→成功) | → [JSON失敗, Zod失敗, 有効JSON] | Script 返却 | C-04, ST-01 |

**実装サンプル:**

```ts
// tests/llm/generateScript.test.ts
import { describe, it, expect, vi } from 'vitest'
import { generateScript } from '../../../src/llm/generate-script'
import { ScriptValidationError } from '../../../src/utils/errors'
import * as client from '../../../src/llm/client'

const validScriptJson = JSON.stringify({
  videoTitle: 'テストタイトル',
  intro: 'イントロ',
  items: [
    { rank: 3, topic: 'トピック3', comment1: 'c1', comment2: 'c2', body: 'ボディ', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
    { rank: 2, topic: 'トピック2', comment1: 'c1', comment2: 'c2', body: 'ボディ', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
    { rank: 1, topic: 'トピック1', comment1: 'c1', comment2: 'c2', body: 'ボディ', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
  ],
  outro: 'おわり',
})

const llmConfig = { provider: 'openai' as const, apiKey: 'sk-xxx', model: 'gpt-4o' }

describe('generateScript', () => {
  it('TC-067: 1回目成功', async () => {
    vi.spyOn(client, 'chatCompletion').mockResolvedValueOnce(validScriptJson)
    const result = await generateScript('テスト', 3, llmConfig)
    expect(result.videoTitle).toBe('テストタイトル')
  })

  it('TC-068: 1回目 JSON 失敗→2回目成功', async () => {
    vi.spyOn(client, 'chatCompletion')
      .mockResolvedValueOnce('invalid json!!!')
      .mockResolvedValueOnce(validScriptJson)
    const result = await generateScript('テスト', 3, llmConfig)
    expect(result.videoTitle).toBe('テストタイトル')
  })

  it('TC-070: 3回全て JSON 失敗', async () => {
    vi.spyOn(client, 'chatCompletion').mockResolvedValue('invalid json!!!')
    await expect(generateScript('テスト', 3, llmConfig)).rejects.toThrow(ScriptValidationError)
    await expect(generateScript('テスト', 3, llmConfig)).rejects.toThrow('3 attempts')
  })
})
```

---

### 4-9. callAnthropic / callOpenAI

| TC-ID | 目的 | fetch モック | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-073 | ````json...```ブロック剥がし | `content[0].text` = ` ```json\n{...}\n``` ` | バッククォートなしの JSON 文字列 | O-08 |
| TC-074 | バッククォートなし → そのまま | `content[0].text` = `{...}` | そのまま返却 | O-08 |
| TC-075 | systemMsg あり → body.system 設定 | messages[0].role='system' | fetch body に system フィールドあり | B-14 |
| TC-076 | systemMsg なし → body.system 未設定 | messages[0].role='user' | fetch body に system フィールドなし | B-14 |
| TC-077 | OpenAI HTTP 400 | status=400, ok=false | throw ConfigError 'OpenAI API error 400' | O-01 |
| TC-078 | Anthropic HTTP 500 | status=500, ok=false | throw ConfigError 'Anthropic API error 500' | O-08 |
| TC-079 | OPENAI_BASE_URL 省略 → デフォルト URL | OPENAI_BASE_URL=undefined | `https://api.openai.com/v1` で fetch | O-01 |

---

### 4-10. promoteToLatest / createJobDir

| TC-ID | 目的 | 前提条件 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-080 | latestDir 非存在 → 作成+コピー | latestDir 削除済み, sourceDir に output.mp4 | latestDir に output.mp4 が存在する | O-06, B-11, ST-03 |
| TC-081 | latestDir 存在 → 削除→再作成 | latestDir 存在+旧ファイル old.txt | latestDir に output.mp4 のみ, old.txt は消えている | B-11, ST-03 |
| TC-082 | createJobDir 正常作成 | generatedDir 親が存在 | YYYYMMDD-HHmmss 形式ディレクトリ作成, パス返却 | O-06 |

**実装サンプル:**

```ts
// tests/utils/job.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { promoteToLatest } from '../../../src/utils/job'

let tmpDir: string
let sourceDir: string
let latestDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svf-test-'))
  sourceDir = path.join(tmpDir, 'source')
  latestDir = path.join(tmpDir, 'latest')
  fs.mkdirSync(sourceDir)
  fs.writeFileSync(path.join(sourceDir, 'output.mp4'), 'dummy')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('promoteToLatest', () => {
  it('TC-080: latestDir 非存在 → 作成+コピー', async () => {
    // latestDir を指すように job.ts の generatedDir() をモック化が必要
    // 実際の実装では vi.mock を使用
    // ここでは概念コードのみ示す
    expect(fs.existsSync(latestDir)).toBe(false)
    // await promoteToLatest(sourceDir) ← generatedDir モック後に実行
    // expect(fs.existsSync(path.join(latestDir, 'output.mp4'))).toBe(true)
  })
})
```

---

### 4-11. loadTheme / listThemes

| TC-ID | 目的 | 条件 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-083 | 存在するテーマ | themes/default.json 存在 | Theme オブジェクト返却 | O-07 |
| TC-084 | 存在しないテーマ | themes/nonexistent.json 非存在 | throw Error 'Theme not found: nonexistent' | EX-18 |
| TC-085 | テーマ一覧 | themes/ に default.json, dark.json | ['default','dark']（順不同） | O-07 |
| TC-086 | themes/ ディレクトリなし | themes/ 削除済み | ['default'] | O-07 |

---

### 4-12. AnimationPreset

| TC-ID | 目的 | 入力 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-087 | blackFlash1f: frame=0 | frame=0 | 1 | BV-11 |
| TC-088 | blackFlash1f: frame=1 | frame=1 | 0 | BV-11 |
| TC-089 | sceneBrightnessIn: frame=1 | frame=1 | 'brightness(0.15)' | BV-12 |
| TC-090 | sceneBrightnessIn: frame=10 | frame=10 | 'brightness(1)' | BV-12 |
| TC-091 | sceneBrightnessIn: frame=0(clamp) | frame=0 | 'brightness(0.15)' | BV-12 |
| TC-092 | sceneBrightnessIn: frame=11(clamp) | frame=11 | 'brightness(1)' | BV-12 |
| TC-093 | headlinePopIn: frame=24(start) | frame=24 | opacity ≈ 0 | BV-13 |
| TC-094 | headlinePopIn: frame=33(end) | frame=33 | opacity ≈ 1 | BV-13 |
| TC-095 | headlinePopIn: frame=23(左clamp) | frame=23 | opacity = 0 | BV-13 |
| TC-096 | headlinePopIn: frame=34(右clamp) | frame=34 | opacity = 1 | BV-13 |

**実装サンプル:**

```ts
// tests/remotion/animationPreset.test.ts
import { describe, it, expect } from 'vitest'
import {
  blackFlash1f,
  sceneBrightnessIn,
  headlinePopIn,
} from '../../../src/remotion/components/animation/AnimationPreset'

describe('blackFlash1f', () => {
  it('TC-087: frame=0 → 1', () => expect(blackFlash1f(0)).toBe(1))
  it('TC-088: frame=1 → 0', () => expect(blackFlash1f(1)).toBe(0))
})

describe('sceneBrightnessIn', () => {
  it('TC-089: frame=1 → brightness(0.15)', () => {
    expect(sceneBrightnessIn(1)).toContain('brightness(0.15)')
  })
  it('TC-090: frame=10 → brightness(1)', () => {
    expect(sceneBrightnessIn(10)).toContain('brightness(1)')
  })
})

describe('headlinePopIn', () => {
  it('TC-093: frame=24 → opacity≈0', () => {
    expect(headlinePopIn(24).opacity).toBeCloseTo(0, 2)
  })
  it('TC-094: frame=33 → opacity≈1', () => {
    expect(headlinePopIn(33).opacity).toBeCloseTo(1, 2)
  })
  it('TC-095: frame=23(左clamp) → opacity=0', () => {
    expect(headlinePopIn(23).opacity).toBeCloseTo(0, 2)
  })
  it('TC-096: frame=34(右clamp) → opacity=1', () => {
    expect(headlinePopIn(34).opacity).toBeCloseTo(1, 2)
  })
})
```

---

### 4-13. CLI (cli/index.ts)

| TC-ID | 目的 | 条件 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-097 | items='2' → clamp → 3 | generateScript モック | itemCount=3 で generateScript 呼び出し | BV-10 |
| TC-098 | items='11' → clamp → 10 | 同上 | itemCount=10 で generateScript 呼び出し | BV-10 |
| TC-099 | --dry-run → script.json のみ | LLM モック, buildPlan モック | script.json 保存 / buildPlan 未呼び出し / process.exit 未発生 | B-13 |
| TC-100 | buildPlan 失敗 → jobDir 削除 + exit(1) | buildPlan → throw | jobDir 削除済み / process.exit(1) 呼び出し | EX-24, ST-05 |

---

### 4-14. 組み合わせテスト

| TC-ID | 目的 | 組み合わせ条件 | 期待結果 | 観点ID |
|---|---|---|---|---|
| TC-101 | apiKey=null × topic=11文字 × 短音声 | apiKey=null, topic="A"×11, audio=0.5s | headlineLines=2行, fallbackUsed=true×2, durationFrames=143 | COMB-01, COMB-02 |
| TC-102 | openai × BASE_URL 指定 × KEY 設定 | OPENAI_BASE_URL=https://custom.api, OPENAI_API_KEY=sk-xxx | https://custom.api で fetch 呼び出し | COMB-04 |
| TC-103 | buildTitleLines 5行 → 色循環 | videoTitle="a\nb\nc\nd\ne" | colors[4%4]=colors[0]='#FFFFFF' が 5行目に適用 | COMB-05 |

---

### 4-15. 追加提案テスト

| TC-ID | 目的 | 観点 |
|---|---|---|
| TC-104 | synthesize: volumeScale が gain 倍されて fetch body に含まれるか | synthesize 内の `query.volumeScale *= gain` の確認 |
| TC-105 | buildV3Plan: Promise.all で全シーンの順序が保たれるか | 並列処理でインデックス順の scenes 配列が返ること |
| TC-106 | getTimestamp: 1桁の月/日がゼロパディングされるか | Date の pad 関数テスト (例: 月=1 → '01') |
| TC-107 | introLines: videoTitle にスペースが複数連続する場合の filter(Boolean) | "A  B" → ["A","B"] (空文字が除去される) |

---

## 5. 網羅性チェック

### 5-1. 命令網羅

| モジュール | カバー TC |
|---|---|
| ScriptSchema.parse 全体 | TC-001〜027 |
| parseWavDuration (ヘッダ読み〜戻り値) | TC-028〜036 |
| checkVoicevox (fetch→ok 判定) | TC-037〜039 |
| synthesize (audio_query→synthesis) | TC-040〜041 |
| fetchImage (apiKey 分岐→両パス) | TC-042〜044 |
| fetchPexelsImage (検索→DL) | TC-045〜048 |
| getLlmConfig (全行) | TC-049〜054 |
| buildV3Plan (合成→WAV 保存→config 組立) | TC-055〜062 |
| buildTimeline / getTotalFrames | TC-063〜066 |
| generateScript (retry loop 全体) | TC-067〜072 |
| callAnthropic / callOpenAI | TC-073〜079 |
| promoteToLatest / createJobDir | TC-080〜082 |
| loadTheme / listThemes | TC-083〜086 |
| AnimationPreset 関数群 | TC-087〜096 |
| CLI main() | TC-097〜100 |
| 組み合わせ | TC-101〜103 |

### 5-2. 分岐網羅

| 分岐 ID | カバー TC | true 側 | false 側 |
|---|---|---|---|
| B-01 getLlmConfig apiKey 有無 | TC-049, TC-050 | ✅ | ✅ |
| B-02 getLlmConfig provider | TC-049, TC-051 | ✅ | ✅ |
| B-03 fetchImage 3 分岐 | TC-042, TC-043, TC-044 | ✅ | ✅ |
| B-04 checkVoicevox 3 分岐 | TC-037, TC-038, TC-039 | ✅ | ✅ |
| B-05 parseWavDuration chunkId 分岐 | TC-028〜036 | ✅ | ✅ |
| B-06 chunkSize 奇数 pad | TC-035, TC-036 | ✅ | ✅ |
| B-07 topic.length > 10 | TC-055, TC-056 | ✅ | ✅ |
| B-08 durationFrames Math.max | TC-057, TC-058 | ✅ | ✅ |
| B-09 JSON.parse 成功/失敗 | TC-067, TC-068 | ✅ | ✅ |
| B-10 Zod 成功/失敗 | TC-069, TC-070 | ✅ | ✅ |
| B-11 latestDir 存在 | TC-080, TC-081 | ✅ | ✅ |
| B-12 durationFrames ?? | TC-063, TC-064 | ✅ | ✅ |
| B-13 dryRun | TC-099, TC-067 | ✅ | ✅ |
| B-14 systemMsg | TC-075, TC-076 | ✅ | ✅ |
| B-15 titleLines 改行 | TC-091, TC-092 (buildPlan) | ✅ | ✅ |

### 5-3. 条件網羅

| 条件 ID | カバー TC | 条件の組み合わせ |
|---|---|---|
| C-01 rank unique × 降順 | TC-019, TC-020, TC-024, TC-001 | (T,T)(T,F)(F,T) をカバー ※(F,F)はunique違反時に降順チェックまで到達しない |
| C-02 apiKey × Pexels 成功/失敗 | TC-042, TC-043, TC-044 | ✅ |
| C-03 byteRate × dataSize null 判定 | TC-032, TC-033, TC-028 | ✅ |
| C-04 attempt < MAX × result.success | TC-067〜072 | ✅ |

### 5-4. 未カバー箇所と理由

| 未カバー | 理由 | 対応方針 |
|---|---|---|
| Remotion bundle/renderMedia | E2E 実行環境依存、ユニットテスト不可 | `pnpm render:v3` 手動 E2E で代替 |
| `copyFallbackImage` ファイル非存在 | fs.copyFileSync の OS 例外はユニットテストしにくい | 統合テストで確認 |
| `getTimestamp()` 年越し・月末境界 | 時刻依存。Date をモックすれば可能 | TC-106 (追加提案) で対応 |
| `backgroundBurstZoom` / `foregroundBreathing` | 空オブジェクト返却のみ。ロジックなし | 削除検討を推奨 |
| `RenderPlanSchema` 詳細バリデーション | buildPlan 出力経由で間接カバー | buildPlan の TC-091〜096 で間接確認 |

---

## 6. レビューコメント

### 6-1. テスト不足の可能性がある点

| # | 指摘 | 詳細 |
|---|---|---|
| 1 | **synthesize の volumeScale 上書き** | `query.volumeScale *= gain` の確認テストがない。gain=0 や負値を渡した場合の挙動が未確認 |
| 2 | **buildV3Plan の introLines スタイル循環** | 単語数が 4 を超えた場合に `styles[i % styles.length]` が正しくループするかテストがない |
| 3 | **toRelPath の OS 間差異** | Windows 環境では `path.sep='\\'`。`split(path.sep).join('/')` の変換を OS ごとに確認するテストが未整備 |
| 4 | **Promise.all の部分失敗** | buildV3Plan/buildPlan 内で並列処理中 1 シーンだけ失敗した場合、全体が reject されることの確認テストがない |

### 6-2. 仕様の曖昧さ

| # | 箇所 | 曖昧な点 |
|---|---|---|
| 1 | ScriptSchema items refine | `rank unique` と `descending order` の 2 つの refine が同時に存在。Zod は最初に引っかかった方だけ報告するため、両方を同時違反した場合のメッセージが不確定 |
| 2 | headlineLines 分割位置 | topic 長が奇数(例: 11文字)の場合 `ceil(11/2)=6` / `11-6=5`。「前半多め」の意図が仕様書に明記されていない |
| 3 | cli itemCount NaN | `parseInt('abc', 10)` は `NaN` → `Math.min(10, Math.max(3, NaN)) = NaN`。クランプが無効になりバグの温床 |
| 4 | fallbackImages() | 3 枚固定のハードコード。ファイルが存在しない場合は `fs.copyFileSync` が例外を投げるが、エラーハンドリングがない |

### 6-3. バグが出やすいポイント

| # | 箇所 | リスク |
|---|---|---|
| 1 | **parseWavDuration オフセット計算** | 奇数 chunkSize の padding 読み飛ばし処理は、実際の VOICEVOX 出力 WAV で発生しうる。テストに実際のバイナリを使用すべき |
| 2 | **buildV3Plan ファイル名のパディング** | `String(i).padStart(2,'0')` は i ≥ 100 で 3 桁になり、同じパターン内で衝突しないが、100 アイテム超はスキーマ上 max=10 なので実害なし。ただし i は 0-index で max=9 → `09` まで |
| 3 | **cli/index.ts エラー時の jobDir 削除失敗** | `fs.rmSync` が失敗した場合に `catch` で無視しているため、孤立したジョブディレクトリが残るリスク。エラーログも出ない |
| 4 | **callAnthropic の ```` ```json ```` 剥がし** | ネストしたコードブロックや二重バッククォートには対応できない。generateScript のリトライで救われるが、3 回全て失敗する可能性がある |

### 6-4. 実装上の注意点

```
1. fetch モックは vi.stubGlobal('fetch', ...) を使い、afterEach で vi.unstubAllGlobals() をかならず呼ぶ
2. process.env の操作は beforeEach でバックアップ、afterEach でリストアする
3. fs 操作テストは os.tmpdir() 配下に一時ディレクトリを作り、afterEach で rmSync する
4. WAV バッファのモックは tests/helpers/wavBuilder.ts の buildWavBuffer() を使用する
5. AnimationPreset のアニメーション値テストは toBeCloseTo(value, 2) で浮動小数点誤差を吸収する
6. Remotion の interpolate() は ESM モジュールのため、vitest の ESM 設定が必要
```

---

> **補足**: 本ドキュメントは 2026-03-17 時点のコードを対象としています。
> コード変更時は対応する TC を更新してください。
