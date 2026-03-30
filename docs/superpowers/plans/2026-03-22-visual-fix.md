# Visual Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `完成.mp4`（笑える迷言集 / 教師たちの反応w）を視覚的にリファレンス動画に一致させる

**Architecture:** `ReproComposition.tsx` を修正してキャラサイズ・背景暗度・テキスト配置を改善。`pnpm render:repro2 EzFYQHX5ICY` で再生成し、ffmpeg フレーム抽出で spec チェックリストを全項目クリアするまでループ。リファレンス動画のファイルはないので比較はチェックリスト目視で実施。

**Tech Stack:** TypeScript / Remotion / ffmpeg / React

**Timeline facts (EzFYQHX5ICY):**
- 28 shots、効果: none/impact_text/aa_display（sparkle 無し → P2-1 星模様は本タイムラインでは発生しない）
- positions 使用: back-center, center, center-bottom, front-row, left, left-bottom, right（全種使用）
- scales 使用: 0.45 〜 1.3（幅広い）

---

## 最重要ルール（必ず守ること）

1. **1回生成して終わらない** — 毎回フレーム抽出 → 確認 → 修正のループを実施
2. **全チェック項目OKになるまで提出しない**
3. 音声・テキスト内容・尺・解像度は変更禁止

---

## ファイル構成

| ファイル | 役割 | 変更 |
|---------|------|------|
| `src/remotion/compositions/ReproComposition.tsx` | 唯一の修正対象 | **Modify** |

---

## Task 1: P0-1 背景を純黒ベースに修正

**Files:**
- Modify: `src/remotion/compositions/ReproComposition.tsx` (line ~329)

### 問題
`classroom_bright` など明るい背景に darkOverlay = 0。画面が明るい。

- [ ] **Step 1: darkOverlay を全背景に適用**

`ReproBackground` の darkOverlay 計算（line ~329）を変更:

```tsx
// Before:
const darkOverlay = bg.includes('dark') ? 0.5 : 0

// After:
const darkOverlay = bg === 'white_black' ? 0
  : bg.includes('dark') ? 0.6
  : 0.45
```

- [ ] **Step 2: classroom_window_sketch マッピング修正**

`bgImageMap` の `classroom_window_sketch` エントリを変更（line ~246）:

```tsx
// Before:
classroom_window_sketch: 'bg_hallway.jpg',

// After:
classroom_window_sketch: 'bg_classroom_window.jpg',
```

- [ ] **Step 3: 型チェック**

```bash
cd "C:\Users\i0swi\OneDrive\デスクトップ\short-video-factory" && pnpm typecheck
```
Expected: エラーなし

---

## Task 2: P0-2 キャラ画像を画面70-90%に拡大

**Files:**
- Modify: `src/remotion/compositions/ReproComposition.tsx` (line ~173-221 と line ~663-667)

### 問題
現状 `size = 1500 * char.scale * crowdFactor`。scale=0.7, 4キャラ(crowdFactor=0.7) → `1500 * 0.7 * 0.7 = 735px` = 38%。

実際の scale 範囲: 0.45〜1.3。base 1500 → 1900 でも単体 scale=0.7 なら `1330px = 69%`（目標70%以上）。

- [ ] **Step 1: キャラサイズのベースを 1500 → 1900 に拡大**

`ReproCharacterLayer` の size 計算（line ~663-665）:

```tsx
// Before:
const crowdFactor = allChars.length > 3 ? 0.7 : allChars.length > 1 ? 0.85 : 1.0
const size = 1500 * char.scale * crowdFactor

// After:
const crowdFactor = allChars.length > 3 ? 0.80 : allChars.length > 1 ? 0.90 : 1.0
const size = 1900 * char.scale * crowdFactor
```

- [ ] **Step 2: 全 position の Y 座標を上方向にシフト**

`resolvePosition` 関数（line ~173-222）を全 case 調整:

```tsx
function resolvePosition(position: string, index: number, total: number): { x: number; y: number } {
  switch (position) {
    case 'center':
      return { x: 540, y: 1200 }           // 1250→1200
    case 'center-bottom': {
      if (total <= 1) return { x: 540, y: 1180 }   // 1350→1180
      if (total === 2) return { x: index === 0 ? 300 : 780, y: 1220 }  // 1350→1220
      if (total === 3) {
        const positions = [{ x: 540, y: 1400 }, { x: 250, y: 1100 }, { x: 830, y: 1100 }]
        return positions[index]
      }
      if (total === 4) {
        const positions = [
          { x: 300, y: 1380 }, { x: 780, y: 1380 },
          { x: 350, y: 1080 }, { x: 730, y: 1080 },
        ]
        return positions[index]
      }
      if (total <= 6) {
        const frontCount = Math.min(3, Math.ceil(total / 2))
        if (index < frontCount) {
          const sp = 900 / (frontCount + 1)
          return { x: 90 + sp * (index + 1), y: 1350 }   // 1450→1350
        }
        const backCount = total - frontCount
        const bi = index - frontCount
        const sp2 = 900 / (backCount + 1)
        return { x: 90 + sp2 * (bi + 1), y: 1080 }       // 1200→1080
      }
      const col = index % 3
      const row = Math.floor(index / 3)
      return { x: 180 + col * 260, y: 1050 + row * 200 }  // 1150→1050
    }
    case 'left':
      return { x: 280, y: 1180 }           // 1250→1180
    case 'right':
      return { x: 800, y: 1180 }           // 1250→1180
    case 'left-bottom':
      return { x: 200 + index * 250, y: 1320 }  // 1400→1320
    case 'front-row': {
      const sp = 800 / (total + 1)
      return { x: 140 + sp * (index + 1), y: 1320 + (index % 2) * 40 }  // 1400→1320
    }
    case 'back-center':
      return { x: 540, y: 1000 }           // 1100→1000
    default:
      return { x: 540, y: 1180 }           // 1300→1180
  }
}
```

- [ ] **Step 3: 型チェック**

```bash
pnpm typecheck
```
Expected: エラーなし

---

## Task 3: P0-3 テキストオーバーレイ確認

**Files:**
- Read: `src/remotion/compositions/ReproComposition.tsx` (line ~467-487)

### 確認事項
`ReproCaption` は `top: 300` に配置。背景画像は全画面表示。理論上はすでにオーバーレイ方式。
Task 1-2 の修正でキャラが上方に移動するため、ギャップが縮まることを確認する。

- [ ] **Step 1: ReproCaption の位置が適切か確認**

`ReproCaption` 関数（line ~396-487）を読んで:
- Normal caption の `top: 300` を確認
- `ReproTopOverlay` の勾配が `rgba(0,0,0,0.88)` から始まることを確認（テキスト読みやすさを担保）

現状が問題ない場合は Task 3 はスキップ。問題ある場合は以下を適用:

```tsx
// もし top: 300 が title と重なる場合のみ変更
// top: 300 → top: 260 (タイトル下端の直後)
position: 'absolute', top: 260, left: 20, width: 1040,
```

- [ ] **Step 2: 変更した場合のみ型チェック**

```bash
pnpm typecheck
```

---

## Task 4: P1-1 タイトルサブタイトルのスタイル強化

**Files:**
- Modify: `src/remotion/compositions/ReproComposition.tsx` (line ~380-393)

### 問題
Line 2（教師たちの反応w）のストローク幅が `Math.max(1, strokeWidth)=4px` で細め。色も黒のみ。spec P1-1 は「白 + 青系の太い縁取り」。

- [ ] **Step 1: サブタイトル（line 2）のスタイル変更**

`ReproTitleText` の line 2 div（line ~381-393）:

```tsx
// Before:
<div style={{
  fontFamily: '"Noto Sans JP", sans-serif',
  fontWeight: 900, fontSize: 56,
  color: band.textColor,
  WebkitTextStroke: `${Math.max(1, band.strokeWidth)}px ${band.strokeColor}`,
  paintOrder: 'stroke fill',
  textShadow: '0 0 8px #FFE000, 0 0 16px rgba(255,224,0,0.5), -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000',
  lineHeight: 1.15, marginTop: 6,
}}>

// After:
<div style={{
  fontFamily: '"Noto Sans JP", sans-serif',
  fontWeight: 900, fontSize: 68,
  color: '#FFFFFF',
  WebkitTextStroke: `4px #3366FF`,
  paintOrder: 'stroke fill',
  textShadow: '0 0 10px #3399FF, 0 0 20px rgba(51,153,255,0.4), -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000',
  lineHeight: 1.15, marginTop: 6,
}}>
```

- [ ] **Step 2: 型チェック**

```bash
pnpm typecheck
```
Expected: エラーなし

---

## Task 5: 初回レンダリングとフレーム抽出

- [ ] **Step 1: VOICEVOX 確認**

```bash
curl -s http://localhost:50021/version
```
Expected: バージョン文字列が返る

- [ ] **Step 2: レンダリング実行**

```bash
cd "C:\Users\i0swi\OneDrive\デスクトップ\short-video-factory" && pnpm render:repro2 EzFYQHX5ICY
```
Expected: `[repro-v2] Done!` で終了

- [ ] **Step 3: フレーム抽出**

```bash
mkdir -p generated/frames
for t in 0 1 5 10 15 25 30 38 40; do
  ffmpeg -y -ss $t -i generated/latest/完成.mp4 -vframes 1 generated/frames/frame_${t}s.jpg 2>/dev/null
done
```
Expected: `generated/frames/` に9枚の静止画

- [ ] **Step 4: フレームを Read ツールで確認しチェックリスト評価**

各フレームを読み込んで spec チェックリストを評価:

| 秒数 | チェック項目 | 結果 |
|------|------------|------|
| 0秒 | 黒帯タイトル・教室画像が画面覆う・星模様なし | |
| 1秒 | テキストが画像の上にオーバーレイ | |
| 5秒 | キャラ70%以上・背景暗め・余白少ない | |
| 10秒 | 背景写真全体・テキスト重なり | |
| 15秒 | 背景バリエーション | |
| 25秒 | 教壇+黒板+先生・高い画面密度 | |
| 30秒 | AA場面の処理適切 | |
| 38秒 | テキスト・スタイル | |
| 40秒 | 最終フレームまで黒背景+全画面画像 | |

- [ ] **Step 5: NG ログ記録**

```text
[Iteration 1]
- NGフレーム:
- NG理由:
- 変更する実装:
- 期待する改善:
- 再レンダリング実行: yes
```

---

## Task 6: イテレーションループ（合格まで繰り返す）

- [ ] **Step 1: NG 修正 → 型チェック → 再レンダリング → 再抽出 → 再評価**

前ループの NG を修正。1問題 = 1変更の原則で進める。

- [ ] **Step 2: 合格条件確認**

以下を全て満たしたら完了:
1. spec P0 全項目 OK
2. チェックリスト全項目 OK
3. 代表フレームで大きな差分なし

- [ ] **Step 3: コミット**

```bash
git add src/remotion/compositions/ReproComposition.tsx
git commit -m "fix: improve visual quality of ReproComposition for reference matching

- Darken all background images with 45% overlay (was 0% for non-dark)
- Fix classroom_window_sketch → bg_classroom_window.jpg
- Increase character base size 1500→1900 for 70%+ screen coverage
- Adjust all position Y values for better frame density
- Strengthen subtitle: white + blue stroke + blue glow

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 禁止事項

- フレーム解析省略
- NGが残っているのにユーザーへ提出
- テキスト内容・音声・BGM・尺・解像度の変更
- 「だいぶ良くなった」で完了扱い
