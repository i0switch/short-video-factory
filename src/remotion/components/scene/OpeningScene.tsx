// OpeningScene — Intro シーン (v4 left-upper layout)
// タイトル: 左上寄せ多行, 強調語が赤
// 画像: タイトル下、左〜中央寄り, 画面幅28%
// 0フレーム目から可視情報あり (暗転なし)
// duration: 90f (3秒)
import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import { sceneBrightnessIn, introLinePop } from '../animation/AnimationPreset'
import { INTRO_LINE_STAGGER } from '../../constants/timing'
import type { V3IntroLine, V3Background } from '../../types/video-v3'

interface OpeningSceneProps {
  lines: V3IntroLine[]
  background: V3Background
  introImageSrc?: string  // optional: イントロ画像パス
}

const LINE_FONT_SIZE = 72

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

export const OpeningScene: React.FC<OpeningSceneProps> = ({ lines, background, introImageSrc }) => {
  const frame = useCurrentFrame()
  const brightness = sceneBrightnessIn(frame)

  return (
    <AbsoluteFill style={{ filter: brightness }}>
      <BackgroundLayer
        colorA={background.colorA}
        colorB={background.colorB}
        centerX={background.centerX}
        centerY={background.centerY}
        burstCount={background.burstCount}
      />

      {/* 左上寄せタイトルブロック */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 60,
          right: 60,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          zIndex: 30,
        }}
      >
        {lines.map((line, i) => {
          const stagger = INTRO_LINE_STAGGER[i] ?? [i * 8, i * 8 + 6]
          const anim = introLinePop(frame, stagger[0], stagger[1])
          const lineStyle = getLineStyle(line.style)
          return (
            <div key={i} style={{ textAlign: 'left', ...anim }}>
              <span
                style={{
                  fontFamily: `'${FONT_FAMILY}', sans-serif`,
                  fontWeight: FONT_WEIGHT,
                  fontSize: LINE_FONT_SIZE,
                  lineHeight: 1.2,
                  display: 'block',
                  textShadow: '3px 3px 8px rgba(0,0,0,0.55)',
                  ...lineStyle,
                }}
              >
                {line.text}
              </span>
            </div>
          )
        })}

        {/* タイトル下の画像 (オプション) */}
        {introImageSrc && (
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              justifyContent: 'flex-start',
              ...introLinePop(frame, 20, 28),
            }}
          >
            <Img
              src={staticFile(introImageSrc)}
              style={{
                width: 300,
                maxHeight: 320,
                objectFit: 'contain',
              }}
            />
          </div>
        )}
      </div>

      {/* 画像なしの場合: 中央下部に大きなアイコン的な装飾テキスト */}
      {!introImageSrc && (
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 20,
            ...introLinePop(frame, 15, 25),
          }}
        >
          <span
            style={{
              fontFamily: `'${FONT_FAMILY}', sans-serif`,
              fontWeight: FONT_WEIGHT,
              fontSize: 96,
              color: COLORS.white,
              WebkitTextStroke: `6px ${COLORS.black}`,
              paintOrder: 'stroke fill',
              textShadow: '4px 4px 12px rgba(0,0,0,0.6)',
              opacity: 0.9,
            }}
          >
            ランキング
          </span>
        </div>
      )}
    </AbsoluteFill>
  )
}
