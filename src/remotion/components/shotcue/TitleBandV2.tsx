import React from 'react'
import { AbsoluteFill } from 'remotion'

export const TitleBandV2: React.FC<{
  seriesTitle: string
  episodeTitle: string
}> = ({ seriesTitle, episodeTitle }) => {
  return (
    <AbsoluteFill style={{ zIndex: 5 }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1080,
          height: 230,
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Line 1 - Series title */}
        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: '#FFD700',
            WebkitTextStroke: '6px #000',
            textShadow: '0 0 20px rgba(255,215,0,0.6)',
            paintOrder: 'stroke fill',
            lineHeight: 1.1,
            textAlign: 'center',
            fontFamily: '"Noto Sans JP", sans-serif',
          }}
        >
          {seriesTitle}
        </div>
        {/* Line 2 - Episode title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#FFD700',
            WebkitTextStroke: '5px #000',
            textShadow: '0 0 15px rgba(255,215,0,0.5)',
            paintOrder: 'stroke fill',
            lineHeight: 1.1,
            textAlign: 'center',
            fontFamily: '"Noto Sans JP", sans-serif',
          }}
        >
          {episodeTitle}
        </div>
      </div>
    </AbsoluteFill>
  )
}
