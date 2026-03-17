// RankHeader — 「第N位」テキスト (DEFINITIVE_v3)
import React from 'react'
import { FONT_FAMILY, FONT_WEIGHT, FONT_SIZE, STROKE_WIDTH, TEXT_SHADOW } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import { RANK_HEADER } from '../../constants/layout'
import { Z_INDEX } from '../../constants/zIndex'

interface RankHeaderProps {
  rank: number
}

// DEFINITIVE_v3: 白fill + 黒stroke8px + 黒shadow blur14
// 位置: x=357-729, y=242-352, 中央揃え
// シーン全体を通して常時表示 (アニメーションなし)
export const RankHeader: React.FC<RankHeaderProps> = ({ rank }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: RANK_HEADER.y,
        left: 0,
        width: 1080,
        textAlign: 'center',
        zIndex: Z_INDEX.rankHeader,
      }}
    >
      <span
        style={{
          fontFamily: `'${FONT_FAMILY}', sans-serif`,
          fontWeight: FONT_WEIGHT,
          fontSize: FONT_SIZE.rankHeader,
          color: COLORS.rankHeaderFill,
          WebkitTextStroke: `${STROKE_WIDTH.rankHeader}px ${COLORS.rankHeaderStroke}`,
          paintOrder: 'stroke fill',
          textShadow: TEXT_SHADOW.rankHeader,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          display: 'block',
        }}
      >
        {`第${rank}位`}
      </span>
    </div>
  )
}
