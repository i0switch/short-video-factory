# Short Video Factory — 開発ナレッジ

動画生成の改善で学んだ知見・ベストプラクティスをまとめたもの。

---

## 1. デザイン数値の勘所

### フォントサイズ（1080x1920キャンバス）
- **イントロタイトル**: 120px（≤7文字行）、130px（≤5文字行）。画面幅の80%を占めるイメージ
- **「第○位」大表示**: 160px。画面中央にドーンと出す
- **「第○位」小表示**: 116px。画面上端5%に常時表示
- **トピック赤文字**: 120px。太いstroke(10px白)+影で視認性確保
- **青枠・赤枠テキスト**: 72px。paddingV=44で枠に余裕を持たせる
- **CTA**: 132px。全行同サイズ、最終行のみ赤色

### 改行ロジック
- **タイトル分割**: バランス分割（`idealLen = ceil(文字数/行数)`）+ ±2文字の範囲でbreakChar探索
- **breakChar**: `、。！？にはがをもでのよりい` — 「て」は除外（短すぎる分割を防止）
- **コメント枠**: 10文字/行、最大2行
- **CTA**: ハードコード2行が最も安定（「みんなの意見は」「コメント欄へ！」）

### 色の塗り分け
- イントロ styles: `['introBlack', 'introRed', 'introRed', 'introBlack']`
- 中央の行を赤にすると参考動画の雰囲気に合う
- 行数が変わっても `i % styles.length` で自動循環

### 位置
- イントロテキスト: `top: 18%`（画像と被らず中央感あり）
- イントロ画像: `bottom: 12%`
- 順位大: `top: 28%`
- 順位小: `top: 5%`
- 青赤枠コンテナ: `top: 20%`、gap: 20px

---

## 2. 音声（VOICEVOX）

### 話者ID
| ID | キャラ | 用途 |
|----|--------|------|
| 1 | ずんだもん | イントロ・順位・トピック・CTA |
| 13 | 青山龍星 | 青枠コメント（男性・落ち着いた声） |
| 0 | 四国めたん | 赤枠コメント（女性） |

### 音声budgetの配分（1ランクあたり）
- 順位ドーン: 12%（「第10位」は短いので十分）
- トピック: 28%（長めのお題でも切れないように拡張）
- 青枠: 25%
- 赤枠: 35%

**重要**: RankingScene.tsx のフレーム境界と build-v3-plan.ts のaudio budgetは **必ず同じ比率** にすること。ズレると音声と表示がバラバラになる。

### 音声が切れる問題
- 原因: budget比率が小さすぎてVOICEVOXのspeedScaleを上げすぎ
- 対策: 該当ステップのbudget比率を増やす（例: topic 23%→28%）
- speedScaleの限界: 1.8倍速を超えると聞き取りづらくなる

---

## 3. BGM合成

### 方式
- **ffmpegポスト処理**（Remotionレンダリング後に合成）
- Remotion内で`<Audio>`タグを使わない理由: 音量調整・フェードイン/アウトの制御がffmpegの方が柔軟

### ffmpegコマンド構造
```
ffmpeg -i output.mp4 -i bgm.mp3 \
  -filter_complex "[1:a]volume=0.12,afade=in:0:1,afade=out:ST:2[bgm];[0:a][bgm]amix=inputs=2:duration=first[out]" \
  -map 0:v -map "[out]" -c:v copy -c:a aac output_bgm.mp4
```

### 音量バランス
- BGM volume=0.12 → ナレーションの邪魔にならないレベル
- 最終出力: mean -23dB / peak -8dB（SNS適正範囲内）

### BGM差し替え
- `assets/bgm/` のmp3を入れ替えるだけ
- render-v3.ts のファイル名を合わせる
- ファイルがなければ自動スキップ

---

## 4. レンダリング最適化

### CRF設定
- `crf: 23` を renderMedia に指定 → 77MB → 34MB（半分以下）
- CRF 23: SNS向け動画なら画質差がほぼ出ない
- CRF 28: さらに圧縮したい場合（ffmpegで後から追加圧縮）

### 追加圧縮コマンド
```bash
ffmpeg -i output.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -movflags +faststart output_compressed.mp4
```

---

## 5. テスト更新のルール

### コードのデザイン数値を変えたら
- `tests/services/renderer/buildV3Plan.test.ts` — budget比率・headlineLines分割
- `tests/integration/combo.test.ts` — E2Eの期待値
- `tests/remotion/animationPreset.test.ts` — アニメーション関数の戻り値

### テスト修正のコツ
- 現在のコードの挙動をトレースしてから期待値を書く
- 特にbudget-driven timing（`framesPerRank = AVAILABLE / itemCount`）は1アイテムテストだと大きな値になる

---

## 6. 台本JSON作成のコツ

### topicの文字数
- **9文字以内推奨**。10文字以上だと2行に分割されて赤文字が小さく見える
- 例: ○「残業代が全く出ない」(9文字) ×「サービス残業を毎日させられる」(14文字)

### comment1 / comment2のトーン
- comment1（青枠・青山龍星）: 共感・疑問系「〜だよね」「〜って思う」「〜じゃない？」
- comment2（赤枠・四国めたん）: ツッコミ・断定系「〜やろ」「〜に決まっとる」「〜やん！」

### imageKeywordsのコツ
- 日本語（いらすとや検索）: 1〜2語、一般的な名詞
- 英語（Pexels検索）: 2〜3語、具体的なシーン描写
- いらすとやにヒットしない場合はfallback画像が使われる

### videoTitleの改行
- 自動分割は7文字/行、最大4行
- 20文字前後がベスト（3行に収まる）
- 助詞（の・は・が・を）の位置で自然に区切られる
