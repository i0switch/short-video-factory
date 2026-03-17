/**
 * 最小有効 WAV バッファを生成する
 * @param durationSec 秒数
 * @param sampleRate サンプルレート (default: 44100)
 */
export function buildWavBuffer(durationSec: number, sampleRate = 44100): Buffer {
  const byteRate = sampleRate * 2  // 16bit mono
  const dataSize = Math.ceil(byteRate * durationSec)
  const buf = Buffer.alloc(44 + dataSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)          // chunk size
  buf.writeUInt16LE(1, 20)           // PCM
  buf.writeUInt16LE(1, 22)           // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)    // byteRate ← parseWavDuration が読む
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)   // dataSize ← parseWavDuration が読む

  return buf
}

/**
 * fmt chunkSizeが奇数のWAV (padding テスト用)
 * fmt chunkSize=17(奇数), byteRate=88200, dataSize=88200
 */
export function buildWavBufferOddChunk(): Buffer {
  // 構造: RIFF(4) + fileSize(4) + WAVE(4) + "fmt "(4) + chunkSize17(4) + 17bytes + pad(1) + "data"(4) + dataSize(4) + data
  // fmt offset=12, data offset = 12 + 8 + 17 + 1(pad) = 38
  const fmtChunkSize = 17
  const pad = fmtChunkSize % 2 !== 0 ? 1 : 0
  const dataOffset = 12 + 8 + fmtChunkSize + pad
  const dataSize = 88200
  const totalSize = dataOffset + 8 + dataSize
  const buf = Buffer.alloc(totalSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(totalSize - 8, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(fmtChunkSize, 16)
  // fmt内のbyteRate (offset 12+8+8 = 28)
  buf.writeUInt32LE(88200, 28)       // byteRate = 44100 * 2

  buf.write('data', dataOffset)
  buf.writeUInt32LE(dataSize, dataOffset + 4)

  return buf
}
