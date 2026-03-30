import React from 'react'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'

interface Props {
  title: string
  seriesTitle?: string
  titleColor?: string
}

// 参考動画準拠: オレンジ〜ピーチ色、白い太縁取り、左上寄せ、黒帯上に配置
const DEFAULT_TITLE_COLOR = '#FF9955'

export const TitleBar: React.FC<Props> = ({
  title,
  seriesTitle,
  titleColor = DEFAULT_TITLE_COLOR,
}) => {
  const titleLines = title.split('\n').filter(Boolean)
  const line1 = seriesTitle ?? titleLines[0] ?? title
  const line2 = seriesTitle ? title : (titleLines[1] ?? '')
  const hasTwoLines = !!line2
  // 7文字超えると改行されるので動的にフォントサイズを縮小
  const line2FontSize = line2.length <= 7 ? 120 : Math.min(120, Math.floor(840 / line2.length))

  const baseTextStyle: React.CSSProperties = {
    fontFamily: `'${FONT_FAMILY}', sans-serif`,
    fontWeight: 900,
    color: titleColor,
    WebkitTextStroke: '5px #FFFFFF',
    paintOrder: 'stroke fill',
    textShadow: '3px 3px 0px rgba(0,0,0,0.9), 0px 0px 12px rgba(0,0,0,0.6)',
    textAlign: 'left',
    letterSpacing: '0.02em',
    lineHeight: 1.1,
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 100,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '16px 28px 12px 28px',
      }}
    >
      {hasTwoLines ? (
        <>
          <span style={{ ...baseTextStyle, fontSize: 140 }}>
            {line1}
          </span>
          <span style={{ ...baseTextStyle, fontSize: line2FontSize, whiteSpace: 'nowrap' }}>
            {line2}
          </span>
        </>
      ) : (
        <span style={{ ...baseTextStyle, fontSize: 140 }}>
          {line1}
        </span>
      )}
    </div>
  )
}
