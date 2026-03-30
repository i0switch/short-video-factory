# repro_charcomp — キャラ合成型2ch動画再現テンプレ

## 何これ？

EzFYQHX5ICY「笑える迷言集〜教師たちの反応w」の再現作業で確立した手法。
いらすとや素材を「背景画像 + キャラクター複数合成」でワンシーンを構成する。

台本が変わっても同じパイプラインで新しい2ch風ショート動画を作れる。

---

## パイプライン全体像

```
台本分析
  ↓
timeline.json 作成（shots 配列）
  ↓
irasutoya で不足素材を取得
  ↓
ReproComposition.tsx の charImageMap に追加
  ↓
pnpm render:repro2 {VIDEO_ID}
  ↓
フレーム抽出 → PDCA → 完成
```

---

## Step 1: timeline.json を作る

### ファイルパス
```
assets/repro/{VIDEO_ID}/timeline.json
```

### 必須フィールド

```json
{
  "videoId": "動画ID",
  "title": "タイトル",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationSec": 41.38,
  "totalFrames": 1241,
  "seriesTitle": "シリーズタイトル",
  "episodeTitle": "エピソードタイトル",
  "titleBand": {
    "line1": "1行目（大きい、黄色）",
    "line2": "2行目（小さい、白）",
    "backgroundColor": "#000000",
    "textColor": "#FFE000",
    "strokeColor": "#000000",
    "strokeWidth": 4,
    "height": 320
  },
  "shots": [ ... ]
}
```

### shotsの1エントリ

```json
{
  "id": "sh01",
  "startFrame": 0,
  "endFrame": 44,
  "text": "画面に出るテロップ",
  "narration": "VOICEVOXが読む文字列",
  "speaker": "narrator",
  "characters": [
    {
      "type": "student_frozen",
      "count": 1,
      "position": "center",
      "scale": 0.85
    }
  ],
  "background": "classroom_blackboard",
  "effect": "none",
  "mangaSymbol": "sweat",
  "camera": {
    "zoomFrom": 1,
    "zoomTo": 1.03
  }
}
```

---

## Step 2: キャラクタータイプ一覧

### 使えるキャラ（charImageMap で定義済み）

| type | 画像ファイル | 説明 |
|------|------------|------|
| `student_frozen` | student_frozen.png | 学ラン男子・無表情（汎用） |
| `student_sitting_frozen` | student_sitting_frozen.png | 机に着席・無表情 |
| `student_raising_hand` | student_raising_hand.png | 手を挙げる学ラン男子 |
| `student_laughing` | student_laughing.png | 笑う学ラン男子 |
| `student_bending` | student_bending.png | お辞儀・会釈 |
| `student_cool` | student_cool.png | 得意げな男子（注意：教室の斜め俯瞰ショット） |
| `student_confused_male` | student_confused_male.png | 困惑・悩む男子 |
| `student_shocked_male` | student_shocked_male.png | 驚く男子 |
| `student_girl_smiling` | student_girl_smiling.png | 笑顔の女子（書類持ち） |
| `teacher_lecturing` | teacher_lecturing.png | 教壇でポインター持つ男性教師 |
| `teacher_confused` | teacher_confused.png | 困惑した男性教師 |
| `teacher_confused_female` | teacher_confused_female.png | 呆れ顔・腕組みの女性教師 |
| `teacher_shocked` | teacher_shocked.png | 驚く教師 |
| `teacher_female_confused` | teacher_female_confused.png | 女性教師（表情付き） |
| `man_shocked` | man_shocked.png | 驚く成人男性（一般人） |
| `woman_shocked` | woman_shocked.png | 驚く成人女性（一般人） |
| `man_confused` | man_confused.png | 困惑した成人男性 |
| `man_angry` | man_angry.png | 怒る成人男性 |
| `woman_sad` | woman_sad.png | 悲しむ成人女性 |

### position の選択肢

| position | 意味 | 推奨用途 |
|---------|------|---------|
| `center` | 画面中央 | 1人単独シーン |
| `center-bottom` | 中央下寄り | 1〜2人 |
| `left` | 左側 | 2人対話シーン（左） |
| `right` | 右側 | 2人対話シーン（右） |
| `left-bottom` | 左下（小さめ） | 背景的な生徒配置 |
| `front-row` | 横一列均等配置 | グループシーン（3〜4人） |
| `back-center` | 中央やや上 | 背景教師など |

### count と scale の目安

| 用途 | count | scale |
|------|-------|-------|
| 単独主役 | 1 | 0.85〜1.0 |
| 2人対話 | 1 (left/right) | 0.75〜0.9 |
| 席着席 | 2〜3 | 0.5〜0.6 |
| グループ前列 | 3〜4 | 0.5〜0.55 |

---

## Step 3: 背景画像の選択肢

| background キー | ファイル名 | 雰囲気 |
|----------------|----------|--------|
| `classroom_blackboard` | bg_classroom_blackboard.jpg | 黒板前・標準教室 |
| `classroom_dark` | bg_classroom_dark_freeze.jpg | 暗い・凍りついた教室 |
| `classroom_wide` | bg_classroom_wide.jpg | 広角・生徒全体見える |
| `classroom_front` | bg_classroom_front.jpg | 前方視点 |
| `classroom_window` | bg_classroom_window.jpg | 窓側 |

---

## Step 4: mangaSymbol と effect

### mangaSymbol（キャラクター右上に出る）
- `sweat` — 汗マーク（緊張・困惑）
- `exclaim` — ！（驚き）
- `question` — ？（疑問）
- `none` / 省略 — なし

### effect（背景エフェクト）
- `none` — なし
- `concentration_lines` — 集中線
- `vortex` — 渦巻き
- `lightning` — 稲妻

---

## Step 5: 不足素材をいらすとやで取得する

### fetch-repro-assets.ts を更新してキーワード検索

```typescript
const targets = [
  {
    filename: '欲しい.png',
    keywords: ['日本語キーワード1', 'キーワード2'],
    description: '説明',
  },
]
```

```bash
npx ts-node src/fetch-repro-assets.ts
```

### キーワード設計のコツ

- ひらがな・カタカナ・漢字のみ（アルファベット不可）
- 1〜2語で具体的に（「驚く 学生」「緊張 高校生」）
- 絵の雰囲気ではなくいらすとや検索タームで考える
- BLOCKED_CANDIDATE_TERMS でフィルターされる語句に注意

### irasutoya でよく失敗するパターン

| 探したいもの | 注意点 |
|------------|--------|
| 制服で驚く学生 | びっくり箱（aprilfool）が引っかかりやすい |
| 恋愛系の生徒 | 恋愛/愛/ハート が BLOCKED に入っている |
| AI系キャラ | 2024/05/ai_ のAIキャラが混入しやすい → BLOCKED済み |

### 取得失敗したら手動でいらすとやを検索してPNGを保存

```
assets/repro/{VIDEO_ID}/{filename}.png
```

---

## Step 6: charImageMap に追加する

`src/remotion/compositions/ReproComposition.tsx` の `charImageMap` に追記：

```typescript
const charImageMap: Record<string, string> = {
  // 既存エントリ...
  my_new_char: 'my_new_image.png',
}
```

---

## Step 7: レンダリング

```bash
pnpm render:repro2 {VIDEO_ID}
```

出力: `generated/repro/{VIDEO_ID}/iter_{N}/output.mp4`

---

## PDCA チェックリスト

フレームを抽出して確認する：

```bash
ffmpeg -i output.mp4 -vf "select=eq(n\,FRAME)" -vsync 0 -q:v 2 tmp_check.png
```

| チェック項目 | 合格条件 |
|-----------|---------|
| タイトル帯 | 純黒 #000 ・黄文字・白サブタイトル |
| グラデーション | 画面全体には黒グラデをかけない。タイトル帯 240px のみ |
| キャラ枠線 | border/shadow なし |
| テキストオーバーレイ | テキストが画像の上に重なっている |
| 表情一致 | テキストの感情と画像の表情が合っている |
| グループシーン | 3人以上の場面は front-row で横並び |
| 教師シーン | 黒板前 + スーツ/白衣 |

---

## 参考: EzFYQHX5ICY での解決事例

### 問題 → 解決策

| 問題 | 解決 |
|------|------|
| 全体に黒グラデがかかる | ReproTopOverlay を 240px 固定帯に変更 |
| 17s 生徒が笑顔+手挙げ | student_frozen×4 の front-row に変更 |
| 24s 大人がいて制服感なし | student_frozen×3 の front-row に変更 |
| 36s 教師が笑顔（テキストは「呆れ」） | teacher_confused_female（腕組み呆れ顔）に変更 |
| student_shocked_female が恋愛系画像 | student_girl_smiling に差し替え |
| グループシーン後列が隠れる | center-bottom複数→ front-row に変更 |
