import templateData from '../../templates/ranking-default.json'

// テンプレートから読み込み。将来は CLI 引数で別テンプレートを指定可能にする
export const TEMPLATE = templateData

// 後方互換: 旧 DESIGN 定数（移行完了後に削除予定）
export const DESIGN = {
  sunburst: {
    color1: TEMPLATE.sunburst.colorDark,
    color2: TEMPLATE.sunburst.colorLight,
    angleDeg: 5,
  },
  text: {
    fontFamily: `'${TEMPLATE.fonts.primary}', sans-serif`,
    titleFontSize: TEMPLATE.titleScene.fontSize,
    rankFontSize: TEMPLATE.rankingScene.subSceneA.rankText.fontSize,
    headingFontSize: TEMPLATE.rankingScene.subSceneB.commentBox.fontSize,
    fontWeight: TEMPLATE.fonts.weight,
    color: '#FFFFFF',
    highlightColor: TEMPLATE.rankingScene.subSceneA.topicText.color,
    strokeWidth: `${TEMPLATE.titleScene.strokeWidth}px`,
    strokeColor: TEMPLATE.titleScene.strokeColor,
    shadow: '0 4px 8px rgba(0,0,0,0.5)',
  },
  rankText: {
    color: TEMPLATE.rankingScene.subSceneA.rankText.color,
    strokeColor: TEMPLATE.rankingScene.subSceneA.rankText.strokeColor,
    shadow: '0 4px 8px rgba(0,0,0,0.5)',
  },
  headingBox: {
    background: TEMPLATE.rankingScene.subSceneB.commentBox.background,
    borderColor: TEMPLATE.rankingScene.subSceneB.commentBox.borderColor,
    borderWidth: TEMPLATE.rankingScene.subSceneB.commentBox.borderWidth,
    borderRadius: TEMPLATE.rankingScene.subSceneB.commentBox.borderRadius,
    paddingVertical: TEMPLATE.rankingScene.subSceneB.commentBox.paddingVertical,
    paddingHorizontal: TEMPLATE.rankingScene.subSceneB.commentBox.paddingHorizontal,
    textColor: TEMPLATE.rankingScene.subSceneB.commentBox.textColor,
    widthPercent: TEMPLATE.rankingScene.subSceneB.commentBox.widthPercent,
  },
  commentBox2: {
    background: TEMPLATE.rankingScene.subSceneC.commentBox.background,
    textColor: TEMPLATE.rankingScene.subSceneC.commentBox.textColor,
    borderRadius: TEMPLATE.rankingScene.subSceneC.commentBox.borderRadius,
    paddingVertical: TEMPLATE.rankingScene.subSceneC.commentBox.paddingVertical,
    paddingHorizontal: TEMPLATE.rankingScene.subSceneC.commentBox.paddingHorizontal,
    fontSize: TEMPLATE.rankingScene.subSceneC.commentBox.fontSize,
  },
  image: {
    title: { maxWidth: 500, maxHeight: 400 },
    ranking: { maxWidth: 600, maxHeight: 500 },
  },
  animation: {
    fadeInDuration: 8,
    staggerDelay: 6,
    phaseAFrames: 60,
    phaseBFrames: 75,
    popInDuration: 12,
    slideInDuration: 9,
  },
  timing: {
    introDurationSec: 4,
    outroDurationSec: 3,
    scenePaddingSec: 0.5,
  },
} as const
