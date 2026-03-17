// RankingScene — 1順位シーン (DEFINITIVE_v3 統合フレームタイムライン)
//
// 全要素は useCurrentFrame() の絶対フレームで制御 (phase分割なし)
//
// マイクロタイムライン:
//   F0        : 1f全画面黒 (SceneTransitionが担当)
//   F1-10     : brightness フェードイン (SceneTransitionが担当)
//   F24-33    : Phase1 見出し IN (headlinePopIn)
//   F39-48    : 画像A IN (assetARiseIn)
//   F75-84    : 見出し OUT + 画像A OUT
//   F107-115  : 上段コメント IN (captionTopSlideFadeIn)
//   F117-126  : 画像B IN (assetBRiseIn)
//   F123-131  : 下段コメント IN (captionBotSlideFadeIn)
//   F131-end  : Phase2 ホールド
import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { RankHeader } from '../text/RankHeader'
import { MainTitleText } from '../text/MainTitleText'
import { CaptionBox } from '../text/CaptionBox'
import { AssetImage } from '../asset/AssetImage'
import { blackFlash1f, sceneBrightnessIn } from '../animation/AnimationPreset'
import type { V3Scene, V3Theme } from '../../types/video-v3'

interface RankingSceneProps {
  scene: V3Scene
  theme: V3Theme
}

export const RankingScene: React.FC<RankingSceneProps> = ({ scene, theme }) => {
  const frame = useCurrentFrame()

  // 1f黒フラッシュ
  const flashOpacity = blackFlash1f(frame)
  // brightness フェードイン
  const brightness = sceneBrightnessIn(frame)

  const { phase1, phase2 } = scene
  const bg = theme.background

  return (
    <AbsoluteFill style={{ filter: brightness }}>
      {/* 背景: 静止サンバースト */}
      <BackgroundLayer
        colorA={bg.colorA}
        colorB={bg.colorB}
        centerX={bg.centerX}
        centerY={bg.centerY}
        burstCount={bg.burstCount}
      />

      {/* RankHeader: 常時表示 (z=50) */}
      <RankHeader rank={scene.rank} />

      {/* Phase1 見出し: F24-84 (IN F24-33, OUT F75-84) */}
      <MainTitleText lines={phase1.headlineLines} />

      {/* 画像A (Phase1) + 画像B (Phase2) */}
      <AssetImage
        assetA={phase1.asset.src}
        assetB={phase2.asset.src}
        fallbackLabelA={phase1.asset.fallbackLabel}
        fallbackLabelB={phase2.asset.fallbackLabel}
      />

      {/* 上段コメントボックス: F107-115 IN */}
      <CaptionBox text={phase2.topComment} variant="top" />

      {/* 下段コメントボックス: F123-131 IN */}
      <CaptionBox text={phase2.bottomComment} variant="bottom" />

      {/* 1f黒フラッシュオーバーレイ (z=1000) */}
      {flashOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            opacity: flashOpacity,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  )
}
