// レイアウト定数 (DEFINITIVE_v3.md px固定値 / 1080×1920基準)

import { CANVAS_HEIGHT, CANVAS_WIDTH } from './timing'

// RankHeader: x=357, y=242, w=372, h=110 (中央揃え)
export const RANK_HEADER = {
  x: 357, y: 242, width: 372, height: 110,
}

// Phase1見出し: x=270, y=805, w=540, h=220 (中央揃え)
export const MAIN_TITLE = {
  x: 270, y: 805, width: 540, height: 220,
}

// 上段コメントボックス: x=20, y=420, w=1040 (96%幅・フル)
export const CAPTION_BOX_1 = {
  x: 20, y: 420, width: 1040, height: 130,
}

// 下段コメントボックス: x=20, y=640, w=1040 (96%幅・フル)
export const CAPTION_BOX_2 = {
  x: 20, y: 640, width: 1040, heightSingle: 130, heightDouble: 210,
}

// 画像スロット: x=270, y=1440, w=540, h=420 (幅50%・中央固定、spec: 40-55%必須)
export const ASSET_IMAGE = {
  x: 270, y: 1440, width: 540, height: 420,
}

// CaptionBox 共通スタイル
export const CAPTION_BOX = {
  paddingV: 18,
  paddingH: 22,
  borderWidth: 6,
}

// セーフエリア
export const SAFE_AREA = {
  action: 60,
  title: 120,
}

// レガシー互換 (旧コードで参照されている可能性)
export const RANK_HEADER_ZONE = {
  yStart: Math.round(CANVAS_HEIGHT * 0.06),
  yEnd: Math.round(CANVAS_HEIGHT * 0.20),
  xCenter: CANVAS_WIDTH / 2,
}
export const CAPTION_ZONE = {
  yStart: Math.round(CANVAS_HEIGHT * 0.30),
  yEnd: Math.round(CANVAS_HEIGHT * 0.62),
}
export const ASSET_ZONE = {
  yStart: Math.round(CANVAS_HEIGHT * 0.74),
  yEnd: Math.round(CANVAS_HEIGHT * 0.95),
  xCenter: CANVAS_WIDTH / 2,
}
