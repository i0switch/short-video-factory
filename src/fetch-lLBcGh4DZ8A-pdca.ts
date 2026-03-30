/**
 * lLBcGh4DZ8A PDCA素材追加取得
 */
import path from 'path'
import { fetchIrasutoyaImage } from './services/image/irasutoya'

const ASSET_DIR = path.resolve('assets/repro/lLBcGh4DZ8A')

const targets = [
  // 彼氏カジュアル（キッチンシーン用）
  {
    filename: 'boyfriend_casual.png',
    keywords: ['男性', 'カジュアル', '走る'],
    description: '彼氏カジュアル（走り・移動）',
  },
  // 彼氏カジュアル怒り（ペナルティシーン）
  {
    filename: 'boyfriend_angry_casual.png',
    keywords: ['男性', '怒る', 'カジュアル'],
    description: '彼氏カジュアル怒り顔',
  },
  // 彼氏カジュアル万歳（着替えフェーズ）
  {
    filename: 'boyfriend_banzai.png',
    keywords: ['男性', '万歳', 'カジュアル'],
    description: '彼氏両手上げ（着替えフェーズ）',
  },
  // 蛇口（水道最小限シーン）
  {
    filename: 'faucet.png',
    keywords: ['蛇口', '水道', '節水'],
    description: '蛇口（節水シーン）',
  },
  // 食パン1枚（手に取ったシーン）
  {
    filename: 'toast_slice.png',
    keywords: ['食パン', 'トースト', '一枚'],
    description: '食パン1枚スライス',
  },
  // スーツ男性タブレット（玄関チェックシーン）
  {
    filename: 'businessman_tablet.png',
    keywords: ['ビジネスマン', 'タブレット', 'チェック'],
    description: 'スーツ男性タブレット持ち（持ち物確認）',
  },
  // 歯磨き粉出しすぎ
  {
    filename: 'toothbrush_paste.png',
    keywords: ['歯磨き粉', '歯ブラシ', '多い'],
    description: '歯磨き粉出しすぎ歯ブラシ',
  },
]

async function main() {
  console.log(`\n=== lLBcGh4DZ8A PDCA素材取得 ===`)

  let success = 0
  let failed = 0

  for (const t of targets) {
    console.log(`\n--- ${t.description} ---`)
    try {
      const dest = await fetchIrasutoyaImage(t.keywords, ASSET_DIR, t.filename)
      console.log(`  ✅ ${path.basename(dest)}`)
      success++
    } catch (e: unknown) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`)
      failed++
    }
  }

  console.log(`\n=== 完了: ${success}件成功 / ${failed}件失敗 ===`)
}

main().catch(console.error)
