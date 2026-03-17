import { describe, it, expect } from 'vitest'
import { parseWavDuration } from '../../../src/services/voicevox/index'
import { buildWavBuffer, buildWavBufferOddChunk } from '../../helpers/wavBuilder'
import { VoicevoxError } from '../../../src/utils/errors'

describe('parseWavDuration', () => {
  // TC-028: 1秒のWAVバッファ → 1.0秒
  it('TC-028: 1秒のWAVバッファを正確にパースする', () => {
    const buf = buildWavBuffer(1.0)
    expect(parseWavDuration(buf)).toBeCloseTo(1.0, 2)
  })

  // TC-029: 5秒のWAVバッファ → 5.0秒
  it('TC-029: 5秒のWAVバッファを正確にパースする', () => {
    const buf = buildWavBuffer(5.0)
    expect(parseWavDuration(buf)).toBeCloseTo(5.0, 2)
  })

  // TC-030: RIFFヘッダーなし → VoicevoxError 'missing RIFF header'
  it('TC-030: RIFFヘッダーがない場合はVoicevoxErrorをthrowする', () => {
    const buf = buildWavBuffer(1.0)
    buf.write('XXXX', 0)
    expect(() => parseWavDuration(buf)).toThrow(VoicevoxError)
    expect(() => parseWavDuration(buf)).toThrow('missing RIFF header')
  })

  // TC-031: WAVEマーカーなし → VoicevoxError 'missing WAVE marker'
  it('TC-031: WAVEマーカーがない場合はVoicevoxErrorをthrowする', () => {
    const buf = buildWavBuffer(1.0)
    buf.write('XXXX', 8)
    expect(() => parseWavDuration(buf)).toThrow(VoicevoxError)
    expect(() => parseWavDuration(buf)).toThrow('missing WAVE marker')
  })

  // TC-032: dataチャンクのみ（fmtなし）→ VoicevoxError 'missing fmt or data chunk'
  it('TC-032: fmtチャンクがない場合はVoicevoxErrorをthrowする', () => {
    const dataSize = 100
    const buf = Buffer.alloc(12 + 8 + dataSize)
    buf.write('RIFF', 0)
    buf.writeUInt32LE(buf.length - 8, 4)
    buf.write('WAVE', 8)
    buf.write('data', 12)
    buf.writeUInt32LE(dataSize, 16)
    expect(() => parseWavDuration(buf)).toThrow(VoicevoxError)
    expect(() => parseWavDuration(buf)).toThrow('missing fmt or data chunk')
  })

  // TC-033: fmtチャンクのみ（dataなし）→ VoicevoxError 'missing fmt or data chunk'
  it('TC-033: dataチャンクがない場合はVoicevoxErrorをthrowする', () => {
    const buf = Buffer.alloc(12 + 8 + 16)
    buf.write('RIFF', 0)
    buf.writeUInt32LE(buf.length - 8, 4)
    buf.write('WAVE', 8)
    buf.write('fmt ', 12)
    buf.writeUInt32LE(16, 16)
    buf.writeUInt32LE(88200, 28) // byteRate at offset 12+8+8=28
    expect(() => parseWavDuration(buf)).toThrow(VoicevoxError)
    expect(() => parseWavDuration(buf)).toThrow('missing fmt or data chunk')
  })

  // TC-034: 空バッファ → VoicevoxError
  it('TC-034: 空バッファの場合はVoicevoxErrorをthrowする', () => {
    const buf = Buffer.alloc(0)
    expect(() => parseWavDuration(buf)).toThrow(VoicevoxError)
  })

  // TC-035: fmtChunkSize=17（奇数）→ パディングを正しく処理して成功
  it('TC-035: fmtチャンクサイズが奇数のとき1バイトパディングを適用して正常パースする', () => {
    const buf = buildWavBufferOddChunk()
    // dataSize=88200, byteRate=88200 → 1.0秒
    expect(parseWavDuration(buf)).toBeCloseTo(1.0, 2)
  })

  // TC-036: fmtChunkSize=16（偶数）→ パディングなし、通常パース
  it('TC-036: fmtチャンクサイズが偶数のときパディングなしで正常パースする', () => {
    const buf = buildWavBuffer(2.0)
    // buildWavBuffer uses chunkSize=16 (even)
    expect(parseWavDuration(buf)).toBeCloseTo(2.0, 2)
  })
})
