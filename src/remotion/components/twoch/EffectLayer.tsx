import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'

interface Props {
  effect: string
  children?: React.ReactNode
}

// 参考動画準拠: エフェクトは派手にはっきりと
export const EffectLayer: React.FC<Props> = ({ effect, children }) => {
  const frame = useCurrentFrame()

  if (effect === 'none' || !effect) return <>{children}</>

  // ── 1. 集中線 (concentration lines) ──────────────────────
  // 参考: 白+赤の放射線が画面全体を覆う、パルスアニメ
  if (effect === 'concentration_lines') {
    const opacity = interpolate(frame % 12, [0, 6, 11], [0.6, 0.9, 0.6])
    // 参考動画準拠: 白い放射状の集中線（マンガ風ズームエフェクト）
    const stops: string[] = []
    for (let i = 0; i < 36; i++) {
      const deg = i * 10
      const nextDeg = (i + 1) * 10
      const color = i % 2 === 0
        ? 'rgba(255,255,255,0.95)'
        : 'transparent'
      stops.push(`${color} ${deg}deg ${nextDeg}deg`)
    }
    return (
      <>
        {children}
        <AbsoluteFill
          style={{
            background: `conic-gradient(from ${frame * 0.3}deg at 50% 50%, ${stops.join(', ')})`,
            opacity,
            pointerEvents: 'none',
          }}
        />
      </>
    )
  }

  // ── 2. 渦巻き (vortex) ──────────────────────────────────
  // 参考: 紫の渦巻きが背景全体を覆う（困惑シーン）
  if (effect === 'vortex') {
    const rotation = frame * 4
    const rings: React.ReactNode[] = []
    for (let r = 0; r < 8; r++) {
      const size = 120 + r * 50
      const ringOpacity = 0.4 - r * 0.04
      rings.push(
        <div
          key={r}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${size}%`,
            height: `${size}%`,
            transform: `translate(-50%, -50%) rotate(${rotation + r * 15}deg)`,
            border: `${8 - r}px solid rgba(100,60,180,${ringOpacity})`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />,
      )
    }
    return (
      <>
        {children}
        {/* 紫背景オーバーレイ */}
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(80,40,160,0.7) 0%, rgba(40,20,100,0.85) 100%)',
            pointerEvents: 'none',
          }}
        />
        <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
          {rings}
        </AbsoluteFill>
      </>
    )
  }

  // ── 3. 稲妻 (lightning) ────────────────────────────────
  // 参考: 黒背景 + 白フラッシュ
  if (effect === 'lightning') {
    const flash1 = interpolate(frame, [0, 2, 4, 6, 8], [1, 0.1, 0.8, 0.1, 0], { extrapolateRight: 'clamp' })
    return (
      <>
        {children}
        {/* 黒背景 */}
        <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.7)', pointerEvents: 'none' }} />
        {/* 白フラッシュ（点滅） */}
        {flash1 > 0.05 && (
          <AbsoluteFill style={{ backgroundColor: '#FFFFFF', opacity: flash1, pointerEvents: 'none' }} />
        )}
      </>
    )
  }

  // ── 4. キラキラ (sparkle) ──────────────────────────────
  // 参考: 金色背景 + キラキラ星 + 紙吹雪
  if (effect === 'sparkle') {
    const seededRandom = (seed: number): number => {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
      return x - Math.floor(x)
    }

    // キラキラ星（大きく、たくさん）
    const STAR_COUNT = 40
    const stars: React.ReactNode[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const baseX = seededRandom(i * 3 + 1) * 100
      const baseY = seededRandom(i * 3 + 2) * 80
      const delay = seededRandom(i * 3 + 3) * 20
      const size = 24 + seededRandom(i * 7) * 40

      const cycle = (frame + delay) % 16
      const scale = interpolate(cycle, [0, 8, 16], [0.1, 1.2, 0.1])
      const starOpacity = interpolate(cycle, [0, 8, 16], [0.1, 1, 0.1])

      stars.push(
        <div
          key={`star-${i}`}
          style={{
            position: 'absolute',
            left: `${baseX}%`,
            top: `${baseY}%`,
            fontSize: `${size}px`,
            color: '#FFD700',
            textShadow: '0 0 16px rgba(255,215,0,0.9), 0 0 32px rgba(255,215,0,0.5)',
            transform: `scale(${scale}) rotate(${frame * 4 + i * 30}deg)`,
            opacity: starOpacity,
            pointerEvents: 'none',
          }}
        >
          ✦
        </div>,
      )
    }

    // 紙吹雪
    const CONFETTI_COUNT = 75
    const confetti: React.ReactNode[] = []
    const colors = ['#FF4444', '#4488FF', '#FFD700', '#44CC44', '#FF88CC', '#FF8800']
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const x = seededRandom(i * 5 + 100) * 100
      const speed = 4 + seededRandom(i * 5 + 101) * 6
      const size = 10 + seededRandom(i * 5 + 102) * 16
      const startOffset = seededRandom(i * 5 + 103) * 300
      const color = colors[i % colors.length]
      const y = ((frame * speed + startOffset) % (2200)) - 200
      const wobbleX = Math.sin(frame * 0.1 + i) * 20

      confetti.push(
        <div
          key={`conf-${i}`}
          style={{
            position: 'absolute',
            left: `calc(${x}% + ${wobbleX}px)`,
            top: `${y}px`,
            width: `${size}px`,
            height: `${size * 0.6}px`,
            backgroundColor: color,
            transform: `rotate(${frame * 5 + i * 40}deg)`,
            opacity: 0.9,
            borderRadius: '1px',
            pointerEvents: 'none',
          }}
        />,
      )
    }

    return (
      <>
        {children}
        {/* 黄金背景グラデ */}
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(255,220,80,0.5) 0%, rgba(255,180,0,0.3) 60%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
        <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
          {stars}
          {confetti}
        </AbsoluteFill>
      </>
    )
  }

  // ── 5. 雨 (rain) ──────────────────────────────────────
  // 参考: 青い縦線がはっきり見える（ガッカリシーン）
  if (effect === 'rain') {
    const seededRandom = (seed: number): number => {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
      return x - Math.floor(x)
    }

    const DROP_COUNT = 100
    const drops: React.ReactNode[] = []
    for (let i = 0; i < DROP_COUNT; i++) {
      const x = seededRandom(i * 2 + 1) * 100
      const speed = 10 + seededRandom(i * 2 + 2) * 15
      const height = 60 + seededRandom(i * 5) * 80
      const startOffset = seededRandom(i * 3) * 300

      const y = ((frame * speed + startOffset) % (2200)) - height

      drops.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}px`,
            width: '5px',
            height: `${height}px`,
            backgroundColor: 'rgba(100,140,220,0.8)',
            borderRadius: '2px',
            pointerEvents: 'none',
          }}
        />,
      )
    }

    return (
      <>
        {children}
        {/* 青暗い背景オーバーレイ */}
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, rgba(10,15,40,0.85) 0%, rgba(15,20,50,0.8) 100%)',
            pointerEvents: 'none',
          }}
        />
        <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
          {drops}
        </AbsoluteFill>
      </>
    )
  }

  // ── 6. 画面揺れ (shake) ────────────────────────────────
  if (effect === 'shake') {
    const amplitude = 10
    const dx = Math.sin(frame * 2.0) * amplitude
    const dy = Math.cos(frame * 2.5) * amplitude

    return (
      <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px)` }}>
        {children}
      </AbsoluteFill>
    )
  }

  return <>{children}</>
}
