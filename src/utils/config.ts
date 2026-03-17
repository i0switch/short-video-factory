import { ConfigError } from './errors'

export interface VideoConfig {
  width: number
  height: number
  fps: number
}

export function getVideoConfig(): VideoConfig {
  return {
    width: parseInt(process.env.VIDEO_WIDTH ?? '1080', 10),
    height: parseInt(process.env.VIDEO_HEIGHT ?? '1920', 10),
    fps: parseInt(process.env.VIDEO_FPS ?? '30', 10),
  }
}

export interface VoicevoxConfig {
  url: string
  speaker: number
  gain: number
}

export function getVoicevoxConfig(): VoicevoxConfig {
  return {
    url: process.env.VOICEVOX_URL ?? 'http://localhost:50021',
    speaker: parseInt(process.env.VOICEVOX_SPEAKER ?? '3', 10),
    gain: parseFloat(process.env.VOICEVOX_GAIN ?? '1.5'),
  }
}

// PEXELS_API_KEY が未設定の場合は null を返す（エラーにしない）
export function getPexelsApiKey(): string | null {
  return process.env.PEXELS_API_KEY ?? null
}

// THEME: themes/ フォルダの JSON ファイル名（拡張子なし）
export function getThemeName(): string {
  return process.env.THEME ?? 'default'
}

export interface LlmConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model: string
}

export function getLlmConfig(): LlmConfig {
  const provider = (process.env.LLM_PROVIDER ?? 'openai') as 'openai' | 'anthropic'
  const apiKey = provider === 'openai'
    ? process.env.OPENAI_API_KEY ?? ''
    : process.env.ANTHROPIC_API_KEY ?? ''
  if (!apiKey) throw new ConfigError(
    `${provider.toUpperCase()}_API_KEY が設定されていません。\n` +
    `.env ファイルに ${provider.toUpperCase()}_API_KEY=sk-... を追加してください。\n` +
    `詳細: README.md の「.env 設定方法」を参照`
  )
  const model = process.env.LLM_MODEL ?? (provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022')
  return { provider, apiKey, model }
}

