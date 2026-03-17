// OpeningScene — Intro シーン (spec v5: 中央配置 + Math.sin 揺れ)
// タイトル: 中央揃え4行, 強調行が赤
// 文字もイラストも Math.sin(frame * 0.8) * 3 で横揺れ
// 0フレーム目から可視情報あり (暗転なし)
// duration: 90f (3秒)
import React from 'react'
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import type { V3IntroLine, V3Background } from '../../types/video-v3'

interface OpeningSceneProps {
  lines: V3IntroLine[]
  background: V3Background
  introImageSrc?: string  // optional: イントロ画像パス
  audioSrc?: string       // optional: イントロ音声パス
}

// 最大行長に応じてフォントサイズを動的調整 (spec: 75px, 最小50px)
function calcFontSize(lines: V3IntroLine[]): number {
  const maxLen = Math.max(...lines.map(l => l.text.length))
  if (maxLen <= 7) return 75
  if (maxLen <= 9) return 62
  return 50
}
const LINE_FONT_SIZE = 72  // fallback

const getLineStyle = (style: V3IntroLine['style']): React.CSSProperties => {
  switch (style) {
    case 'introRed':
      return {
        color: COLORS.openingRed,
        WebkitTextStroke: `5px ${COLORS.black}`,
        paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
      }
    case 'introYellow':
      return {
        color: COLORS.openingYellow,
        WebkitTextStroke: `5px ${COLORS.black}`,
        paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
      }
    case 'introBlack':
    default:
      return {
        color: COLORS.white,
        WebkitTextStroke: `4px ${COLORS.black}`,
        paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
      }
  }
}

export const OpeningScene: React.FC<OpeningSceneProps> = ({ lines, background, introImageSrc, audioSrc }) => {
  const frame = useCurrentFrame()
  // spec v5: Math.sin(frame * 0.8) * 3 で文字もイラストも左右に小刻みに揺れ続ける
  const shake = Math.sin(frame * 0.8) * 3
  const fontSize = calcFontSize(lines)

  return (
    <AbsoluteFill>
      {/* イントロ音声 */}
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
      <BackgroundLayer
        colorA={background.colorA}
        colorB={background.colorB}
        centerX={background.centerX}
        centerY={background.centerY}
        burstCount={background.burstCount}
      />

      {/* 中央揃えタイトルブロック (揺れ付き) */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: 40,
          right: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 30,
          transform: `translateX(${shake}px)`,
        }}
      >
        {lines.map((line, i) => {
          const lineStyle = getLineStyle(line.style)
          return (
            <div key={i} style={{ textAlign: 'center', width: '100%' }}>
              <span
                style={{
                  fontFamily: `'${FONT_FAMILY}', sans-serif`,
                  fontWeight: FONT_WEIGHT,
                  fontSize,
                  lineHeight: 1.25,
                  display: 'block',
                  textShadow: '4px 4px 0px rgba(0,0,0,0.5)',
                  ...lineStyle,
                }}
              >
                {line.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* 下部装飾テキスト (揺れ付き) */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 20,
          transform: `translateX(${shake}px)`,
        }}
      >
        <span
          style={{
            fontFamily: `'${FONT_FAMILY}', sans-serif`,
            fontWeight: FONT_WEIGHT,
            fontSize: 80,
            color: COLORS.white,
            WebkitTextStroke: `5px ${COLORS.black}`,
            paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
            textShadow: '4px 4px 0px rgba(0,0,0,0.5)',
          }}
        >
          ランキング！
        </span>
      </div>
    </AbsoluteFill>
  )
}
