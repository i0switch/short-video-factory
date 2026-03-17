// AssetImage — 素材画像 (DEFINITIVE_v3)
// assetA: F39-48 IN, F75-84 OUT (Phase1用)
// assetB: F117-126 IN, 以後ホールド (Phase2用)
import React from 'react'
import { Img, staticFile, useCurrentFrame } from 'remotion'
import { ASSET_IMAGE } from '../../constants/layout'
import { Z_INDEX } from '../../constants/zIndex'
import { assetARiseIn, assetAFadeOut, assetBRiseIn } from '../animation/AnimationPreset'

interface AssetImageProps {
  // assetA: Phase1用, assetB: Phase2用
  assetA: string  // src パス (空文字でfallback)
  assetB: string  // src パス (空文字でfallback)
  fallbackLabelA?: string
  fallbackLabelB?: string
}

// DEFINITIVE_v3: 位置固定 x=392, y=1524, w=296, h=298 (正方形)
export const AssetImage: React.FC<AssetImageProps> = ({
  assetA,
  assetB,
}) => {
  const frame = useCurrentFrame()

  // assetA: F39-83 の間に表示 (F84以降非表示)
  const showA = frame >= 39 && frame < 84
  // assetB: F117以降に表示
  const showB = frame >= 117

  const animA = frame < 75 ? assetARiseIn(frame) : assetAFadeOut(frame)
  const animB = assetBRiseIn(frame)

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top: ASSET_IMAGE.y,
    left: ASSET_IMAGE.x,
    width: ASSET_IMAGE.width,
    height: ASSET_IMAGE.height,
    zIndex: Z_INDEX.asset,
  }

  return (
    <>
      {/* assetA — Phase1 */}
      {showA && assetA && (
        <div
          style={{
            ...baseStyle,
            opacity: animA.opacity,
            transform: animA.transform,
          }}
        >
          <Img
            src={staticFile(assetA)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* assetB — Phase2 */}
      {showB && assetB && (
        <div
          style={{
            ...baseStyle,
            opacity: animB.opacity,
            transform: animB.transform,
          }}
        >
          <Img
            src={staticFile(assetB)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}
    </>
  )
}
