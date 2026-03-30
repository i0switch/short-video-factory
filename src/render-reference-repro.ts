import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { logger } from './utils/logger'

interface ProbeStream {
  codec_type: string
  width?: number
  height?: number
  avg_frame_rate?: string
  nb_frames?: string
  duration?: string
}

interface ProbeFormat {
  duration?: string
}

interface ProbeResult {
  streams: ProbeStream[]
  format: ProbeFormat
}

function projectRoot(): string {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return path.resolve(__dirname, '..')
}

function parseFps(raw: string | undefined): number {
  if (!raw || raw === '0/0') return 30
  const [num, den] = raw.split('/').map(Number)
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 30
  return num / den
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function syncDir(sourceDir: string, destDir: string): void {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true })
  }
  ensureDir(destDir)
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name)
    const destPath = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      syncDir(sourcePath, destPath)
    } else {
      fs.copyFileSync(sourcePath, destPath)
    }
  }
}

function probeVideo(videoPath: string): ProbeResult {
  const result = execFileSync(
    'ffprobe',
    ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', videoPath],
    { encoding: 'utf-8' },
  )
  return JSON.parse(result) as ProbeResult
}

async function main() {
  const sourceVideoPath = process.argv[2]
  const workRoot = process.argv[3]
  const outputDir = process.argv[4]
  const finalizeMode = process.argv[5] ?? 'render-only'

  if (!sourceVideoPath || !workRoot || !outputDir) {
    console.error('Usage: tsx src/render-reference-repro.ts <source-video-path> <work-root> <output-dir> [render-only|source-audio|exact-copy]')
    process.exit(1)
  }

  const absSourceVideoPath = path.resolve(sourceVideoPath)
  const absWorkRoot = path.resolve(workRoot)
  const absOutputDir = path.resolve(outputDir)
  ensureDir(absOutputDir)

  const probe = probeVideo(absSourceVideoPath)
  fs.writeFileSync(
    path.join(absOutputDir, 'ffprobe_output.json'),
    JSON.stringify(probe, null, 2),
  )

  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video')
  if (!videoStream?.width || !videoStream.height) {
    throw new Error('Video stream not found in ffprobe output')
  }

  const fps = parseFps(videoStream.avg_frame_rate)
  const durationInFrames = videoStream.nb_frames
    ? Number(videoStream.nb_frames)
    : Math.round(Number(probe.format.duration ?? videoStream.duration ?? '0') * fps)

  const projectRootDir = projectRoot()
  const stagingDir = path.join(projectRootDir, 'generated', 'reference-staging')
  ensureDir(stagingDir)
  const stagedVideoPath = path.join(stagingDir, path.basename(absSourceVideoPath))
  fs.copyFileSync(absSourceVideoPath, stagedVideoPath)
  const relSourceVideo = path.relative(projectRootDir, stagedVideoPath).split(path.sep).join('/')
  const inputProps = {
    config: {
      sourceVideo: relSourceVideo,
      fps,
      width: videoStream.width,
      height: videoStream.height,
      durationInFrames,
    },
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  logger.info(`Reference source: ${absSourceVideoPath}`)
  logger.info(`Metadata: ${videoStream.width}x${videoStream.height}, ${fps.toFixed(6)}fps, ${durationInFrames}f`)

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (cfg) => cfg,
    publicDir: projectRootDir,
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ReferenceVideo',
    inputProps,
  })

  const remotionOutputPath = path.join(absOutputDir, 'output_remotion.mp4')
  const outputPath = path.join(absOutputDir, 'output.mp4')
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    crf: 1,
    outputLocation: remotionOutputPath,
    inputProps,
    onProgress: ({ progress }) => {
      logger.info(`Progress: ${Math.round(progress * 100)}%`)
    },
  })

  if (finalizeMode === 'source-audio') {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i', remotionOutputPath,
        '-i', absSourceVideoPath,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'copy',
        outputPath,
      ],
      { stdio: 'inherit' },
    )
  } else if (finalizeMode === 'exact-copy') {
    fs.copyFileSync(absSourceVideoPath, outputPath)
  } else {
    fs.copyFileSync(remotionOutputPath, outputPath)
  }

  const latestDir = path.join(path.dirname(absOutputDir), 'latest')
  syncDir(absOutputDir, latestDir)
  logger.info(`Done: ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
