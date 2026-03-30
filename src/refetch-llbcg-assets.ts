/**
 * lLBcGh4DZ8A 問題素材の再取得
 * - boyfriend_casual: 単独男性（カジュアル服）
 * - toothbrush: 歯ブラシ単体
 * - toast_slice: 食パン1枚スライス（四角い断面）
 */
import path from 'path'
import { fetchIrasutoyaImage } from './services/image/irasutoya'

const ASSET_DIR = path.resolve('assets/repro/lLBcGh4DZ8A')

const targets = [
  {
    filename: 'toothbrush.png',
    keywords: ['歯磨き', '歯ブラシ', '道具'],
    description: '歯ブラシ道具',
  },
  {
    filename: 'toast_slice.png',
    keywords: ['トースト', '食パン'],
    description: 'トースト食パン',
  },
]

async function main() {
  console.log('\n=== 問題素材 再取得 ===')
  for (const t of targets) {
    console.log(`\n--- ${t.description} ---`)
    try {
      const dest = await fetchIrasutoyaImage(t.keywords, ASSET_DIR, t.filename)
      console.log(`  OK: ${path.basename(dest)}`)
    } catch (e: unknown) {
      console.log(`  NG: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  console.log('\n=== Done ===')
}

main().catch(console.error)
