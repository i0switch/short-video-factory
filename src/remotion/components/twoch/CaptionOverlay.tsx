import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import type { V4CaptionPreset, V4CaptionZone } from '../../types/video-2ch'

interface Props {
  text: string
  speakerColor: string
  speaker: string
  captionColor?: string
  fadeInFrames?: number
  v4Caption?: V4CaptionPreset
  v4CaptionZone?: V4CaptionZone
}

export const CaptionOverlay: React.FC<Props> = ({
  text, speakerColor, speaker, captionColor, fadeInFrames,
  v4Caption, v4CaptionZone,
}) => {
  const frame = useCurrentFrame()

  if (!text || !text.trim()) return null

  const fade = fadeInFrames ?? 2
  const opacity = fade <= 0
    ? 1
    : interpolate(frame, [0, fade], [0, 1], { extrapolateRight: 'clamp' })

  const lines = text.split('\n')
  const maxLineLen = Math.max(...lines.map(l => l.length))

  // 参考動画準拠: テロップは巨大（80-110px）
  // 参考動画準拠: テロップは超巨大（100-140px）
  const fontSize = v4Caption?.fontSize
    ?? (maxLineLen > 12 ? 100 : maxLineLen > 8 ? 120 : 140)

  // 参考動画準拠: テロップ色は水色〜青（#4FC3F7）+ 白い太縁取り
  const resolvedColor = v4Caption?.color ?? captionColor ?? '#4FC3F7'
  const strokeColor = '#FFFFFF'
  const strokeWidth = 6

  // テロップ位置: タイトル直下〜画面中央（y:18-40%）
  const zoneTop = v4CaptionZone?.top ?? 18
  const zoneLeft = v4CaptionZone?.left ?? 3
  const zoneWidth = v4CaptionZone?.width ?? 94

  return (
    <div style={{
      position: 'absolute',
      top: `${zoneTop}%`,
      left: `${zoneLeft}%`,
      width: `${zoneWidth}%`,
      opacity,
      zIndex: 60,
      pointerEvents: 'none',
    }}>
      {/* 参考動画準拠: 濃紺の角丸矩形ボックス背景 */}
      <div style={{
        background: 'rgba(10, 15, 40, 0.85)',
        borderRadius: 16,
        padding: '16px 24px',
        display: 'inline-block',
      }}>
        <span style={{
          fontFamily: `'${FONT_FAMILY}', sans-serif`,
          fontWeight: 900,
          fontSize,
          color: resolvedColor,
          WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          textShadow: '4px 4px 0px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
          lineHeight: 1.25,
          whiteSpace: 'pre-line',
          display: 'block',
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}>
          {text}
        </span>
      </div>
    </div>
  )
}
