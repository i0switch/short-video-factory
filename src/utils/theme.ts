import fs from 'fs'
import path from 'path'
import { projectRoot } from './paths'

export interface Theme {
  name: string
  sunburst: { color1: string; color2: string; angleDeg: number }
  text: {
    titleFontSize: number
    rankFontSize: number
    headingFontSize: number
    fontWeight: number
    defaultColor: string
    highlightColor: string
    strokeWidth: string
    strokeColor: string
  }
  rankText: { color: string; strokeColor: string }
  titleLines: { evenColor: string; oddColor: string }
  endingText: { color: string }
  headingBox: {
    background: string
    borderColor: string
    borderWidth: number
    borderRadius: number
    paddingVertical: number
    paddingHorizontal: number
    textColor: string
  }
  commentBox2: {
    background: string
    textColor: string
    borderRadius: number
    paddingVertical: number
    paddingHorizontal: number
    fontSize: number
  }
  image: {
    title: { maxWidth: number; maxHeight: number }
    ranking: { maxWidth: number; maxHeight: number }
  }
  timing: {
    introDurationSec: number
    outroDurationSec: number
    scenePaddingSec: number
    minRankingDurationSec: number
  }
}

export function loadTheme(themeName: string = 'default'): Theme {
  const themePath = path.join(projectRoot(), 'themes', `${themeName}.json`)
  if (!fs.existsSync(themePath)) {
    throw new Error(`Theme not found: ${themeName} (looked at ${themePath})`)
  }
  return JSON.parse(fs.readFileSync(themePath, 'utf-8')) as Theme
}

export function listThemes(): string[] {
  const dir = path.join(projectRoot(), 'themes')
  if (!fs.existsSync(dir)) return ['default']
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
}
