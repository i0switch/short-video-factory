import React from 'react'
import { TEMPLATE } from './design-tokens'

interface TextBoxProps {
  children: React.ReactNode
}

export const TextBox: React.FC<TextBoxProps> = ({ children }) => {
  const cb = TEMPLATE.rankingScene.subSceneB.commentBox
  const style: React.CSSProperties = {
    background: cb.background,
    border: `${cb.borderWidth}px solid ${cb.borderColor}`,
    borderRadius: cb.borderRadius,
    paddingTop: cb.paddingVertical,
    paddingBottom: cb.paddingVertical,
    paddingLeft: cb.paddingHorizontal,
    paddingRight: cb.paddingHorizontal,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: `'${TEMPLATE.fonts.primary}', sans-serif`,
    fontSize: cb.fontSize,
    fontWeight: TEMPLATE.fonts.weight,
    color: cb.textColor,
    textAlign: 'center',
    lineHeight: 1.4,
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  }
  return <div style={style}>{children}</div>
}
