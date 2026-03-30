// RankingScene — 積み上がり型 (spec v5 revised)
//
// Sub-A (step1End〜subAEnd): 順位小 + トピック + キャラ画像
// Sub-B (subAEnd〜subBEnd): 順位小 + 青枠  + キャラ画像  ← トピックは消えるがキャラは残る
// Sub-C (subBEnd〜end):     順位小 + 青枠  + 赤枠 + キャラ画像  ← 青枠も消えない
//
// 絶対ルール:
//   - キャラ画像は Sub-B / Sub-C でも消えない
//   - 青枠は Sub-C でも消えない（置換ではなく追加）
import React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import type { V3Scene, V3Theme } from '../../types/video-v3'

interface RankingSceneProps {
  scene: V3Scene
  theme: V3Theme
}

import { wrapJapaneseToString } from '../../../utils/text-wrap'

function formatComment(text: string, charsPerLine = 10): string {
  return wrapJapaneseToString(text, charsPerLine, 2)
}

export const RankingScene: React.FC<RankingSceneProps> = ({ scene, theme }) => {
  const { phase1, phase2 } = scene
  const bg = theme.background
  const f = useCurrentFrame()
  const durationF = scene.durationFrames ?? 162

  // ---- フレーム境界 (build-v3-plan.ts の audiobudget と同期すること) ----
  const step1End = Math.round(durationF * 0.12)  // 順位大 終了
  const subAEnd  = Math.round(durationF * 0.40)  // トピック終了 → 青枠登場
  const subBEnd  = Math.round(durationF * 0.65)  // 青枠維持 → 赤枠追加

  // ---- 順位大 (Step 1 のみ, opacity で制御) ----
  // 0フレーム目から可視情報あり (空白フレーム防止): opacity は 0.8→1.0 の短いフェード
  const rankBigOpacity = f < step1End
    ? interpolate(f, [0, 4], [0.8, 1.0], { extrapolateRight: 'clamp' })
    : 0
  const rankBigY = f < step1End
    ? interpolate(f, [0, 8], [-20, 0], { extrapolateRight: 'clamp' })
    : 0

  // ---- 順位小 (step1End 以降ずっと) ----
  const showRankSmall = f >= step1End

  // ---- キャラ画像 (step1End 以降ずっと — Sub-B/C でも消えない) ----
  const charEnter = Math.max(0, f - step1End)
  const charOpacity = f >= step1End
    ? interpolate(charEnter, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
    : 0
  const charY = f >= step1End
    ? interpolate(charEnter, [0, 8], [30, 0], { extrapolateRight: 'clamp' })
    : 30

  // ---- トピックテキスト (step1End〜subAEnd のみ) ----
  const topicEnter = Math.max(0, f - step1End)
  const topicOpacity = f >= step1End && f < subAEnd
    ? interpolate(topicEnter, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
    : 0
  const topicY = f >= step1End && f < subAEnd
    ? interpolate(topicEnter, [0, 8], [-30, 0], { extrapolateRight: 'clamp' })
    : -30

  // ---- 青枠 (subAEnd 以降ずっと — Sub-C でも消えない) ----
  const blueEnter = Math.max(0, f - subAEnd)
  const blueOpacity = f >= subAEnd
    ? interpolate(blueEnter, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
    : 0
  const blueY = f >= subAEnd
    ? interpolate(blueEnter, [0, 10], [24, 0], { extrapolateRight: 'clamp' })
    : 24

  // ---- 赤枠 (subBEnd 以降 — 追加のみ、置換しない) ----
  const redEnter = Math.max(0, f - subBEnd)
  const redOpacity = f >= subBEnd
    ? interpolate(redEnter, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
    : 0
  const redY = f >= subBEnd
    ? interpolate(redEnter, [0, 10], [24, 0], { extrapolateRight: 'clamp' })
    : 24

  const blueFormatted = formatComment(phase2.topComment)
  const redFormatted  = formatComment(phase2.bottomComment)

  const { topBox, bottomBox } = theme
  const commentBoxBase: React.CSSProperties = {
    background: topBox.fill,
    borderRadius: 4,
    padding: `${topBox.paddingV}px ${topBox.paddingH}px`,
  }
  const commentTextStyle: React.CSSProperties = {
    fontFamily: `'${FONT_FAMILY}', sans-serif`,
    fontWeight: topBox.fontWeight,
    fontSize: topBox.fontSize,
    color: topBox.textColor,
    textAlign: 'left',
    lineHeight: 1.4,
    display: 'block',
    whiteSpace: 'pre-line',
  }

  return (
    <AbsoluteFill>
      {/* 背景: 常時回転 */}
      <BackgroundLayer
        colorA={bg.colorA}
        colorB={bg.colorB}
        centerX={bg.centerX}
        centerY={bg.centerY}
        burstCount={bg.burstCount}
      />

      {/* 音声タイムライン */}
      <Sequence durationInFrames={step1End}>
        {scene.rankAudioSrc && <Audio src={staticFile(scene.rankAudioSrc)} />}
      </Sequence>
      <Sequence from={step1End} durationInFrames={subAEnd - step1End}>
        {scene.topicAudioSrc && <Audio src={staticFile(scene.topicAudioSrc)} />}
      </Sequence>
      <Sequence from={subAEnd} durationInFrames={subBEnd - subAEnd}>
        {scene.blueAudioSrc && <Audio src={staticFile(scene.blueAudioSrc)} />}
      </Sequence>
      <Sequence from={subBEnd} durationInFrames={durationF - subBEnd}>
        {scene.redAudioSrc && <Audio src={staticFile(scene.redAudioSrc)} />}
      </Sequence>

      {/* Layer 5: 順位大 (Step 1 のみ) */}
      <div style={{
        position: 'absolute',
        top: '28%',
        width: '100%',
        textAlign: 'center',
        opacity: rankBigOpacity,
        transform: `translateY(${rankBigY}px)`,
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: `'${FONT_FAMILY}', sans-serif`,
          fontWeight: FONT_WEIGHT,
          fontSize: 160,
          color: '#FFF',
          WebkitTextStroke: '8px #000000',
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          textShadow: '4px 4px 0px rgba(0,0,0,0.5)',
        }}>
          第{scene.rank}位
        </span>
      </div>

      {/* Layer 5: 順位小 (step1End 以降常時) */}
      {showRankSmall && (
        <div style={{
          position: 'absolute',
          top: '5%',
          width: '100%',
          textAlign: 'center',
          zIndex: 50,
        }}>
          <span style={{
            fontFamily: `'${FONT_FAMILY}', sans-serif`,
            fontWeight: FONT_WEIGHT,
            fontSize: 116,
            color: '#FFF',
            WebkitTextStroke: '8px #000000',
            paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
            textShadow: '4px 4px 0px rgba(0,0,0,0.4)',
          }}>
            第{scene.rank}位
          </span>
        </div>
      )}

      {/* Layer 1: キャラ画像 (step1End 以降ずっと / Sub-B・Sub-C でも消えない) */}
      <div style={{
        position: 'absolute',
        bottom: '3%',
        left: '50%',
        transform: `translateX(-50%) translateY(${charY}px)`,
        opacity: charOpacity,
        width: '60%',
        zIndex: 20,
      }}>
        <Img
          src={staticFile(phase1.asset.src)}
          style={{ width: '100%', objectFit: 'contain' }}
          onError={() => {}}
        />
      </div>

      {/* Layer 2: トピックテキスト (Sub-A のみ) */}
      <div style={{
        position: 'absolute',
        top: '18%',
        width: '90%',
        left: '5%',
        textAlign: 'center',
        opacity: topicOpacity,
        transform: `translateY(${topicY}px)`,
        zIndex: 30,
        pointerEvents: 'none',
      }}>
        {phase1.headlineLines.map((line, i) => (
          <div key={i} style={{
            fontFamily: `'${FONT_FAMILY}', sans-serif`,
            fontWeight: FONT_WEIGHT,
            fontSize: theme.phase1Caption.fontSize,
            color: theme.phase1Caption.fill,
            WebkitTextStroke: `${theme.phase1Caption.strokeWidth}px ${theme.phase1Caption.stroke}`,
            paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
            textShadow: `0 0 ${theme.phase1Caption.shadowBlur}px ${theme.phase1Caption.shadowColor}`,
            lineHeight: 1.2,
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Layer 3+4: 青枠＋赤枠 — flex縦積み (top:40%, red は青の直下) */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '5%',
        width: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        zIndex: 40,
      }}>
        {/* 青枠 (subAEnd 以降ずっと) */}
        <div style={{ opacity: blueOpacity, transform: `translateY(${blueY}px)` }}>
          <div style={{ ...commentBoxBase, border: `${topBox.borderWidth}px solid ${topBox.borderColor}` }}>
            <span style={commentTextStyle}>{blueFormatted}</span>
          </div>
        </div>
        {/* 赤枠 (subBEnd 以降 — 追加のみ) */}
        <div style={{ opacity: redOpacity, transform: `translateY(${redY}px)` }}>
          <div style={{ ...commentBoxBase, border: `${bottomBox.borderWidth}px solid ${bottomBox.borderColor}` }}>
            <span style={{...commentTextStyle, fontWeight: bottomBox.fontWeight, fontSize: bottomBox.fontSize, color: bottomBox.textColor}}>{redFormatted}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
