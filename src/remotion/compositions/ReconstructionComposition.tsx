import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion'
import { wrapJapaneseToString } from '../../utils/text-wrap'
import type {
  ReconstructionAssetsManifest,
  ReconstructionAudio,
  ReconstructionStory,
  ReconstructionTimeline,
  ReconstructionStoryUnit,
} from '../../schema/reconstruction'

type Props = {
  story: ReconstructionStory
  timeline: ReconstructionTimeline
  audio: ReconstructionAudio
  assetsManifest: ReconstructionAssetsManifest
}

const SPEAKER_COLORS: Record<string, string> = {
  narrator: '#4B8DF7',
  character1: '#48D26F',
  character2: '#FF5C7A',
}

type PersonExpression = 'happy' | 'worry' | 'shock'

export const ReconstructionComposition: React.FC<Props> = ({
  story,
  timeline,
  audio,
  assetsManifest,
}) => {
  const sourceSafe = assetsManifest.contaminationFree && assetsManifest.sourceVideoAssets.length === 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TopTitleBand seriesTitle={timeline.seriesTitle} episodeTitle={timeline.episodeTitle} />

      {timeline.shots.map((shot) => {
        const durationInFrames = Math.max(0, shot.endFrame - shot.startFrame)
        if (durationInFrames <= 0) return null
        return (
          <Sequence
            key={shot.id}
            from={shot.startFrame}
            durationInFrames={durationInFrames}
          >
            <ShotFrame shot={shot} story={story} timeline={timeline} />
          </Sequence>
        )
      })}

      {audio.bgm?.src && audio.bgm.endFrame > audio.bgm.startFrame && (
        <Sequence
          from={audio.bgm.startFrame}
          durationInFrames={Math.max(1, audio.bgm.endFrame - audio.bgm.startFrame)}
        >
          <Audio
            src={staticFile(audio.bgm.src)}
            startFrom={0}
            endAt={Math.max(1, audio.bgm.endFrame - audio.bgm.startFrame)}
            volume={audio.bgm.volume}
          />
        </Sequence>
      )}

      {audio.entries.map((entry) => {
        const durationFrames = Math.max(1, entry.endFrame - entry.startFrame)
        if (!entry.src) return null
        const gain = Math.pow(10, (entry.gainDb ?? 0) / 20)
        return (
          <Sequence
            key={entry.unitId}
            from={entry.startFrame}
            durationInFrames={durationFrames}
          >
            <Audio
              src={staticFile(entry.src)}
              startFrom={0}
              endAt={durationFrames}
              volume={gain}
            />
          </Sequence>
        )
      })}

      {audio.se?.map((se) => (
        <Sequence
          key={se.id}
          from={se.frame}
          durationInFrames={se.durationFrames ?? Math.max(1, timeline.totalFrames - se.frame)}
        >
          <Audio
            src={staticFile(se.src)}
            startFrom={0}
            endAt={se.durationFrames ?? Math.max(1, timeline.totalFrames - se.frame)}
            volume={se.volume}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

const ShotFrame: React.FC<{
  shot: ReconstructionTimeline['shots'][number]
  story: ReconstructionStory
  timeline: ReconstructionTimeline
}> = ({ shot, story, timeline }) => {
  const frame = useCurrentFrame()
  const activeUnit = getActiveUnit(story.units, shot.startFrame + frame)
  const currentSpeaker = activeUnit?.speaker ?? shot.caption?.speaker ?? 'narrator'
  const speakerColor = SPEAKER_COLORS[currentSpeaker] ?? '#FFFFFF'
  const captionText = activeUnit?.text ?? shot.caption?.text ?? ''
  const captionColor = speakerColor
  const captionX = shot.caption?.x ?? 24
  const captionY = shot.caption?.y ?? 240
  const captionWidth = shot.caption?.width ?? 1032
  const captionAlign = shot.caption?.align ?? 'left'
  const expression = getExpressionForFrame(timeline, frame, shot)

  return (
    <AbsoluteFill>
      <BackgroundLayer kind={shot.background.kind} tone={shot.background.tone} frame={frame} />
      <CameraMotionLayer camera={shot.camera}>
        <AbsoluteFill style={{ opacity: shot.camera.opacity }}>
          <CharacterLayer
            shot={shot}
            expression={expression}
          />
          <CaptionLayer
            text={wrapJapaneseToString(captionText, 10, 2)}
            speakerColor={speakerColor}
            color={captionColor}
            left={captionX}
            top={captionY}
            width={captionWidth}
            align={captionAlign}
          />
        </AbsoluteFill>
      </CameraMotionLayer>
      <ScreenFXLayer effect={shot.effect} frame={frame} />
    </AbsoluteFill>
  )
}

function getActiveUnit(units: ReconstructionStoryUnit[], absoluteFrame: number): ReconstructionStoryUnit | undefined {
  return units.find((unit) => absoluteFrame >= unit.startFrame && absoluteFrame < unit.endFrame)
}

function getExpressionForFrame(
  timeline: ReconstructionTimeline,
  frame: number,
  shot: ReconstructionTimeline['shots'][number],
): PersonExpression {
  const absoluteFrame = shot.startFrame + frame
  const cues = timeline.cues ?? []
  const exprCues = cues.filter((cue) => cue.type === 'character_expression_change' && (cue.payload as Record<string, unknown> | undefined)?.shotId === shot.id)
  let current: PersonExpression = normalizeExpression(shot.character.emotion)
  for (const cue of exprCues) {
    if (absoluteFrame >= cue.frame) {
      current = normalizeExpression(String((cue.payload as Record<string, unknown> | undefined)?.expression ?? current))
    }
  }
  return current
}

function normalizeExpression(value: string): PersonExpression {
  if (value === 'shock' || value === 'shocked') return 'shock'
  if (value === 'worry' || value === 'confused' || value === 'crying' || value === 'neutral') return 'worry'
  return 'happy'
}

const BackgroundLayer: React.FC<{ kind: string; tone: string; frame: number }> = ({ kind, tone, frame }) => {
  const cloudShift = Math.sin(frame * 0.03) * 2
  const skyGradient = tone === 'warm'
    ? 'linear-gradient(180deg, #FFF1B8 0%, #F7D993 32%, #E7C98F 100%)'
    : 'linear-gradient(180deg, #DCEEFF 0%, #C6E4FF 40%, #9ED0FF 100%)'

  if (kind === 'reaction') {
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0C0C0C 0%, #000 100%)' }}>
        <ReactionBackdrop />
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill style={{ background: skyGradient }}>
      <Cloud x={96 + cloudShift * 8} y={160} scale={1} />
      <Cloud x={780 - cloudShift * 4} y={210} scale={0.82} />
      <ParkCastle />
      <RollerCoasterTrack />
      <GroundBand />
      {kind === 'park_intro' && <CoasterCar />}
    </AbsoluteFill>
  )
}

const Cloud: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 190 * scale,
      height: 110 * scale,
      borderRadius: '999px',
      background: 'rgba(255,255,255,0.9)',
      filter: 'blur(1px)',
    }}
  />
)

const ParkCastle: React.FC = () => (
  <div style={{ position: 'absolute', right: 42, top: 245, width: 300, height: 520 }}>
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 40,
        width: 210,
        height: 360,
        borderRadius: 26,
        background: '#F4F7FA',
        border: '6px solid #7A8DAA',
        overflow: 'hidden',
        boxShadow: '0 20px 30px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.32), transparent 55%)' }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 24 + i * 54,
            top: 78,
            width: 28,
            height: 56,
            borderRadius: 12,
            background: '#84AEE8',
            border: '5px solid #5C7CA5',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 0,
          width: 54,
          height: 108,
          background: '#D8E4EF',
          borderLeft: '6px solid #7A8DAA',
          borderRight: '6px solid #7A8DAA',
          borderTop: '6px solid #7A8DAA',
          borderRadius: '18px 18px 0 0',
        }}
      />
    </div>
    <Roof x={158} top={0} width={108} height={92} />
    <Roof x={118} top={108} width={92} height={78} />
    <Flag x={191} top={-18} />
  </div>
)

const Roof: React.FC<{ x: number; top: number; width: number; height: number }> = ({ x, top, width, height }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top,
      width,
      height,
      background: '#1976D2',
      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
      filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.18))',
    }}
  />
)

const Flag: React.FC<{ x: number; top: number }> = ({ x, top }) => (
  <div style={{ position: 'absolute', left: x, top }}>
    <div style={{ width: 5, height: 28, background: '#2E7D32' }} />
    <div
      style={{
        position: 'absolute',
        left: 5,
        top: 1,
        width: 18,
        height: 14,
        background: '#4CAF50',
        clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
      }}
    />
  </div>
)

const RollerCoasterTrack: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0 }}>
    <div
      style={{
        position: 'absolute',
        left: -76,
        top: 550,
        width: 640,
        height: 240,
        borderTop: '14px solid #8A6132',
        borderRadius: '55% 55% 0 0',
        transform: 'rotate(-10deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: -40,
        top: 405,
        width: 360,
        height: 360,
        borderRadius: '50%',
        border: '16px solid rgba(138,97,50,0.44)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: -12,
        top: 440,
        width: 302,
        height: 302,
        borderRadius: '50%',
        border: '12px dashed rgba(180,150,120,0.62)',
      }}
    />
  </div>
)

const GroundBand: React.FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 370,
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(102,176,92,0.34) 26%, rgba(73,150,68,0.9) 100%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 128,
        bottom: 110,
        width: 470,
        height: 180,
        borderRadius: 52,
        background: 'rgba(255,255,255,0.16)',
      }}
    />
  </>
)

const CoasterCar: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 72,
      top: 920,
      width: 772,
      height: 430,
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 104,
        top: 140,
        width: 560,
        height: 170,
        borderRadius: 42,
        background: 'linear-gradient(180deg, #FFD95B 0%, #F4B12D 100%)',
        border: '10px solid #222',
        boxShadow: '0 16px 30px rgba(0,0,0,0.18)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: 176,
        width: 160,
        height: 112,
        borderRadius: '50% 50% 28% 28%',
        background: 'linear-gradient(180deg, #FFD95B 0%, #F4B12D 100%)',
        border: '10px solid #222',
        transform: 'rotate(-8deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 8,
        top: 110,
        width: 258,
        height: 210,
        borderRadius: '50%',
        border: '14px solid rgba(122,122,122,0.72)',
        borderLeftColor: 'transparent',
        borderTopColor: 'transparent',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 48,
        top: 146,
        width: 188,
        height: 188,
        borderRadius: '50%',
        border: '12px dashed rgba(122,122,122,0.72)',
      }}
    />
    {[
      { x: 128, hair: '#552B16', mouth: 'flat' as const },
      { x: 250, hair: '#462110', mouth: 'smile' as const },
      { x: 366, hair: '#351607', mouth: 'smile' as const },
      { x: 486, hair: '#5A3318', mouth: 'smile' as const },
      { x: 610, hair: '#3A1E0F', mouth: 'smile' as const },
    ].map((kid, index) => (
      <HeadFigure
        key={index}
        left={kid.x}
        top={108}
        hair={kid.hair}
        mouth={kid.mouth}
        expression="happy"
        scale={0.92}
      />
    ))}
  </div>
)

const HeadFigure: React.FC<{
  left: number
  top: number
  hair: string
  mouth: 'smile' | 'flat' | 'open'
  expression: 'happy' | 'worry' | 'shock'
  scale: number
}> = ({ left, top, hair, mouth, expression, scale }) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: 92,
      height: 122,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 6,
        top: 2,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: '#F5C79D',
        border: '7px solid #222',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: -1,
        width: 68,
        height: 32,
        borderRadius: '50% 50% 18% 18%',
        background: hair,
      }}
    />
    <div style={{ position: 'absolute', left: 26, top: 30, width: 9, height: 9, borderRadius: '50%', background: '#222' }} />
    <div style={{ position: 'absolute', left: 54, top: 30, width: 9, height: 9, borderRadius: '50%', background: '#222' }} />
    <div
      style={{
        position: 'absolute',
        left: 34,
        top: mouth === 'open' ? 55 : 60,
        width: mouth === 'open' ? 24 : 20,
        height: mouth === 'open' ? 20 : 8,
        borderRadius: mouth === 'open' ? '50%' : '999px',
        background: mouth === 'open' ? '#C53030' : '#B55B5B',
        transform: mouth === 'flat' ? 'rotate(180deg)' : 'none',
      }}
    />
    {expression !== 'happy' && (
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 34,
          width: 12,
          height: 18,
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(22deg)',
          background: '#9ED9FF',
          border: '2px solid rgba(0,0,0,0.12)',
        }}
      />
    )}
  </div>
)

const CharacterLayer: React.FC<{
  shot: ReconstructionTimeline['shots'][number]
  expression: PersonExpression
}> = ({ shot, expression }) => {
  const kind = shot.character.kind
  const opacity = shot.character.opacity
  const scale = shot.character.scale
  const x = shot.character.x
  const y = shot.character.y

  if (kind === 'none') return null

  if (kind === 'queue_car') {
    return <CoasterCar />
  }

  if (kind === 'boy_single') {
    return (
      <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
        <GrandpaChildScene
          variant="boy_only"
          left={x}
          top={y}
          scale={scale}
          grandpaExpression={expression}
          childExpression={expression === 'shock' ? 'shock' : 'happy'}
        />
      </AbsoluteFill>
    )
  }

  if (kind === 'grandpa_son' || kind === 'grandpa_closeup') {
    return (
      <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
        <GrandpaChildScene
          variant={kind === 'grandpa_closeup' ? 'closeup' : 'default'}
          left={x}
          top={y}
          scale={scale}
          grandpaExpression={expression}
          childExpression={expression === 'shock' ? 'shock' : expression === 'worry' ? 'worry' : 'happy'}
        />
      </AbsoluteFill>
    )
  }

  return null
}

const GrandpaChildScene: React.FC<{
  variant: 'default' | 'closeup' | 'boy_only'
  left: number
  top: number
  scale: number
  grandpaExpression: 'happy' | 'worry' | 'shock'
  childExpression: 'happy' | 'worry' | 'shock'
}> = ({ variant, left, top, scale, grandpaExpression, childExpression }) => {
  const grandpaX = variant === 'closeup' ? left + 100 : left + 0
  const childX = variant === 'boy_only' ? left + 118 : left + 220
  const baseTop = variant === 'closeup' ? 640 + top : 700 + top
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: `translateX(-50%) scale(${scale})`,
        width: 1080,
        height: 1920,
      }}
    >
        <CartoonPerson
          label="おじいさん"
          left={grandpaX}
          top={baseTop}
          headSize={variant === 'closeup' ? 280 : 220}
          bodyWidth={variant === 'closeup' ? 300 : 240}
          bodyHeight={variant === 'closeup' ? 380 : 320}
          shirtColor="#5F8A42"
          hairColor="#B9B1A6"
          expression={grandpaExpression}
          eyesClosed={grandpaExpression === 'happy'}
        />
      {variant !== 'boy_only' && (
        <CartoonPerson
          label="孫"
          left={childX}
          top={baseTop + (variant === 'closeup' ? 60 : 56)}
          headSize={variant === 'closeup' ? 148 : 126}
          bodyWidth={variant === 'closeup' ? 160 : 140}
          bodyHeight={variant === 'closeup' ? 210 : 180}
          shirtColor="#3E86D8"
          hairColor="#1E1E1E"
          expression={childExpression}
          eyesClosed={false}
        />
      )}
    </div>
  )
}

const CartoonPerson: React.FC<{
  label: string
  left: number
  top: number
  headSize: number
  bodyWidth: number
  bodyHeight: number
  shirtColor: string
  hairColor: string
  expression: 'happy' | 'worry' | 'shock'
  eyesClosed: boolean
}> = ({
  label,
  left,
  top,
  headSize,
  bodyWidth,
  bodyHeight,
  shirtColor,
  hairColor,
  expression,
  eyesClosed,
}) => {
  const bodyLeft = left - bodyWidth / 2
  const headLeft = left - headSize / 2
  const headTop = top
  const bodyTop = top + headSize - 20

  return (
    <div style={{ position: 'absolute', left: bodyLeft, top: headTop, width: bodyWidth, height: bodyHeight + headSize + 70 }}>
      <div
        style={{
          position: 'absolute',
          left: bodyWidth / 2 - bodyWidth * 0.26,
          top: headSize * 0.7,
          width: bodyWidth * 0.52,
          height: bodyHeight,
          background: shirtColor,
          border: '6px solid #222',
          borderRadius: 28,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: headLeft,
          top: headTop,
          width: headSize,
          height: headSize,
          borderRadius: '50%',
          background: '#F5C79D',
          border: '7px solid #222',
          boxShadow: '0 10px 16px rgba(0,0,0,0.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: headLeft + 10,
          top: headTop - 2,
          width: headSize - 20,
          height: headSize * 0.42,
          background: hairColor,
          borderRadius: '50% 50% 18% 18%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: headLeft + 34,
          top: headTop + 58,
          width: 12,
          height: eyesClosed ? 3 : 9,
          borderRadius: '999px',
          background: '#222',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: headLeft + headSize - 46,
          top: headTop + 58,
          width: 12,
          height: eyesClosed ? 3 : 9,
          borderRadius: '999px',
          background: '#222',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: headLeft + headSize / 2 - 14,
          top: headTop + (expression === 'shock' ? 88 : 95),
          width: expression === 'shock' ? 28 : 24,
          height: expression === 'shock' ? 28 : 12,
          borderRadius: expression === 'shock' ? '50%' : '999px',
          background: expression === 'happy' ? '#C14D4D' : expression === 'worry' ? '#B14242' : '#D33',
        }}
      />
      {expression === 'worry' && (
        <div
          style={{
            position: 'absolute',
            left: headLeft + headSize + 10,
            top: headTop + 58,
            width: 16,
            height: 22,
            borderRadius: '50% 50% 50% 0',
            background: '#A8DBFF',
            transform: 'rotate(18deg)',
          }}
        />
      )}
    </div>
  )
}

const CaptionLayer: React.FC<{
  text: string
  color: string
  speakerColor: string
  left: number
  top: number
  width: number
  align: 'left' | 'center' | 'right'
}> = ({ text, color, speakerColor, left, top, width, align }) => {
  if (!text) return null
  const fontSize = text.length > 18 ? 58 : text.length > 12 ? 64 : 72
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 20 }}>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
        }}
      >
        <div
          style={{
            width: 6,
            height: 40,
            borderRadius: 3,
            marginBottom: 12,
            backgroundColor: speakerColor,
            boxShadow: `0 0 10px ${speakerColor}`,
          }}
        />
        <div
          style={{
            fontSize,
            fontWeight: 900,
            color,
            WebkitTextStroke: color.toUpperCase().startsWith('#FF') && !color.toUpperCase().startsWith('#FFF') ? '6px #FFFFFF' : '6px #000000',
            paintOrder: 'stroke fill',
            lineHeight: 1.35,
            textAlign: align,
            whiteSpace: 'pre-line',
            textShadow: '3px 3px 10px rgba(0,0,0,0.55)',
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  )
}

const TopTitleBand: React.FC<{ seriesTitle: string; episodeTitle: string }> = ({ seriesTitle, episodeTitle }) => {
  const title = wrapJapaneseToString(seriesTitle, 8, 2)
  const subtitle = wrapJapaneseToString(episodeTitle, 10, 2)
  return (
    <AbsoluteFill style={{ zIndex: 30, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 180,
          background: 'rgba(0,0,0,0.9)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 70,
              fontWeight: 900,
              color: '#FFD84D',
              WebkitTextStroke: '6px #000000',
              paintOrder: 'stroke fill',
              textShadow: '0 0 18px rgba(255,216,77,0.55)',
              lineHeight: 1.05,
              textAlign: 'center',
              whiteSpace: 'pre-line',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: '#FFD84D',
              WebkitTextStroke: '5px #000000',
              paintOrder: 'stroke fill',
              textShadow: '0 0 12px rgba(255,216,77,0.45)',
              lineHeight: 1.05,
              textAlign: 'center',
              whiteSpace: 'pre-line',
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

const ReactionBackdrop: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 34%, rgba(255,255,255,0.08), transparent 40%)' }} />
    <div style={{ position: 'absolute', left: 60, top: 230, width: 960, height: 1360, borderRadius: 60, border: '10px solid rgba(255,255,255,0.04)' }} />
  </AbsoluteFill>
)

const CameraMotionLayer: React.FC<{ camera: { x: number; y: number; scale: number; rotate: number; opacity: number }; children: React.ReactNode }> = ({ camera, children }) => {
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale}) rotate(${camera.rotate}deg)`,
        transformOrigin: '50% 50%',
      }}
    >
      {children}
    </AbsoluteFill>
  )
}

const ScreenFXLayer: React.FC<{ effect: ReconstructionTimeline['shots'][number]['effect']; frame: number }> = ({ effect, frame }) => {
  if (!effect || effect === 'none') return null
  if (effect === 'shake') {
    const dx = Math.sin(frame * 0.7) * 8
    const dy = Math.cos(frame * 1.1) * 8
    return <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px)` }} />
  }
  return null
}

export default ReconstructionComposition
