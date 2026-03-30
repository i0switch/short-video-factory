# Short Video Factory

縦型ショート動画を **1コマンドで自動生成** するツール。
ユーザーがテーマを伝えるだけで、AIが台本JSON作成 → `pnpm render:v3` で動画出力する。

## 対応フォーマット

| フォーマット | 説明 | テンプレ |
|---|---|---|
| **ランキング形式** | 10→1カウントダウン | `templates/scripts/ranking-black-company.json` |
| **2ch風ナラティブ** | 1話完結ストーリー（15-20シーン） | `templates/scripts/2ch-narrative.json` |
| **2ch風オムニバス** | 複数エピソード詰め合わせ | `templates/scripts/2ch-omnibus.json` |
| **2ch風超ショート** | 一発ネタ12秒 | `templates/scripts/2ch-ultrashort.json` |

## 動画生成ワークフロー（AIエージェント向け）

ユーザーが「動画作って」と言ったら:
1. **「どんなスタイルの動画がいい？」と聞く**（上記4種から選択）
2. 選択に応じたテンプレで台本JSON生成
3. `pnpm render:v3` でレンダリング

### Step 1: 台本JSONを生成する

テーマに合わせて `fixtures/sample-script.json` を作成する。テンプレは `templates/scripts/` を参考に。

#### ランキング形式（従来）

```json
{
  "videoTitle": "テーマのタイトル（20文字以内推奨）",
  "intro": "タイトルの読み上げテキスト",
  "items": [
    {
      "rank": 10,
      "topic": "お題（9文字以内推奨、画面に赤文字で大きく出る）",
      "comment1": "青枠コメント（共感系、15文字以内、青山龍星が読む）",
      "comment2": "赤枠コメント（ツッコミ系、15文字以内、四国めたんが読む）",
      "body": "ナレーション本文（画面に出ない、ずんだもんが読む）",
      "imageKeywords": ["日本語キーワード"],
      "imageKeywordsEn": ["english keyword"]
    }
  ],
  "outro": "みんなの意見はコメント欄へ！"
}
```

**台本作成ルール:**
- items は rank: 10 → 1 のカウントダウン順（10個推奨）
- `topic` は短く（画面に巨大フォントで出るため、長いと改行で崩れる）
- `comment1` は共感・疑問系（「〜だよね」「〜って思う」）
- `comment2` はツッコミ・断定系（「〜やろ」「〜に決まっとる」）
- `body` は topic の解説（30〜60文字、読み上げ専用）
- `imageKeywords` はいらすとや検索用（日本語1〜2語）
- `imageKeywordsEn` はPexels検索用（英語2〜3語）
- `videoTitle` は自動改行されるので7文字×3行=21文字程度がベスト

#### 2ch風（新規）

```json
{
  "format": "2ch",
  "videoTitle": "タイトル（20文字以内）",
  "episodes": [
    {
      "title": "エピソードタイトル（オムニバスの場合）",
      "scenes": [
        {
          "speaker": "narrator|character1|character2",
          "text": "セリフテロップ（20文字以内、画面表示）",
          "narration": "読み上げテキスト（省略時はtextを使用）",
          "emotion": "neutral|anger|confusion|shock|happy|sad",
          "effect": "none|concentration_lines|vortex|lightning|sparkle|rain|shake",
          "imageKeywords": ["日本語キーワード"],
          "imageKeywordsEn": ["english keyword"]
        }
      ]
    }
  ],
  "outro": "チャンネル登録よろしく！"
}
```

**2ch風台本作成ルール:**
- scenes は15-20個が標準（1.5-3秒/シーン、合計40-60秒）
- `text` は画面表示テロップ（20文字以内推奨）
- `speaker` は narrator/character1/character2 で色分け（青/赤/緑）
- `emotion` は背景色を決める（neutral=ベージュ, anger=赤, confusion=青紫, shock=黒, happy=黄金, sad=暗青）
- `effect` はエフェクト（none/concentration_lines/vortex/lightning/sparkle/rain/shake）
- クライマックスには `concentration_lines` か `lightning` を使う
- 日常シーンは `neutral` + `none` でテンポよく
- オムニバスの場合は `episodes` を複数にし、各エピソードに `title` を付ける

### Step 2: レンダリング実行

```bash
pnpm render:v3
```

出力: `generated/latest/output.mp4`（BGM自動合成済み、約59秒）

### Step 3: 圧縮（任意）

```bash
ffmpeg -i generated/latest/output.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -movflags +faststart generated/latest/output_compressed.mp4
```

### 前提条件
- VOICEVOX がローカルで起動していること（port 50021）
- ffmpeg が PATH に通っていること

---

## 技術スタック

TypeScript strict / pnpm / Remotion / VOICEVOX / ffmpeg / zod

## デザイン上の重要ルール

- テキストは **巨大**（タイトル120px, 順位160px, トピック120px, コメント72px）
- 縁取りは **太い**（8px 黒 + paintOrder: stroke fill + drop shadow）
- サンバーストは **5deg 間隔**（10deg だと別物になる）
- body テキストは **画面に表示しない**（VOICEVOX 読み上げ専用）
- ランキングシーンのレイアウト: 順位(上) → 青枠+赤枠(中) → 画像(下)
- デザイン定数は `src/remotion/design-tokens.ts` に集約

## 重要な設計判断

- **マルチフォーマット**: `format` フィールドで分岐（'ranking' or '2ch'、未指定は ranking）
- **2段スキーマ**: Script → RenderPlan → Remotion（Remotion は Script を直接見ない）
- **ジョブ隔離**: generated/jobs/{timestamp}/ に出力。成功時のみ latest/ に昇格
- **BGM**: assets/bgm/ のmp3をffmpegで後から合成（Remotion外）
- **3話者**: ずんだもん(narrator) / 青山龍星(character1) / 四国めたん(character2)
- **2ch感情背景**: EmotionBackground.tsx で emotion に応じた背景色切替
- **2chエフェクト**: EffectLayer.tsx で集中線/渦巻き/稲妻/キラキラ/雨/画面揺れ

## Ghost Auto Memory
- セッション開始時、または本格作業前に `C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost\AUTO_MEMORY.md` を確認し、その手順に従う
- 基本は最初に `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory recall` を実行する
- 続き物や過去知見が必要なときは `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory search "query"` を使う
- 完了前に、再利用価値が高い内容だけを短く `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory add "content" fact "source"` する
- 定期同期は `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-sync.ps1"` で回せる
- 毎回ユーザーへ記憶操作を報告しなくていい
- APIキー、パスワード、秘密情報は保存しない