import fs from 'fs'
import path from 'path'
import { fallbackImages } from '../../utils/paths'

export function copyFallbackImage(jobDir: string, filename: string): string {
  const sources = fallbackImages()
  const src = sources[Math.floor(Math.random() * sources.length)]
  const dest = path.join(jobDir, filename)
  fs.copyFileSync(src, dest)
  return dest
}
