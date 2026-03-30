import React from 'react'
import { AbsoluteFill, Img, staticFile } from 'remotion'

const EMOTION_COLORS: Record<string, { bg: string; gradient?: string }> = {
  neutral:   { bg: '#F5E6D3' },                                    // ベージュ（日常）
  anger:     { bg: '#CC2222', gradient: 'linear-gradient(180deg, #CC2222 0%, #881111 100%)' },  // 赤（怒り）
  confusion: { bg: '#4444AA', gradient: 'linear-gradient(180deg, #5544BB 0%, #3333AA 100%)' },  // 青紫（混乱）
  shock:     { bg: '#111111', gradient: 'linear-gradient(180deg, #222222 0%, #000000 100%)' },   // 黒（衝撃）
  happy:     { bg: '#FFD700', gradient: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)' },   // 黄金（喜び）
  sad:       { bg: '#223344', gradient: 'linear-gradient(180deg, #2A3B4C 0%, #112233 100%)' },   // 暗青（悲しみ）
}

interface Props {
  emotion: string
  backgroundImageSrc?: string
  overlayOpacity?: number
}

export const EmotionBackground: React.FC<Props> = ({ emotion, backgroundImageSrc, overlayOpacity }) => {
  const colors = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.neutral

  // 背景画像あり: 画像 + 感情カラーオーバーレイ
  if (backgroundImageSrc) {
    const resolvedOverlayOpacity = overlayOpacity
      ?? (emotion === 'neutral' ? 0.1 : emotion === 'shock' ? 0.18 : 0.12)
    return (
      <AbsoluteFill>
        <Img
          src={staticFile(backgroundImageSrc)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            backgroundColor: colors.bg,
          }}
        />
        <AbsoluteFill
          style={{
            background: colors.gradient ?? colors.bg,
            opacity: resolvedOverlayOpacity,
          }}
        />
      </AbsoluteFill>
    )
  }

  // 背景画像なし: 従来の感情カラー背景
  return (
    <AbsoluteFill
      style={{
        background: colors.gradient ?? colors.bg,
      }}
    />
  )
}
