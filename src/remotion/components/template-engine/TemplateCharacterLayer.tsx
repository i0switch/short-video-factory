import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

type TemplateCharacter = {
  role: 'narrator' | 'character1' | 'character2'
  x: number
  y: number
  scale: number
  emotion: 'neutral' | 'anger' | 'confusion' | 'shock' | 'happy' | 'sad'
}

const SPEAKER_COLORS: Record<TemplateCharacter['role'], string> = {
  narrator: '#4B8DF7',
  character1: '#4FD46B',
  character2: '#FF5D7A',
}

const EMOTION_HAIR: Record<TemplateCharacter['emotion'], string> = {
  neutral: '#2A2A2A',
  anger: '#4A1111',
  confusion: '#2E2E77',
  shock: '#101010',
  happy: '#6B3E00',
  sad: '#173251',
}

const EMOTION_MOUTH: Record<TemplateCharacter['emotion'], string> = {
  neutral: 'flat',
  anger: 'angry',
  confusion: 'small',
  shock: 'open',
  happy: 'smile',
  sad: 'frown',
}

export const TemplateCharacterLayer: React.FC<{
  characters: TemplateCharacter[]
}> = ({ characters }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 3 }}>
      {characters.map((character, index) => {
        const float = Math.sin((frame + index * 11) / 18) * 4
        const pulse = interpolate(frame % 24, [0, 12, 24], [1, 1.03, 1])
        const baseColor = SPEAKER_COLORS[character.role]
        const hair = EMOTION_HAIR[character.emotion]
        const mouth = EMOTION_MOUTH[character.emotion]
        const size = 300 * character.scale

        return (
          <div
            key={`${character.role}-${index}`}
            style={{
              position: 'absolute',
              left: character.x - size / 2,
              top: character.y - size / 2 + float,
              width: size,
              height: size,
              transform: `scale(${pulse})`,
              transformOrigin: 'center center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `radial-gradient(circle at 50% 38%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 18%, rgba(255,255,255,0.0) 32%), linear-gradient(180deg, ${baseColor} 0%, ${hair} 100%)`,
                boxShadow: `0 20px 28px rgba(0,0,0,0.3), 0 0 0 8px rgba(255,255,255,0.12)`,
                border: '6px solid rgba(0,0,0,0.9)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '24%',
                width: '56%',
                height: '38%',
                transform: 'translateX(-50%)',
                borderRadius: '50%',
                background: '#F7D7B9',
                border: '5px solid rgba(0,0,0,0.9)',
              }}
            />
            <div style={eyeStyle(28, 95, character.emotion)} />
            <div style={eyeStyle(72, 95, character.emotion)} />
            <div style={mouthStyle(mouth)} />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '6%',
                width: '64%',
                height: '24%',
                transform: 'translateX(-50%)',
                borderRadius: '28% 28% 18% 18%',
                background: `linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.15))`,
                border: '5px solid rgba(0,0,0,0.85)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '-10%',
                transform: 'translateX(-50%)',
                width: '72%',
                height: '18%',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.16)',
                filter: 'blur(1px)',
              }}
            />
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

function eyeStyle(leftPercent: number, topPercent: number, emotion: TemplateCharacter['emotion']): React.CSSProperties {
  const open = emotion === 'shock' ? 22 : 14
  return {
    position: 'absolute',
    left: `${leftPercent}%`,
    top: `${topPercent}%`,
    width: open,
    height: open,
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: '#1A1A1A',
    boxShadow: '0 0 0 4px rgba(255,255,255,0.25)',
  }
}

function mouthStyle(mouth: string): React.CSSProperties {
  const common: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '63%',
    transform: 'translateX(-50%)',
    border: '5px solid #1A1A1A',
  }
  if (mouth === 'open') {
    return {
      ...common,
      width: '18%',
      height: '13%',
      borderRadius: '50%',
      background: '#7A2C2C',
    }
  }
  if (mouth === 'smile') {
    return {
      ...common,
      width: '28%',
      height: '12%',
      borderRadius: '0 0 999px 999px',
      borderTop: 'none',
      background: 'transparent',
    }
  }
  if (mouth === 'frown') {
    return {
      ...common,
      width: '28%',
      height: '12%',
      borderRadius: '999px 999px 0 0',
      borderBottom: 'none',
      background: 'transparent',
    }
  }
  if (mouth === 'angry') {
    return {
      ...common,
      width: '22%',
      height: 0,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderBottom: '5px solid #1A1A1A',
    }
  }
  return {
    ...common,
    width: '22%',
    height: 0,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '5px solid #1A1A1A',
  }
}
