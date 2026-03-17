# Short Video Factory

1コマンドで縦型ランキング動画（MP4）を自動生成するツール。

- LLM で台本生成 → VOICEVOX で音声合成 → Pexels で画像取得 → Remotion でレンダリング

## 動画仕様

| 項目 | 値 |
|------|----|
| 解像度 | 1080 × 1920（縦型） |
| フレームレート | 30fps |
| コーデック | H.264 + AAC |
| フォーマット | ランキング形式（intro → 各順位シーン → outro） |

---

## 必要環境

| ツール | バージョン | 備考 |
|--------|----------|------|
| Node.js | 20+ | |
| pnpm | 9+ | `npm install -g pnpm` |
| FFmpeg | 最新 | PATH に通っていること |
| VOICEVOX | 最新 | ローカル起動 `localhost:50021` |
| Noto Sans JP | — | Windows: 標準搭載 / Mac: 要インストール |

---

## インストール手順

```bash
git clone <repo-url>
cd short-video-factory
pnpm install
cp .env.example .env
# .env を編集して API キーを設定
```

---

## VOICEVOX 起動方法

### GUI アプリ（推奨）

VOICEVOX アプリを起動するだけ。`localhost:50021` で自動起動します。

### ヘッドレス（サーバー向け）

```bash
voicevox --headless
```

---

## .env 設定方法

`.env.example` をコピーして編集してください。

| 変数 | 必須 | 説明 |
|------|------|------|
| `LLM_PROVIDER` | ✅ | `openai` または `anthropic` |
| `OPENAI_API_KEY` | ✅（openai時） | OpenAI API キー |
| `ANTHROPIC_API_KEY` | ✅（anthropic時） | Anthropic API キー |
| `LLM_MODEL` | — | 省略時: openai→`gpt-4o`, anthropic→`claude-3-5-sonnet-20241022` |
| `PEXELS_API_KEY` | — | 省略するとローカル fallback 画像を使用 |
| `VOICEVOX_URL` | — | デフォルト: `http://localhost:50021` |
| `VOICEVOX_SPEAKER` | — | 話者ID（デフォルト: 3 = 春日部つむぎ） |
| `VOICEVOX_GAIN` | — | 音量倍率（デフォルト: 1.5） |

---

## 実行コマンド

```bash
# フル生成（台本 → 音声 → 画像 → 動画）
pnpm generate --topic "やってはいけない転職のミス" --items 5

# 台本のみ生成して確認（VOICEVOX 不要）
pnpm generate --topic "やってはいけない転職のミス" --dry-run

# 項目数を変える
pnpm generate --topic "最強の朝ごはんランキング" --items 3

# Remotion プレビュー（ブラウザでリアルタイム確認）
pnpm preview
```

---

## 出力先

| パス | 説明 |
|------|------|
| `generated/latest/output.mp4` | 最新の成功ジョブ |
| `generated/jobs/{timestamp}/output.mp4` | ジョブ別アーカイブ |
| `generated/jobs/{timestamp}/script.json` | 生成台本 |
| `generated/jobs/{timestamp}/render-plan.json` | レンダリング計画 |

---

## Windows / WSL 構成別セットアップ

### 構成A: Windows ネイティブ（推奨）

- VOICEVOX Windows 版を起動
- Node.js Windows 版を使用
- `.env` はデフォルト設定でOK

### 構成B: WSL2 + Windows VOICEVOX

WSL2 から Windows 側の VOICEVOX に接続する場合:

```bash
# Windows ホストの IP を確認
cat /etc/resolv.conf | grep nameserver

# .env に設定
VOICEVOX_URL=http://172.x.x.x:50021
```

### 構成C: WSL2 完結

VOICEVOX Linux 版を WSL2 内で起動:

```bash
# WSL2 内で VOICEVOX を起動
./voicevox --headless
# .env はデフォルト設定でOK
```

---

## よくあるエラーと対処法

### `OPENAI_API_KEY が設定されていません`

```
.env ファイルに OPENAI_API_KEY=sk-... を追加してください。
```

### `VOICEVOX に接続できません`

```
1. VOICEVOX アプリを起動してください
2. WSL2 の場合は VOICEVOX_URL に Windows ホスト IP を設定
   例: VOICEVOX_URL=http://172.x.x.x:50021
```

### `Pexels API の月次リクエスト上限に達しました`

```
PEXELS_API_KEY を .env からコメントアウトすると fallback 画像が使われます。
```

### `FFmpeg not found`

```
FFmpeg をインストールして PATH に通してください。
  Windows: https://ffmpeg.org/download.html
  Mac: brew install ffmpeg
  Ubuntu: sudo apt install ffmpeg
```

---

## ライセンス・クレジット

- VOICEVOX: https://voicevox.hiroshiba.jp/
- Pexels: https://www.pexels.com/
- MIT License

---

## 今後の拡張予定

- listicle フォーマット
- BGM 追加
- YouTube 自動投稿
