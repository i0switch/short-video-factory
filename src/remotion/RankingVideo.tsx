import React from 'react'
import { Sequence } from 'remotion'
import { RenderPlan } from '../schema/render-plan'
import { EndingScene } from './EndingScene'
import { RankingScene } from './RankingScene'
import { TitleScene } from './TitleScene'

interface RankingVideoProps {
  plan: RenderPlan
}

export const RankingVideo: React.FC<RankingVideoProps> = ({ plan }) => {
  let offset = 0

  return (
    <>
      {plan.scenes.map((scene, i) => {
        const from = offset
        offset += scene.durationInFrames
        return (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames}>
            {scene.type === 'title' && <TitleScene scene={scene} />}
            {scene.type === 'ranking' && <RankingScene scene={scene} />}
            {scene.type === 'ending' && <EndingScene scene={scene} />}
          </Sequence>
        )
      })}
    </>
  )
}
