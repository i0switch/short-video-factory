import React from 'react'
import { Img, staticFile, useCurrentFrame, interpolate } from 'remotion'
import type { V4CharacterSlot } from '../../types/video-2ch'

interface Props {
  imageSrc: string
  fallbackUsed?: boolean
  characterSlots?: V4CharacterSlot[]
}

export const CharacterDisplay: React.FC<Props> = ({ imageSrc, fallbackUsed, characterSlots }) => {
  const frame = useCurrentFrame()

  // 参考動画準拠: キャラは即座に表示（微小スケールインのみ）
  const baseScale = interpolate(frame, [0, 6], [0.95, 1.0], { extrapolateRight: 'clamp' })
  const opacity = interpolate(frame, [0, 3], [0, 1], { extrapolateRight: 'clamp' })

  // 参考動画準拠: キャラ微揺れ（±2-3px、呼吸感）
  const wobbleX = Math.sin(frame * 0.15) * 2
  const wobbleY = Math.cos(frame * 0.12) * 1.5

  const slot = characterSlots?.[0]

  if (slot) {
    const slotScale = slot.scale * baseScale
    const anchorTransform = slot.anchor === 'center'
      ? 'translate(-50%, -50%)'
      : slot.anchor === 'bottom-left'
        ? 'translate(0, -100%)'
        : slot.anchor === 'bottom-right'
          ? 'translate(-100%, -100%)'
          : 'translate(-50%, -100%)'

    return (
      <div style={{
        position: 'absolute',
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: `${anchorTransform} scale(${slotScale}) translate(${wobbleX}px, ${wobbleY}px)`,
        transformOrigin: 'bottom center',
        opacity,
        width: '90%',
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <Img
          src={staticFile(imageSrc)}
          style={{
            width: '100%',
            objectFit: 'contain',
            maxHeight: 1500,
          }}
          onError={() => {}}
        />
      </div>
    )
  }

  // 参考動画準拠: キャラは画面下半分を大きく占める（幅80-90%、下部配置）
  return (
    <div style={{
      position: 'absolute',
      bottom: '0%',
      left: '50%',
      transform: `translateX(-50%) scale(${baseScale}) translate(${wobbleX}px, ${wobbleY}px)`,
      transformOrigin: 'bottom center',
      width: '100%',
      opacity,
      zIndex: 20,
      pointerEvents: 'none',
    }}>
      <Img
        src={staticFile(imageSrc)}
        style={{
          width: '100%',
          objectFit: 'contain',
          maxHeight: 1500,
        }}
        onError={() => {}}
      />
    </div>
  )
}
