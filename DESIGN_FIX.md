# デザイン修正指示

reference/ フォルダに理想の動画フレーム (ideal_*.jpg) と現在の出力 (current_*.jpg) を入れた。
これを見比べて以下の修正を行ってください。

## 前提確認

まず以下を確認してください:
1. `fc-list | grep -i "noto sans jp"` でNoto Sans JPがインストールされているか確認
2. インストールされていなければ `sudo apt install fonts-noto-cjk` (Linux) か、手動インストールを案内
3. **フォントが入っていない場合、レイアウトは確実に崩壊する。フォント確認を最優先で行うこと。**

## Bug 1 (Critical): ランキングシーンのレイアウト崩壊

### 現状
- 順位・見出し・画像が画面の下1/3に押し込まれて重なっている
- 上2/3はサンバーストだけで空白

### 原因の疑い
AbsoluteFill + display:flex + paddingTop の組み合わせがChrome Headless Shellで想定と異なる可能性。

### 修正方針
AbsoluteFill の paddingTop に依存するのをやめて、**明示的なtop/leftのpx指定**に変更する。

```tsx
// RankingScene.tsx の修正方針

// ❌ 現在のアプローチ（paddingTopに依存）
<AbsoluteFill style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 150 }}>

// ✅ 修正後（position: absolute + top/left で明示配置）
<div style={{ position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center' }}>
```

### 各要素の配置（1080×1920基準、全て中央揃え）

```
順位「第N位」:
  position: absolute
  top: 100px
  left: 0, right: 0
  textAlign: center

見出しボックス（青枠）:
  position: absolute
  top: 350px
  left: 50% → transform: translateX(-50%)
  width: 85% (≈920px)

画像:
  position: absolute
  top: 850px
  left: 50% → transform: translateX(-50%)
  maxWidth: 600px
  maxHeight: 600px
  objectFit: contain
```

## Bug 2 (Critical): テキストの改行が文字単位で壊れている

### 現状
- `word-break: break-all` で「NG行動」が「N\nG行動」に分割される
- 日本語として不自然

### 修正
```tsx
// OutlineText.tsx
// ❌
style={{ wordBreak: 'break-all' }}

// ✅
style={{ 
  wordBreak: 'keep-all',     // 日本語の単語を壊さない
  overflowWrap: 'break-word', // 長すぎる場合のみ折り返し
  whiteSpace: 'pre-wrap',     // \n での改行を尊重
}}
```

さらに、タイトルとエンディングのテキストは**LLMに改行位置を指定させる**のがベスト。
台本JSONの intro / outro に `\n` を含めて意味単位で改行する:
```
"intro": "転職失敗したくない\n人必見！\n5つのNG行動"
```

## Bug 3: テキスト縁取りが薄い

### 現状
WebkitTextStroke: 6px は Remotion の Chrome レンダリングでは細く見える。

### 修正
text-shadow の多重指定で太い縁取りを表現する:

```tsx
// design-tokens.ts の shadow を強化
shadow: [
  '-4px -4px 0 #000',
  '4px -4px 0 #000', 
  '-4px 4px 0 #000',
  '4px 4px 0 #000',
  '-2px 0 0 #000',
  '2px 0 0 #000',
  '0 -2px 0 #000',
  '0 2px 0 #000',
  '0 6px 10px rgba(0,0,0,0.5)',
].join(', '),
```

WebkitTextStroke と併用して、より太い縁取りにする。

## Bug 4: 画像の配置

### ランキングシーン
- 画像は画面の下半分に中央配置
- position: absolute で top: 850, left: 50%, transform: translateX(-50%)
- maxWidth: 600, maxHeight: 600

### タイトルシーン
- 画像は画面下部に小さく配置
- position: absolute で bottom: 150, left: 50%, transform: translateX(-50%)
- maxWidth: 500, maxHeight: 400

## 修正後の確認手順

1. `pnpm preview` でブラウザプレビューを開く
2. reference/ideal_ranking.jpg と見比べて以下を確認:
   - 順位が画面上部に表示されているか
   - 見出しボックスが中央に表示されているか
   - 画像が下半分に中央配置されているか
   - テキストの改行が自然か
   - 縁取りが太く見えるか
3. 問題なければ `pnpm render` で MP4 書き出し
4. **必ず pnpm preview で視覚確認してから render すること**
