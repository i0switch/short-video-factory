import React from 'react'
import { AbsoluteFill } from 'remotion'
import { wrapJapanese } from '../../../utils/text-wrap'

export const CaptionTextV2: React.FC<{
  text: string
}> = ({ text }) => {
  if (!text) return null
  const lines = wrapJapanese(text, 7)

  return (
    <AbsoluteFill style={{ zIndex: 4 }}>
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: 20,
          width: 1040,
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#FFFFFF',
              WebkitTextStroke: '5px #000000',
              paintOrder: 'stroke fill',
              lineHeight: 1.3,
              textAlign: 'left',
              fontFamily: '"Noto Sans JP", sans-serif',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
