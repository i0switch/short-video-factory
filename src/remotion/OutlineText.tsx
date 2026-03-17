import React from 'react'
import { TEMPLATE } from './design-tokens'

interface OutlineTextProps {
  children: React.ReactNode
  fontSize: number
  color?: string
  strokeColor?: string
  strokeWidth?: number   // px 数値
  shadow?: string
  style?: React.CSSProperties
}

const defaultShadow = '0 4px 12px rgba(0,0,0,0.6)'

export const OutlineText: React.FC<OutlineTextProps> = ({
  children,
  fontSize,
  color = '#FFFFFF',
  strokeColor = TEMPLATE.titleScene.strokeColor,
  strokeWidth = TEMPLATE.titleScene.strokeWidth,
  shadow = defaultShadow,
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    fontFamily: `'${TEMPLATE.fonts.primary}', sans-serif`,
    fontSize,
    fontWeight: TEMPLATE.fonts.weight,
    color,
    WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
    paintOrder: 'stroke fill' as unknown as React.CSSProperties['paintOrder'],
    textShadow: shadow,
    lineHeight: 1.2,
    textAlign: 'center',
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    ...style,
  }
  return <div style={baseStyle}>{children}</div>
}
