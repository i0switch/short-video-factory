import { VoicevoxError } from '../../utils/errors'

export async function checkVoicevox(url: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${url}/version`)
  } catch {
    throw new VoicevoxError(
      `VOICEVOX に接続できません (${url})\n` +
      `対処法: VOICEVOX アプリを起動してください。\n` +
      `WSL2 環境の場合は VOICEVOX_URL に Windows ホスト IP を設定してください。\n` +
      `例: VOICEVOX_URL=http://172.x.x.x:50021`
    )
  }
  if (!res.ok) {
    throw new VoicevoxError(`VOICEVOX /version returned HTTP ${res.status}`)
  }
}

export async function synthesize(
  text: string,
  url: string,
  speaker: number,
  gain: number,
  speedScale = 1.0,
): Promise<Buffer> {
  const queryRes = await fetch(
    `${url}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
    { method: 'POST' }
  )
  if (!queryRes.ok) {
    throw new VoicevoxError(`audio_query failed: HTTP ${queryRes.status}`)
  }
  const query = await queryRes.json() as Record<string, unknown>
  query.volumeScale = (query.volumeScale as number) * gain
  // 話速調整 + 前後無音短縮 + ポーズ短縮
  if (speedScale !== 1.0) query.speedScale = speedScale
  query.prePhonemeLength = 0.05    // デフォルト約0.1秒→0.05秒に短縮
  query.postPhonemeLength = 0.05   // デフォルト約0.1秒→0.05秒に短縮
  query.pauseLengthScale = 0.3     // 文間ポーズを30%に短縮 (0.5秒以下に収める)

  const synthRes = await fetch(
    `${url}/synthesis?speaker=${speaker}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    }
  )
  if (!synthRes.ok) {
    throw new VoicevoxError(`synthesis failed: HTTP ${synthRes.status}`)
  }
  return Buffer.from(await synthRes.arrayBuffer())
}

export function parseWavDuration(buffer: Buffer): number {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new VoicevoxError('Invalid WAV: missing RIFF header')
  }
  if (buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new VoicevoxError('Invalid WAV: missing WAVE marker')
  }

  let byteRate: number | null = null
  let dataSize: number | null = null
  let offset = 12

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)

    if (chunkId === 'fmt ') {
      byteRate = buffer.readUInt32LE(offset + 8 + 8)
    } else if (chunkId === 'data') {
      dataSize = chunkSize
      if (byteRate !== null) break
    }

    offset += 8 + chunkSize
    if (chunkSize % 2 !== 0) offset += 1
  }

  if (byteRate === null || dataSize === null) {
    throw new VoicevoxError('Invalid WAV: missing fmt or data chunk')
  }
  return dataSize / byteRate
}
