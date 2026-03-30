// render-reconstruction.ts — contamination-free reference-based reconstruction renderer
//
// Contract:
// - Input directory contains: timeline.json, story.json (optional), audio.json, assets_manifest.json
// - Renderer MUST NOT read/use any source/reference mp4 as render material.
// - Any external assets are staged under repo `generated/reconstruction-staging/<stamp>/` for staticFile().
// - Output files are written back to the input directory (iteration folder).
import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { checkVoicevox, synthesize, parseWavDuration } from './services/voicevox/index'
import { getVoicevoxConfig } from './utils/config'
import { logger } from './utils/logger'
import {
  ReconstructionAssetsManifestSchema,
  ReconstructionAudioSchema,
  ReconstructionStorySchema,
  ReconstructionTimelineSchema,
} from './schema/reconstruction'
import type {
  ReconstructionAssetsManifest,
  ReconstructionAudio,
  ReconstructionAudioEntry,
  ReconstructionStory,
  ReconstructionTimeline,
} from './schema/reconstruction'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface StoryUnit {
  id: string
  speaker: 'narrator' | 'character1' | 'character2' | string
  text: string
  narration?: string
  startFrame: number
  endFrame: number
  shotId?: string
}

interface StoryJson {
  videoId: string
  seriesTitle: string
  episodeTitle: string
  fps: number
  width: number
  height: number
  units: StoryUnit[]
}

interface AudioJson {
  entries?: ReconstructionAudioEntry[]
  se?: Array<{
    id: string
    frame: number
    durationFrames?: number
    src: string
    volume?: number
  }>
  tracks?: Array<{
    id: string
    type: 'narration' | 'bgm' | 'se'
    src: string
    startFrame: number
    endFrame?: number
    volume?: number
  }>
  narrationVolume?: number
  bgmVolume?: number
  seVolume?: number
  ttsSpeed?: number
  sampleRate?: number
  bgm?: {
    src?: string
    volume?: number
    startFrame?: number
    endFrame?: number
  }
}

interface AssetsManifest {
  videoId: string
  sourceVideoAssets: Array<{ kind: string; src: string; origin?: string; note?: string }>
  generatedAssets: Array<{ kind: string; src: string; origin?: string; note?: string }>
  independentAssets: Array<{ kind: string; src: string; origin?: string; note?: string }>
  contaminationFree?: boolean
}

const SPEAKER_IDS: Record<string, number> = {
  narrator: 3, // ずんだもん
  character1: 13, // 青山龍星
  character2: 0, // 四国めたん
}

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

function safeReadJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf-8')) as T
}

function writeJson(p: string, v: unknown): void {
  writeFileSync(p, JSON.stringify(v, null, 2))
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

function projectRel(absPath: string): string {
  const projectRoot = path.resolve(__dirname, '..')
  return toPosix(path.relative(projectRoot, absPath))
}

function isLikelyReferenceMediaPath(p: string): boolean {
  const lower = p.toLowerCase()
  if (lower.includes('reference-staging')) return true
  if (lower.includes('reference-mirror')) return true
  if (lower.includes('source-audio')) return true
  return false
}

function selfAudit({
  inputDir,
  timelinePath,
  storyPath,
  audioPath,
  assetsManifestPath,
  outPath,
  auditPath,
}: {
  inputDir: string
  timelinePath: string
  storyPath: string
  audioPath: string
  assetsManifestPath: string
  outPath: string
  auditPath: string
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []

  // 1) Required files exist
  for (const p of [timelinePath, audioPath, assetsManifestPath]) {
    if (!existsSync(p)) reasons.push(`missing_file: ${p}`)
  }

  // 2) Manifest must not declare reference-derived assets
  if (existsSync(assetsManifestPath)) {
    const manifest = safeReadJson<AssetsManifest>(assetsManifestPath)
    if ((manifest.contaminationFree ?? true) === false) {
      reasons.push('assets_manifest_marked_not_contamination_free')
    }
    if ((manifest.sourceVideoAssets ?? []).length > 0) {
      reasons.push(`assets_manifest_has_source_video_assets: ${manifest.sourceVideoAssets.length}`)
    }
  }

  // 3) Guard rail: timeline/audio/story json must not reference typical reference paths
  const textBlobs: Array<{ name: string; value: string }> = []
  for (const p of [timelinePath, audioPath, storyPath].filter((x) => existsSync(x))) {
    textBlobs.push({ name: path.basename(p), value: readFileSync(p, 'utf-8') })
  }
  for (const b of textBlobs) {
    if (isLikelyReferenceMediaPath(b.value)) {
      reasons.push(`json_mentions_reference_path: ${b.name}`)
    }
  }

  const ok = reasons.length === 0
  const lines = [
    '# Self-audit: Source contamination check',
    '',
    `inputDir: ${inputDir}`,
    `timestamp: ${new Date().toISOString()}`,
    '',
    `result: ${ok ? 'PASS (contamination=0)' : 'FAIL (contamination>0)'}`,
    '',
    '## Reasons',
    ...(reasons.length ? reasons.map((r) => `- ${r}`) : ['- (none)']),
    '',
    '## Notes',
    '- This audit checks manifests and JSON references. It does not inspect binary media contents.',
    `- Output target: ${outPath}`,
    '',
  ]
  writeFileSync(auditPath, lines.join('\n'))
  return { ok, reasons }
}

function stageFile(absSrc: string, absDest: string): void {
  ensureDir(path.dirname(absDest))
  copyFileSync(absSrc, absDest)
}

function stageReferencedAssets(params: {
  inputDir: string
  stageRootAbs: string
  timeline: ReconstructionTimeline
  audio: ReconstructionAudio
}): { timeline: ReconstructionTimeline; audio: ReconstructionAudio; stagedFiles: string[] } {
  const { inputDir, stageRootAbs } = params
  const stagedFiles: string[] = []

  const stageOne = (srcMaybe: string | undefined): string | undefined => {
    if (!srcMaybe) return undefined
    // Allow paths relative to inputDir, or absolute paths.
    const absSrc = path.isAbsolute(srcMaybe)
      ? srcMaybe
      : (() => {
          const fromInput = path.resolve(inputDir, srcMaybe)
          if (existsSync(fromInput)) return fromInput
          const fromProject = path.resolve(__dirname, '..', srcMaybe)
          if (existsSync(fromProject)) return fromProject
          return fromInput
        })()
    if (!existsSync(absSrc)) {
      throw new Error(`Asset not found: ${srcMaybe} (resolved: ${absSrc})`)
    }
    // Guard rail: don't stage mp4 as a render asset in reconstruction mode.
    if (absSrc.toLowerCase().endsWith('.mp4')) {
      throw new Error(`Forbidden asset type (.mp4) in reconstruction mode: ${absSrc}`)
    }
    const relName = path.basename(absSrc)
    const absDest = path.join(stageRootAbs, 'assets', relName)
    stageFile(absSrc, absDest)
    stagedFiles.push(absDest)
    return projectRel(absDest)
  }

  const tl: ReconstructionTimeline = JSON.parse(JSON.stringify(params.timeline))

  const au: ReconstructionAudio = JSON.parse(JSON.stringify(params.audio))
  for (const t of au.entries) {
    t.src = stageOne(t.src) as string
  }
  for (const s of au.se ?? []) {
    s.src = stageOne(s.src) as string
  }
  if (au.bgm?.src) {
    au.bgm.src = stageOne(au.bgm.src) as string
  }

  return { timeline: tl, audio: au, stagedFiles }
}

function deriveLatestDir(iterDirAbs: string): { latestDirAbs: string; videoId: string } | null {
  const norm = iterDirAbs.replace(/\//g, '\\')
  const m = norm.match(/\\repro_runs\\([^\\]+)\\iter_\d+\\?$/i)
  if (!m) return null
  const videoId = m[1]
  const root = norm.slice(0, norm.toLowerCase().indexOf('\\repro_runs\\') + '\\repro_runs\\'.length - 1)
  const latestDirAbs = path.join(root, 'latest', videoId)
  return { latestDirAbs, videoId }
}

function syncLatest(iterDirAbs: string, filesToSync: string[]): void {
  const derived = deriveLatestDir(iterDirAbs)
  if (!derived) return
  ensureDir(derived.latestDirAbs)
  for (const rel of filesToSync) {
    const src = path.join(iterDirAbs, rel)
    if (!existsSync(src)) continue
    const dest = path.join(derived.latestDirAbs, rel)
    ensureDir(path.dirname(dest))
    copyFileSync(src, dest)
  }
}

function ffprobeJson(absVideoPath: string): unknown {
  const out = execSync([
    'ffprobe',
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    `"${absVideoPath}"`,
  ].join(' '), { stdio: 'pipe' }).toString('utf-8')
  return JSON.parse(out)
}

function listDirFilesRec(absDir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name)
      const st = statSync(p)
      if (st.isDirectory()) walk(p)
      else out.push(p)
    }
  }
  walk(absDir)
  return out
}

async function main() {
  const inputDirArg = process.argv[2]
  if (!inputDirArg) {
    console.error('Usage: tsx src/render-reconstruction.ts <iteration-dir>')
    process.exit(1)
  }

  const inputDir = path.resolve(process.cwd(), inputDirArg)
  if (!existsSync(inputDir)) throw new Error(`Directory not found: ${inputDir}`)

  const timelinePath = path.join(inputDir, 'timeline.json')
  const storyPath = path.join(inputDir, 'story.json')
  const audioPath = path.join(inputDir, 'audio.json')
  const assetsManifestPath = path.join(inputDir, 'assets_manifest.json')
  const auditPath = path.join(inputDir, 'self_audit_source_contamination.md')

  const outPath = path.join(inputDir, 'output.mp4')
  const ffprobeOutPath = path.join(inputDir, 'ffprobe_output.json')

  const audit = selfAudit({
    inputDir,
    timelinePath,
    storyPath,
    audioPath,
    assetsManifestPath,
    outPath,
    auditPath,
  })
  if (!audit.ok) {
    throw new Error(`Self-audit failed. See: ${auditPath}`)
  }

  const timeline = ReconstructionTimelineSchema.parse(safeReadJson<ReconstructionTimeline>(timelinePath))
  const story = existsSync(storyPath)
    ? ReconstructionStorySchema.parse(safeReadJson<StoryJson>(storyPath) as any)
    : null
  const audioRaw = safeReadJson<AudioJson>(audioPath)
  const manifest = ReconstructionAssetsManifestSchema.parse(safeReadJson<AssetsManifest>(assetsManifestPath) as any)
  const effectiveStory = (story ?? {
    videoId: timeline.videoId,
    seriesTitle: timeline.seriesTitle,
    episodeTitle: timeline.episodeTitle,
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
    units: [],
  }) as ReconstructionStory

  // Build ReconstructionAudio from either explicit entries or story-based VOICEVOX narration.
  const audio: ReconstructionAudio = {
    ttsSpeed: audioRaw.ttsSpeed ?? 1.4,
    sampleRate: audioRaw.sampleRate ?? 44100,
    entries: [],
    se: [],
    bgm: {
      src: audioRaw.bgm?.src ?? '',
      volume: audioRaw.bgm?.volume ?? audioRaw.bgmVolume ?? 0.12,
      startFrame: audioRaw.bgm?.startFrame ?? 0,
      endFrame: audioRaw.bgm?.endFrame ?? timeline.totalFrames,
    },
  }
  const defaults = {
    narrationVolume: audioRaw.narrationVolume ?? 1.0,
    bgmVolume: audioRaw.bgmVolume ?? 0.12,
    seVolume: audioRaw.seVolume ?? 1.0,
  }

  const workDir = path.resolve(__dirname, '..', 'generated', 'reconstruction', timeline.videoId)
  ensureDir(workDir)

  // If explicit tracks exist, use them as-is (vol defaults applied).
  if (audioRaw.entries && audioRaw.entries.length > 0) {
    audio.entries = audioRaw.entries.map((t) => ({
      unitId: t.unitId,
      speaker: t.speaker,
      text: t.text,
      narration: t.narration,
      src: t.src,
      durationSec: t.durationSec,
      startFrame: t.startFrame,
      endFrame: t.endFrame,
      gainDb: t.gainDb ?? 0,
    }))
    audio.se = audioRaw.se?.map((s) => ({
      id: s.id,
      frame: s.frame,
      durationFrames: s.durationFrames,
      src: s.src,
      volume: s.volume ?? defaults.seVolume,
    })) ?? []
  } else if (audioRaw.tracks && audioRaw.tracks.length > 0) {
    for (const t of audioRaw.tracks) {
      if (t.type === 'bgm') {
        audio.bgm = {
          src: t.src,
          volume: t.volume ?? defaults.bgmVolume,
          startFrame: t.startFrame,
          endFrame: t.endFrame ?? timeline.totalFrames,
        }
        continue
      }
      if (t.type === 'se') {
        audio.se.push({
          id: t.id,
          frame: t.startFrame,
          durationFrames: t.endFrame ? Math.max(1, t.endFrame - t.startFrame) : undefined,
          src: t.src,
          volume: t.volume ?? defaults.seVolume,
        })
        continue
      }
      audio.entries.push({
        unitId: t.id,
        speaker: 'narrator',
        text: t.id,
        narration: t.id,
        src: t.src,
        durationSec: 0,
        startFrame: t.startFrame,
        endFrame: t.endFrame ?? timeline.totalFrames,
        gainDb: 0,
      })
    }
  } else if (story) {
    // Auto-generate narration from story.json
    const { url, gain } = getVoicevoxConfig()
    await checkVoicevox(url)

    const ttsSpeed = audio.ttsSpeed ?? 1.4
    const ttsDir = path.join(workDir, 'tts')
    ensureDir(ttsDir)

    logger.info(`TTS: ${story.units.length} units (speed=${ttsSpeed})`)
    for (const u of story.units) {
      const speakerId = SPEAKER_IDS[u.speaker] ?? SPEAKER_IDS.narrator
      const wavAbs = path.join(ttsDir, `tts_${u.id}.wav`)
      if (!existsSync(wavAbs)) {
        const buf = await synthesize(u.narration ?? u.text, url, speakerId, gain, ttsSpeed)
        writeFileSync(wavAbs, buf)
        const dur = parseWavDuration(buf)
        logger.info(`  ${u.id}: ${dur.toFixed(2)}s "${u.narration ?? u.text}"`)
      }
      audio.entries.push({
        unitId: u.id,
        speaker: u.speaker as ReconstructionAudioEntry['speaker'],
        text: u.text,
        narration: u.narration ?? u.text,
        src: projectRel(wavAbs),
        durationSec: parseWavDuration(readFileSync(wavAbs)),
        startFrame: u.startFrame,
        endFrame: u.endFrame,
        gainDb: 0,
      })
      // Keep manifest honest: generated narration is an asset.
      if (!manifest.generatedAssets.some((a) => a.src.includes(`tts_${u.id}`))) {
        manifest.generatedAssets.push({
          kind: 'audio',
          src: projectRel(wavAbs),
          origin: 'generated.voicevox',
          note: `speaker=${u.speaker}`,
        })
      }
    }
    manifest.contaminationFree = true
    writeJson(assetsManifestPath, manifest)
  } else {
    logger.warn('No audio.entries and no story.json: rendering silent video')
  }

  // Stage assets under repo for staticFile()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const stageRootAbs = path.resolve(__dirname, '..', 'generated', 'reconstruction-staging', stamp)
  ensureDir(stageRootAbs)

  // Note: some of the generated TTS src paths above were projectRel already; normalize them to inputDir-relative if needed.
  // We keep staging generic: it resolves relative paths from inputDir, or accepts absolute paths.
  const staged = stageReferencedAssets({
    inputDir,
    stageRootAbs,
    timeline,
    audio: {
      ttsSpeed: audio.ttsSpeed,
      sampleRate: audio.sampleRate,
      entries: audio.entries.map((t) => ({
        ...t,
        // If project-relative was provided (generated under repo), turn into absolute so staging can copy.
        src: t.src.startsWith('generated/')
          ? path.resolve(__dirname, '..', t.src)
          : t.src,
      })),
      se: (audio.se ?? []).map((s) => ({
        ...s,
        src: s.src.startsWith('generated/')
          ? path.resolve(__dirname, '..', s.src)
          : s.src,
      })),
      bgm: audio.bgm,
    },
  })

  // Persist a render-ready config snapshot (debug only)
  writeJson(path.join(workDir, 'timeline_staged.json'), staged.timeline)
  writeJson(path.join(workDir, 'audio_staged.json'), staged.audio)

  logger.info('Bundling...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (cfg) => cfg,
    publicDir: path.resolve(__dirname, '..'),
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ReconstructionVideo',
    inputProps: { story: effectiveStory, timeline: staged.timeline, audio: staged.audio, assetsManifest: manifest },
  })

  const rawOutAbs = path.join(workDir, 'output_raw.mp4')
  logger.info(`Rendering: ${rawOutAbs}`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    crf: 23,
    outputLocation: rawOutAbs,
    inputProps: { story: effectiveStory, timeline: staged.timeline, audio: staged.audio, assetsManifest: manifest },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100)
      if (pct % 10 === 0) logger.info(`Progress: ${pct}%`)
    },
  })

  // Normalize audio (optional) while re-encoding video (NO stream copy).
  logger.info('Post: loudnorm + re-encode (no stream copy)')
  execSync([
    'ffmpeg', '-y',
    '-i', `"${rawOutAbs}"`,
    '-af', '"loudnorm=I=-16:TP=-1:LRA=11"',
    '-c:v', 'libx264', '-crf', '23', '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    '-color_range', 'tv',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-ar', '44100',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    `"${outPath}"`,
  ].join(' '), { stdio: 'pipe' })

  // ffprobe output
  writeJson(ffprobeOutPath, ffprobeJson(outPath))

  // Sync to latest/ if this looks like OUTPUT_ROOT style iteration dir
  syncLatest(inputDir, [
    'output.mp4',
    'analysis_new.md',
    'review_visual.md',
    'review_motion.md',
    'review_audio.md',
    'review_diff.md',
    'diff_summary.md',
    'story.json',
    'timeline.json',
    'audio.json',
    'assets_manifest.json',
    'self_audit_source_contamination.md',
    'ffprobe_reference.json',
    'ffprobe_output.json',
  ])

  // Extra: for audit/debug, list all staged files
  writeFileSync(path.join(workDir, 'staged_files.txt'), listDirFilesRec(stageRootAbs).map(toPosix).join('\n'))

  logger.info(`Done: ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
