# 動画品質リファクタ指示書

SPEC.md と video_analysis_prompt.md を読んだ上で、以下の全修正を実装してください。
**「動く」だけでなく「理想動画と見た目が一致する」ことがゴール。**

修正は以下の順番で進め、各ステップ完了後に `pnpm render` で MP4 出力して目視確認すること。

---

## Step 0: テンプレートJSON化（最初にやる）

現在 design-tokens.ts にハードコードされているデザイン値を、**外部JSONテンプレート**から読み込む構成にリファクタする。
これにより色・フォント・アニメーション・レイアウトを自由に差し替え可能になる。

### templates/ranking-default.json を新規作成:

```json
{
  "id": "ranking-default",
  "canvas": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },
  "sunburst": {
    "colorLight": "#F5B731",
    "colorDark": "#D4871A",
    "rayCount": 36,
    "rotationSpeedDegPerSec": 15
  },
  "fonts": {
    "primary": "Noto Sans JP",
    "weight": 900
  },
  "titleScene": {
    "lines": [
      { "text": "{line1}", "color": "#FFFFFF" },
      { "text": "{line2}", "color": "#CC0000" },
      { "text": "{line3}", "color": "#CC0000" },
      { "text": "{line4}", "color": "#FFFFFF" }
    ],
    "fontSize": 80,
    "strokeWidth": 4,
    "strokeColor": "#000000",
    "lineSpacing": 10,
    "textStartY": "8%",
    "image": {
      "widthPercent": 55,
      "borderWidth": 8,
      "borderColor": "#FFFFFF",
      "rotationDeg": 5,
      "marginTop": 30
    },
    "animation": {
      "type": "popIn",
      "staggerDelaySec": 0.15,
      "durationSec": 0.25
    }
  },
  "rankingScene": {
    "subSceneA": {
      "rankText": {
        "fontSize": 120,
        "color": "#FFFFFF",
        "strokeWidth": 5,
        "strokeColor": "#000000",
        "shadowOffset": 3
      },
      "topicText": {
        "fontSize": 70,
        "color": "#CC0000",
        "strokeWidth": 4,
        "strokeColor": "#000000"
      },
      "characterImage": {
        "widthPercent": 50,
        "positionFromBottom": "15%"
      },
      "animation": {
        "rankPopIn": { "durationSec": 0.3, "overshoot": 1.15 },
        "topicFadeSlide": { "delaySec": 0.3, "durationSec": 0.4, "slideY": 30 },
        "characterSlideUp": { "delaySec": 0.4, "durationSec": 0.3, "slideY": 50 }
      }
    },
    "subSceneB": {
      "commentBox": {
        "background": "#FFFFFF",
        "borderColor": "#1A3FAA",
        "borderWidth": 3,
        "textColor": "#000000",
        "fontSize": 48,
        "paddingVertical": 16,
        "paddingHorizontal": 24,
        "widthPercent": 85,
        "borderRadius": 0,
        "positionY": "25%"
      },
      "animation": {
        "type": "slideFromLeft",
        "durationSec": 0.3
      }
    },
    "subSceneC": {
      "commentBox": {
        "background": "#CC0000",
        "borderColor": "#CC0000",
        "borderWidth": 0,
        "textColor": "#FFFFFF",
        "fontSize": 44,
        "paddingVertical": 16,
        "paddingHorizontal": 24,
        "widthPercent": 85,
        "borderRadius": 0,
        "marginTop": 20
      },
      "animation": {
        "type": "slideFromLeft",
        "durationSec": 0.3
      }
    }
  },
  "endingScene": {
    "fontSize": 120,
    "color": "#CC0000",
    "strokeWidth": 5,
    "strokeColor": "#000000",
    "animation": {
      "type": "popIn"
    }
  }
}
```

### src/remotion/design-tokens.ts を修正:

```typescript
import templateData from '../../templates/ranking-default.json'

// テンプレートから読み込み。将来は CLI引数で別テンプレートを指定可能にする
export const TEMPLATE = templateData
```

全コンポーネントで `DESIGN.xxx` → `TEMPLATE.xxx` に参照を切り替える。

---

## Step 1: サンバースト回転アニメーション

**現状**: 静止している
**理想**: 常時15°/秒で時計回りに回転し続ける。シーン遷移でリセットしない。

### Sunburst.tsx を全面書き直し:

repeating-conic-gradient は回転アニメーションに対応しにくいので、
**Canvas描画 or SVG回転 or AbsoluteFill の transform: rotate()** で実装する。

Remotion では `useCurrentFrame()` でフレーム番号を取得できるので:

```tsx
const Sunburst: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rotationDeg = (frame / fps) * TEMPLATE.sunburst.rotationSpeedDegPerSec

  return (
    <AbsoluteFill style={{
      transform: `rotate(${rotationDeg}deg)`,
      // 回転時に角が見えないよう、サンバーストを画面より大きく描画
      width: '150%',
      height: '150%',
      left: '-25%',
      top: '-25%',
      background: generateSunburstGradient(
        TEMPLATE.sunburst.colorLight,
        TEMPLATE.sunburst.colorDark,
        TEMPLATE.sunburst.rayCount
      ),
    }} />
  )
}

function generateSunburstGradient(light: string, dark: string, rays: number): string {
  const angle = 360 / rays
  const half = angle / 2
  const stops: string[] = []
  for (let i = 0; i < rays; i++) {
    const start = i * angle
    stops.push(`${light} ${start}deg ${start + half}deg`)
    stops.push(`${dark} ${start + half}deg ${start + angle}deg`)
  }
  return `conic-gradient(${stops.join(', ')})`
}
```

**ポイント**:
- 150%サイズで描画し、-25% offset で中央配置。回転時に角が露出しない
- `repeating-conic-gradient` → `conic-gradient` に変更し、全stopを明示的に生成
- 回転速度は TEMPLATE.sunburst.rotationSpeedDegPerSec から取得

---

## Step 2: 台本スキーマの拡張（サブシーン対応）

### src/schema/script.ts を修正:

```typescript
const RankingItemSchema = z.object({
  rank: z.number().int().positive(),
  topic: z.string().min(1).max(24),          // サブシーンAのトピックテキスト
  comment1: z.string().min(1).max(50),       // サブシーンBの青枠コメント
  comment2: z.string().min(1).max(50),       // サブシーンCの赤背景コメント
  body: z.string().min(1).max(100),          // VOICEVOX読み上げ用（全サブシーン通しのナレーション）
  imageKeywords: z.array(z.string()).min(1).max(5),
  imageKeywordsEn: z.array(z.string()).min(1).max(5),
  characterImage: z.string().optional(),     // キャラ画像パス（将来用）
})
```

### LLMプロンプトも更新:

LLM に topic / comment1 / comment2 / body の4つを生成させる。
- topic: ランクのお題（短い。例: 「朝礼がやたら長い」）
- comment1: 1つ目のコメント（例: 「家族だから残業代なしって意味？！」）
- comment2: 2つ目のコメント/ツッコミ（例: 「絆で飯は食えんからな」）
- body: ナレーション全文（VOICEVOX読み上げ用）

---

## Step 3: RenderPlan のサブシーン対応

### src/schema/render-plan.ts を修正:

```typescript
const RenderSceneSchema = z.object({
  type: z.enum(['title', 'ranking', 'ending']),
  rank: z.number().optional(),
  // タイトルシーン用
  titleLines: z.array(z.object({
    text: z.string(),
    color: z.string(),
  })).optional(),
  // ランキングシーン用
  topic: z.string().optional(),
  comment1: z.string().optional(),
  comment2: z.string().optional(),
  // 共通
  imagePath: z.string(),
  characterImagePath: z.string().optional(),
  audioPath: z.string().nullable(),
  audioDurationSec: z.number().nullable(),
  durationInFrames: z.number().int().positive(),
  // サブシーンのタイミング（ランキングのみ）
  subSceneTiming: z.object({
    aEndFrame: z.number(),    // サブシーンA終了フレーム
    bEndFrame: z.number(),    // サブシーンB終了フレーム
  }).optional(),
  fallbackUsed: z.boolean(),
})
```

### build-plan.ts でサブシーンのタイミングを計算:

各ランキングシーンの総尺（音声尺ベース）を3分割:
- サブシーンA: 全体の約30%
- サブシーンB: 全体の約35%
- サブシーンC: 全体の約35%

---

## Step 4: ランキングシーンの3サブシーン実装

### src/remotion/RankingScene.tsx を全面書き直し:

1シーン内で frame 位置に応じて表示要素を切り替える:

```tsx
export const RankingScene: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame()
  const timing = scene.subSceneTiming!

  const isSubA = frame < timing.aEndFrame
  const isSubB = frame >= timing.aEndFrame && frame < timing.bEndFrame
  const isSubC = frame >= timing.bEndFrame

  return (
    <AbsoluteFill>
      <Sunburst />

      {/* ランク番号 - 全サブシーンで常時表示 */}
      <RankBadge rank={scene.rank!} frame={frame} />

      {/* サブシーンA: トピックテキスト + キャラ画像 */}
      {isSubA && (
        <>
          <TopicText text={scene.topic!} frame={frame} />
          <CharacterImage src={scene.characterImagePath} frame={frame} />
        </>
      )}

      {/* サブシーンB: コメント1（青枠）+ キャラ画像 */}
      {(isSubB || isSubC) && (
        <CommentBox1
          text={scene.comment1!}
          frame={frame - timing.aEndFrame}
        />
      )}

      {/* サブシーンC: コメント2（赤背景）追加 */}
      {isSubC && (
        <CommentBox2
          text={scene.comment2!}
          frame={frame - timing.bEndFrame}
        />
      )}

      {/* キャラ画像はB/Cでも表示 */}
      {(isSubB || isSubC) && (
        <CharacterImage src={scene.characterImagePath} frame={0} />
      )}

      {scene.audioPath && <Audio src={staticFile(scene.audioPath)} />}
    </AbsoluteFill>
  )
}
```

### 新規コンポーネント:
- `TopicText.tsx` — 赤文字 70px、黒縁取り、フェードスライドインアニメーション
- `CommentBox1.tsx` — 青枠白背景、左からスライドイン
- `CommentBox2.tsx` — 赤背景白文字、左からスライドイン
- `CharacterImage.tsx` — 下からスライドイン
- `RankBadge.tsx` — scale bounce pop-in

---

## Step 5: テキストアニメーション（pop-in bounce）

### 現状: opacity フェードのみ
### 理想: scale(0) → scale(1.15) → scale(1.0) の bounce

Remotion の `spring()` を使う:

```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'

const PopIn: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = spring({
    frame: frame - delay,
    fps,
    config: {
      mass: 0.5,
      damping: 12,
      stiffness: 200,
    },
  })

  return (
    <div style={{
      transform: `scale(${scale})`,
      opacity: scale > 0 ? 1 : 0,
    }}>
      {children}
    </div>
  )
}
```

### SlideFromLeft:

```tsx
const SlideFromLeft: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 150 },
  })

  return (
    <div style={{
      transform: `translateX(${(1 - progress) * -100}%)`,
      opacity: progress,
    }}>
      {children}
    </div>
  )
}
```

タイトルシーンの各行は PopIn + stagger delay 0.15秒間隔。

---

## Step 6: タイトルシーンの色分け + 画像白枠

### TitleScene.tsx:

- テキスト行ごとに色を変える（RenderPlan の titleLines から取得）
- 画像に白ボーダー8px + transform: rotate(5deg)

```tsx
{scene.titleLines?.map((line, i) => (
  <PopIn key={i} delay={Math.round(i * 0.15 * fps)}>
    <OutlineText
      fontSize={TEMPLATE.titleScene.fontSize}
      color={line.color}
    >
      {line.text}
    </OutlineText>
  </PopIn>
))}

{/* 画像（白枠 + 傾き） */}
<PopIn delay={Math.round(0.8 * fps)}>
  <div style={{
    border: '8px solid white',
    boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
    transform: `rotate(${TEMPLATE.titleScene.image.rotationDeg}deg)`,
    overflow: 'hidden',
  }}>
    <Img src={staticFile(scene.imagePath)} style={{ maxWidth: '55%' }} />
  </div>
</PopIn>
```

---

## Step 7: OutlineText の色対応

現在の OutlineText は白固定。color prop を受け取って可変にする（既に対応済みなら確認のみ）。

---

## Step 8: エンディングの色修正

理想では赤 `#CC0000` + 黒縁取り。現在は白。TEMPLATE.endingScene.color から取得。

---

## Step 9: LLMプロンプト更新

LLM に返させる JSON を拡張:
- items 10個（--items 10 をデフォルトに変更）
- 各 item に topic / comment1 / comment2 / body を含める
- title を4行に分割して返させる（titleLines として色指定付き）

---

## Step 10: BGM対応

- `assets/bgm/` にフリーBGMファイルを配置
- RankingVideo.tsx で動画全体に `<Audio src={staticFile('assets/bgm/default.mp3')} volume={0.15} />` を追加
- BGMの音量は VOICEVOX より小さく（0.1〜0.2程度）
- .env に `BGM_PATH` と `BGM_VOLUME` を追加

---

## 確認手順（各Step完了時）

```bash
pnpm render    # fixtures データで確認
```

全Step完了後:
```bash
pnpm generate --topic "入社して気づく会社のやばい特徴ランキング" --items 10
```

### 目視チェックリスト:
- [ ] サンバーストが回転している
- [ ] タイトルテキストが白/赤で色分けされている
- [ ] タイトルが1行ずつ pop-in bounce で出現する
- [ ] タイトル画像に白枠 + 傾きがある
- [ ] ランキングシーンでサブシーンA→B→C の切り替えがある
- [ ] サブシーンA: ランク番号(pop-in) + トピック赤テキスト
- [ ] サブシーンB: 青枠コメントが左からスライドイン
- [ ] サブシーンC: 赤背景コメントが左からスライドイン
- [ ] エンディングテキストが赤色
- [ ] 全体で約60秒（10項目分）
- [ ] 音声が各シーンで正しく再生される

---

## テンプレート差し替えテスト

全Step完了後、templates/ranking-default.json の色を変えて `pnpm render` し、
色が反映されることを確認:

```json
// 例: 青系テーマに変更
"sunburst": {
  "colorLight": "#4A90D9",
  "colorDark": "#1A3FAA"
}
```
