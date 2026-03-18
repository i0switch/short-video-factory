# Short Video Factory

ランキング形式の縦型ショート動画（TikTok / Reels / Shorts）を **1コマンドで自動生成** するツール。

## 出力イメージ

- 1080x1920 縦型 / 30fps / 約59秒
- サンバースト背景 + いらすとや画像 + VOICEVOX 3話者音声 + BGM自動合成
- イントロ → 第10位〜第1位 → CTA の構成

## セットアップ

```bash
pnpm install
cp .env.example .env
```

### 必要な外部ツール

| ツール | 用途 | 備考 |
|--------|------|------|
| Node.js 20+ | ランタイム | |
| pnpm 9+ | パッケージ管理 | `npm install -g pnpm` |
| [VOICEVOX](https://voicevox.hiroshiba.jp/) | 音声合成 | ローカルで起動しておく (port 50021) |
| [ffmpeg](https://ffmpeg.org/) | BGM合成・動画圧縮 | PATH に通しておく |
| Noto Sans JP | フォント | Windows: 標準搭載 / Mac: 要インストール |

### 環境変数 (.env)

```env
VOICEVOX_URL=http://localhost:50021
VOICEVOX_SPEAKER=1          # ずんだもん (イントロ・順位・トピック・CTA)
VOICEVOX_SPEAKER_MALE=13    # 青山龍星 (青枠コメント)
VOICEVOX_SPEAKER_FEMALE=0   # 四国めたん (赤枠コメント)
VOICEVOX_GAIN=3.5            # 音量倍率
PEXELS_API_KEY=              # 省略時はいらすとや + fallback画像を使用
```

---

## 動画の作り方

### Step 1: 台本JSONを用意する

`fixtures/sample-script.json` を編集する。テンプレートは `templates/scripts/` にあるのでコピーしてもOK。

```bash
# テンプレートから始める場合
cp templates/scripts/ranking-black-company.json fixtures/sample-script.json
```

#### 台本の書き方

```json
{
  "videoTitle": "入社して気づく会社のやばい特徴ランキング",
  "intro": "入社して気づく会社のやばい特徴ランキングを挙げてけww",
  "items": [
    {
      "rank": 10,
      "topic": "残業代が全く出ない",
      "comment1": "毎日サービス残業させられてる…",
      "comment2": "これ普通に違法やん！",
      "body": "10位は、残業代が全く出ない会社。...",
      "imageKeywords": ["残業", "オフィス"],
      "imageKeywordsEn": ["overtime work", "office night"]
    }
  ],
  "outro": "みんなの意見はコメント欄へ！"
}
```

| フィールド | 何が起きるか |
|-----------|-------------|
| `videoTitle` | イントロ画面に巨大テキストで表示（自動改行・自動色分け） |
| `intro` | ずんだもんがイントロで読み上げる |
| `items[].topic` | 赤い巨大文字で表示 + ずんだもんが読み上げ |
| `items[].comment1` | 青枠に表示 + 青山龍星が読み上げ |
| `items[].comment2` | 赤枠に表示 + 四国めたんが読み上げ |
| `items[].body` | 画面には出ない（VOICEVOX読み上げ専用） |
| `items[].imageKeywords` | いらすとや検索キーワード（日本語） |
| `items[].imageKeywordsEn` | Pexels検索キーワード（英語、fallback用） |

### Step 2: VOICEVOXを起動する

VOICEVOX アプリを起動するだけ。`localhost:50021` で自動的にAPIが立ち上がります。

### Step 3: 動画を生成する

```bash
pnpm render:v3
```

完了すると `generated/latest/output.mp4` に出力されます（BGM自動合成済み）。

### Step 4: 圧縮する（任意）

```bash
ffmpeg -i generated/latest/output.mp4 \
  -c:v libx264 -crf 28 -preset medium \
  -c:a aac -b:a 128k -movflags +faststart \
  generated/latest/output_compressed.mp4
```

---

## テンプレート一覧

`templates/scripts/` に保存済みの台本テンプレート:

| ファイル | テーマ |
|---------|--------|
| `ranking-black-company.json` | 入社して気づく会社のやばい特徴ランキング |

新しいテーマで作りたいときは、既存テンプレートをコピーして `topic` / `comment1` / `comment2` を書き換えるだけ。

---

## BGM

`assets/bgm/` にBGMファイル（mp3）を配置すると、レンダリング時にffmpegで自動合成されます。

- 現在のBGM: `ukiuki_lalala.mp3`（[甘茶の音楽工房](https://amachamusic.chagasi.com/) フリー素材）
- BGMファイルがなければスキップ
- 音量 `volume=0.12` + 冒頭フェードイン + 終了フェードアウト

BGMを変えたいときは `assets/bgm/ukiuki_lalala.mp3` を差し替えて、`src/render-v3.ts` のファイル名を更新。

---

## 動画の構成

```
イントロ (3.5秒) → [第10位〜第1位] × 各5.3秒 → CTA (2.5秒) ≈ 59秒
```

各順位シーンの内部:
```
順位ドーン (12%) → トピック赤文字 (28%) → 青枠コメント (25%) → 赤枠コメント (35%)
```

---

## コマンド一覧

```bash
pnpm render:v3     # 動画生成（メイン）
pnpm preview       # Remotion プレビュー（ブラウザ確認）
pnpm test          # テスト実行 (107テスト)
pnpm typecheck     # TypeScript 型チェック
```

## 出力先

| パス | 説明 |
|------|------|
| `generated/latest/output.mp4` | 最新の動画 |
| `generated/jobs/{timestamp}/` | ジョブ別アーカイブ |

---

## 技術スタック

TypeScript strict / Remotion / VOICEVOX / ffmpeg / pnpm / zod

## ライセンス

MIT License

- VOICEVOX: https://voicevox.hiroshiba.jp/
- いらすとや: https://www.irasutoya.com/
- 甘茶の音楽工房: https://amachamusic.chagasi.com/
