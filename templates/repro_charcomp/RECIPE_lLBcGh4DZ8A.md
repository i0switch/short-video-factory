# RECIPE: lLBcGh4DZ8A（競技化彼氏 朝の支度グランプリ）

## 概要
実況風バラエティ動画。彼氏の朝の支度を実況者がスポーツ中継風に解説し、彼女がツッコむ構成。

## スペック
- 尺: 42秒 / 1260フレーム / 30fps
- ショット数: 31
- 話者: character1(実況者/男声), character2(彼女/女声), narrator(ずんだもん)
- BGM: bgm_comedy.mp3

## レイアウト定数
```
TITLE_BAR_HEIGHT = 350px
captionTop = 520px
characterSizeMultiplier = 1300
characterBottom = 55px
transformOrigin = 'center 35%'
overflow = 'visible'
```

## ショット構成パターン

### オープニング（0-4.5s / 3ショット）
1. 実況開始「さあ始まりました！」— concentration_white + characterZoom
2. 回数表示「第412回」— concentration_white + captionFontScale 1.3
3. タイトルコール「朝の支度グランプリ！」— concentration_white + characterZoom + captionFontScale 1.2

### アクションシーケンス（4.5-14s / 7ショット）
- 移動→speed_lines + characterSlide
- 物を取る→none（静的）
- 取った！→sparkle（成功演出）
- フォーム評価→sparkle
- 彼女の一言「ねえ」→none（25f超短ショット）
- 彼女のツッコミ「朝からうるさい」→none（50f中ショット）
- 完食実況→concentration_white

### 中盤（歯磨きシーン 14-22s / 6ショット）
- 実況アナウンス→none
- アイテム登場→concentration_white + characterZoom
- 評価（出しすぎ）→rain + dark_rain
- 減点→rain + captionFontScale 1.15
- 彼女ツッコミ→none
- 再評価（水道）→concentration_white

### エコ→着替えセクション（22-30.7s / 6ショット）
- 成功演出→sparkle（2キャラ配置: left + right）
- ツッコミ→none
- フェーズ切替→none
- 着替えアクション→sparkle + characterZoom
- 評価→sparkle + characterZoom
- クライマックス「ワールドクラス」→concentration_white + characterZoom + captionFontScale 1.3

### クライマックス→エンディング（30.7-42s / 9ショット）
- ラストスパート→concentration_white
- 家を出る→speed_lines + characterSlide
- 持ち物確認→sparkle
- よし！→sparkle + characterZoom
- 愛の一言→sparkle（黄金背景）
- 彼女の照れ→sparkle
- 高得点→concentration_white（2キャラ）
- 締め→sparkle（エンディング、余剰フレーム吸収 122f）

## 再利用のポイント

### この構成を別テーマに転用するには
1. **タイトルを変える**: titleBand の line1/line2
2. **アクションを差し替える**: 歯磨き→料理、着替え→メイク等
3. **キャラ画像を変える**: characters の type フィールド
4. **背景を変える**: background フィールド（minchari_kitchen → minchari_bathroom等）
5. **テキストを変える**: text/narration フィールド

### 変えてはいけないもの
- レイアウト定数（字幕位置・キャラサイズ等）
- エフェクトのパターン（sparkle=成功、rain=失敗、concentration=気合）
- ショット構成のリズム（アクション→評価→ツッコミの繰り返し）
- 合計フレーム数（1260f固定）

## コマンド
```bash
# レンダリング
pnpm render:repro2 lLBcGh4DZ8A

# フレーム比較（PDCA用）
ffmpeg -y -i generated/repro/lLBcGh4DZ8A/iter_XX/output.mp4 \
  -vf fps=30 docs/repro-lLBcGh4DZ8A/iterXX_30fps/f%04d.jpg

# グリッド画像生成
ffmpeg -y -i generated/repro/lLBcGh4DZ8A/iter_XX/output.mp4 \
  -vf "fps=1,scale=270:480" -frames:v 42 grid_frames/f%02d.jpg
ffmpeg -y -start_number 1 -i grid_frames/f%02d.jpg \
  -filter_complex "tile=7x6:margin=4:padding=4" grid.jpg
```

## ソースファイル
- timeline: `assets/repro/lLBcGh4DZ8A/timeline.json`
- レンダラー: `src/render-repro-v2.ts`
- コンポーネント: `src/remotion/compositions/ReproComposition.tsx`
- 完成動画: `generated/repro/lLBcGh4DZ8A/iter_65/output.mp4`
