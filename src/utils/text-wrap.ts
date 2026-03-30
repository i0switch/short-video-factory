/**
 * BudouX-based Japanese text wrapping utility.
 */

interface BudouXParser {
  parse(text: string): string[]
}

let parser: BudouXParser | null = null
let parserInitialized = false

async function getParser(): Promise<BudouXParser | null> {
  if (parserInitialized) return parser
  parserInitialized = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const budoux = require('budoux') as { loadDefaultJapaneseParser: () => BudouXParser }
    parser = budoux.loadDefaultJapaneseParser()
  } catch {
    try {
      const budoux = await import('budoux')
      parser = budoux.loadDefaultJapaneseParser()
    } catch {
      parser = null
    }
  }
  return parser
}

// Sync initialization attempt (for build-time Node.js)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const budoux = require('budoux')
  if (budoux && typeof budoux.loadDefaultJapaneseParser === 'function') {
    parser = budoux.loadDefaultJapaneseParser()
    parserInitialized = true
  }
} catch {
  // Will try async later or fallback
}

/**
 * Split Japanese text into lines using BudouX word boundaries.
 * Falls back to punctuation-based splitting if BudouX is unavailable.
 */
export function wrapJapanese(
  text: string,
  maxChars = 10,
  maxLines = Infinity,
): string[] {
  // 手動改行 (\n) がある場合はまず尊重し、各セグメントごとにBudouXで分割
  const manualSegments = text.split(/\n/)
  const allLines: string[] = []

  for (const seg of manualSegments) {
    const cleaned = seg.replace(/\s+/g, '')
    if (cleaned.length === 0) continue
    if (cleaned.length <= maxChars) {
      allLines.push(cleaned)
      continue
    }

    const chunks: string[] = parser
      ? parser.parse(cleaned)
      : splitByPunctuation(cleaned)

    // Smart merge: 助詞で終わるchunkは前に結合、それ以外の短いchunkは後に結合
    const PARTICLES = 'がをにはでともへのやか'
    const merged: string[] = []
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]
      const endsWithParticle = chunk.length <= 2 && PARTICLES.includes(chunk[chunk.length - 1])
      if (merged.length > 0 && endsWithParticle && merged[merged.length - 1].length + chunk.length <= maxChars) {
        // 助詞は前のchunkに結合（「残業代」+「が」→「残業代が」）
        merged[merged.length - 1] += chunk
      } else if (chunk.length <= 2 && !endsWithParticle && ci + 1 < chunks.length) {
        // 非助詞の短いchunk（「全く」等）は次のchunkに結合
        chunks[ci + 1] = chunk + chunks[ci + 1]
      } else {
        merged.push(chunk)
      }
    }

    let current = ''
    for (const chunk of merged) {
      if (current.length + chunk.length > maxChars && current.length > 0) {
        allLines.push(current)
        current = chunk
      } else if (chunk.length > maxChars) {
        if (current.length > 0) {
          allLines.push(current)
          current = ''
        }
        for (let i = 0; i < chunk.length; i += maxChars) {
          const piece = chunk.slice(i, i + maxChars)
          if (i + maxChars < chunk.length) {
            allLines.push(piece)
          } else {
            current = piece
          }
        }
      } else {
        current += chunk
      }
    }
    if (current) allLines.push(current)
  }

  if (allLines.length === 0) return ['']

  if (allLines.length > maxLines) {
    const keep = allLines.slice(0, maxLines - 1)
    const overflow = allLines.slice(maxLines - 1).join('')
    keep.push(overflow)
    return keep
  }

  return allLines
}

/** Fallback: split at Japanese punctuation boundaries */
function splitByPunctuation(text: string): string[] {
  const tokens: string[] = []
  let buffer = ''
  for (const ch of text) {
    buffer += ch
    if ('、。！？!?）」』】〉》'.includes(ch)) {
      tokens.push(buffer)
      buffer = ''
    }
  }
  if (buffer) tokens.push(buffer)
  return tokens.length > 0 ? tokens : [text]
}

/**
 * Async version that ensures BudouX is loaded.
 * Use this in build-time (Node.js) context.
 */
export async function wrapJapaneseAsync(
  text: string,
  maxChars = 10,
  maxLines = Infinity,
): Promise<string[]> {
  if (!parserInitialized) await getParser()
  return wrapJapanese(text, maxChars, maxLines)
}

/**
 * Convenience: split and join with newline.
 */
export function wrapJapaneseToString(
  text: string,
  maxChars = 10,
  maxLines = 2,
): string {
  return wrapJapanese(text, maxChars, maxLines).join('\n')
}

/**
 * Async convenience: ensures BudouX loaded, then wraps.
 */
export async function wrapJapaneseToStringAsync(
  text: string,
  maxChars = 10,
  maxLines = 2,
): Promise<string> {
  if (!parserInitialized) await getParser()
  return wrapJapanese(text, maxChars, maxLines).join('\n')
}
