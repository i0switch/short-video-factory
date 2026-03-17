// RankingScene — 4ステップ Sequence 構成 (spec v5 準拠)
//
// Step 1: 順位を画面中央に大きく (15%)
// Step 2: 順位が上部に縮小 + 特徴テキスト + イラスト (28%)
// Step 3: 青枠コメント単独 (28%)
// Step 4: 赤枠コメント単独 (29%)
// 青枠と赤枠は絶対に同時表示しない
import React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import type { V3Scene, V3Theme } from '../../types/video-v3'

interface RankingSceneProps {
  scene: V3Scene
  theme: V3Theme
}

function formatComment(text: string, charsPerLine = 9): string {
  const lines: string[] = []
  let remaining = text
  while (remaining.length > charsPerLine) {
    lines.push(remaining.slice(0, charsPerLine))
    remaining = remaining.slice(charsPerLine)
  }
  if (remaining) lines.push(remaining)
  return lines.slice(0, 2).join('\n')
}

// 順位 大: Step 1 用 (中央, 上からフェードイン)
const RankBig: React.FC<{ rank: number }> = ({ rank }) => {
  const f = useCurrentFrame()
  const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
  const y = interpolate(f, [0, 8], [-40, 0], { extrapolateRight: 'clamp' })
  return (
    <div style={{
      position: 'absolute',
      top: '35%',
      width: '100%',
      textAlign: 'center',
      opacity,
      transform: `translateY(${y}px)`,
      zIndex: 50,
    }}>
      <span style={{
        fontFamily: `'${FONT_FAMILY}', sans-serif`,
        fontWeight: FONT_WEIGHT,
        fontSize: 120,
        color: '#FFF',
        WebkitTextStroke: '4px #333',
        paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
        textShadow: '4px 4px 0px rgba(0,0,0,0.5)',
      }}>
        第{rank}位
      </span>
    </div>
  )
}

// 順位 小: Step 2-4 用 (上部固定, 即表示)
const RankSmall: React.FC<{ rank: number }> = ({ rank }) => (
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
      fontSize: 70,
      color: '#FFF',
      WebkitTextStroke: '3px #333',
      paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
      textShadow: '4px 4px 0px rgba(0,0,0,0.4)',
    }}>
      第{rank}位
    </span>
  </div>
)

// 特徴テキスト + イラスト: Step 2 用
const TopicLayer: React.FC<{ lines: string[]; src: string; fallback: string }> = ({ lines, src, fallback }) => {
  const f = useCurrentFrame()
  const topicOpacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
  const topicY = interpolate(f, [0, 8], [-30, 0], { extrapolateRight: 'clamp' })
  const imgOpacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
  const imgY = interpolate(f, [0, 8], [30, 0], { extrapolateRight: 'clamp' })

  return (
    <>
      {/* 特徴テキスト: 上からフェードイン */}
      <div style={{
        position: 'absolute',
        top: '25%',
        width: '90%',
        left: '5%',
        textAlign: 'center',
        opacity: topicOpacity,
        transform: `translateY(${topicY}px)`,
        zIndex: 30,
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontFamily: `'${FONT_FAMILY}', sans-serif`,
            fontWeight: FONT_WEIGHT,
            fontSize: 65,
            color: '#FFF',
            WebkitTextStroke: '2px #000',
            paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
            textShadow: '3px 3px 0px rgba(0,0,0,0.4)',
            lineHeight: 1.2,
          }}>
            {line}
          </div>
        ))}
      </div>
      {/* イラスト: 下からフェードイン */}
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '50%',
        transform: `translateX(-50%) translateY(${imgY}px)`,
        opacity: imgOpacity,
        width: '55%',
        zIndex: 20,
      }}>
        <Img
          src={staticFile(src)}
          style={{ width: '100%', objectFit: 'contain' }}
          onError={() => {}}
        />
      </div>
    </>
  )
}

// コメントボックス: Step 3 (青) / Step 4 (赤) 用
const CommentBox: React.FC<{ text: string; borderColor: string }> = ({ text, borderColor }) => {
  const f = useCurrentFrame()
  const opacity = interpolate(f, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
  const y = interpolate(f, [0, 10], [24, 0], { extrapolateRight: 'clamp' })
  const formatted = formatComment(text, 9)

  return (
    <div style={{
      position: 'absolute',
      top: '25%',
      left: '5%',
      width: '90%',
      opacity,
      transform: `translateY(${y}px)`,
      zIndex: 40,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: `3px solid ${borderColor}`,
        borderRadius: 4,
        padding: '16px 20px',
      }}>
        <span style={{
          fontFamily: `'${FONT_FAMILY}', sans-serif`,
          fontWeight: 700,
          fontSize: 40,
          color: '#000',
          textAlign: 'left',
          lineHeight: 1.3,
          display: 'block',
          whiteSpace: 'pre-line',
        }}>
          {formatted}
        </span>
      </div>
    </div>
  )
}

export const RankingScene: React.FC<RankingSceneProps> = ({ scene, theme }) => {
  const { phase1, phase2 } = scene
  const bg = theme.background
  const durationF = scene.durationFrames ?? 162

  const step1End = Math.round(durationF * 0.15)          // ~24f
  const step2End = Math.round(durationF * 0.43)          // ~69f
  const step3End = Math.round(durationF * 0.71)          // ~115f

  return (
    <AbsoluteFill>
      {/* 背景: 常時回転 (BackgroundLayer内でuseCurrentFrame使用) */}
      <BackgroundLayer
        colorA={bg.colorA}
        colorB={bg.colorB}
        centerX={bg.centerX}
        centerY={bg.centerY}
        burstCount={bg.burstCount}
      />

      {/* Step 1: 順位を画面中央に大きく + 順位読み上げ音声 */}
      <Sequence durationInFrames={step1End}>
        <AbsoluteFill>
          <RankBig rank={scene.rank} />
          {scene.rankAudioSrc && <Audio src={staticFile(scene.rankAudioSrc)} />}
        </AbsoluteFill>
      </Sequence>

      {/* Step 2: 順位小(上部) + 特徴 + イラスト + 特徴読み上げ音声 */}
      <Sequence from={step1End} durationInFrames={step2End - step1End}>
        <AbsoluteFill>
          <RankSmall rank={scene.rank} />
          <TopicLayer
            lines={phase1.headlineLines}
            src={phase1.asset.src}
            fallback={phase1.asset.fallbackLabel}
          />
          {scene.topicAudioSrc && <Audio src={staticFile(scene.topicAudioSrc)} />}
        </AbsoluteFill>
      </Sequence>

      {/* Step 3: 順位小(上部) + 青枠コメント単独 + 男性声音声 */}
      <Sequence from={step2End} durationInFrames={step3End - step2End}>
        <AbsoluteFill>
          <RankSmall rank={scene.rank} />
          <CommentBox text={phase2.topComment} borderColor="#1410E1" />
          {scene.blueAudioSrc && <Audio src={staticFile(scene.blueAudioSrc)} />}
        </AbsoluteFill>
      </Sequence>

      {/* Step 4: 順位小(上部) + 赤枠コメント単独 + 女性声音声 */}
      <Sequence from={step3End} durationInFrames={durationF - step3End}>
        <AbsoluteFill>
          <RankSmall rank={scene.rank} />
          <CommentBox text={phase2.bottomComment} borderColor="#E0261C" />
          {scene.redAudioSrc && <Audio src={staticFile(scene.redAudioSrc)} />}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  )
}
