import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { logger } from './utils/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function parseFraction(value: string | undefined, fallback = 30): number {
  if (!value) return fallback
  if (value.includes('/')) {
    const [num, den] = value.split('/').map((part) => Number(part))
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) return num / den
    return fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readProbeJson(sourcePath: string): {
  duration: number
  fps: number
  width: number
  height: number
} {
  const json = execFileSync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    sourcePath,
  ], { encoding: 'utf8' })
  const parsed = JSON.parse(json) as {
    format: { duration?: string }
    streams: Array<{
      codec_type?: string
      avg_frame_rate?: string
      width?: number
      height?: number
    }>
  }
  const videoStream = parsed.streams.find((stream) => stream.codec_type === 'video')
  if (!videoStream) throw new Error(`No video stream found in ${sourcePath}`)
  return {
    duration: Number(parsed.format.duration ?? '0'),
    fps: parseFraction(videoStream.avg_frame_rate, 30),
    width: videoStream.width ?? 1080,
    height: videoStream.height ?? 1920,
  }
}

async function main() {
  const sourceArg = process.argv[2]
  const outputDirArg = process.argv[3]

  if (!sourceArg || !outputDirArg) {
    console.error('Usage: tsx src/render-reference.ts <source-video> <output-dir>')
    process.exit(1)
  }

  const sourcePath = path.resolve(sourceArg)
  const outputDir = path.resolve(outputDirArg)
  fs.mkdirSync(outputDir, { recursive: true })

  const probe = readProbeJson(sourcePath)
  const targetFps = 30
  const durationInFrames = Math.round(probe.duration * targetFps)
  const playbackRate = probe.duration / (durationInFrames / targetFps)

  logger.info(`Source: ${sourcePath}`)
  logger.info(`Probe: duration=${probe.duration.toFixed(6)}s fps=${probe.fps.toFixed(6)} size=${probe.width}x${probe.height}`)
  logger.info(`Render target: ${durationInFrames}f @ ${targetFps}fps, playbackRate=${playbackRate.toFixed(6)}`)

  const assetDir = path.resolve(__dirname, '..', 'generated', 'reference-mirror')
  fs.mkdirSync(assetDir, { recursive: true })
  const copiedSourcePath = path.join(assetDir, 'reference-source.mp4')
  fs.copyFileSync(sourcePath, copiedSourcePath)

  const sourceVideoSrc = path.relative(path.resolve(__dirname, '..'), copiedSourcePath).split(path.sep).join('/')

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (cfg) => cfg,
    publicDir: path.resolve(__dirname, '..'),
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ReferenceMirror',
    inputProps: {
      config: {
        sourceVideoSrc,
        durationInFrames,
        playbackRate,
      },
    },
  })

  const tempOutputPath = path.join(outputDir, 'output_temp.mp4')
  logger.info(`Rendering to ${tempOutputPath}...`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    crf: 1,
    outputLocation: tempOutputPath,
    inputProps: {
      config: {
        sourceVideoSrc,
        durationInFrames,
        playbackRate,
      },
    },
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0) {
        logger.info(`Progress: ${Math.round(progress * 100)}%`)
      }
    },
  })

  const finalOutputPath = path.join(outputDir, 'output.mp4')
  fs.copyFileSync(tempOutputPath, finalOutputPath)
  fs.rmSync(tempOutputPath, { force: true })

  logger.info(`Done! ${finalOutputPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
