/**
 * lLBcGh4DZ8A 競技化彼氏 素材取得
 * 実際の動画内容: 彼氏の朝の支度を実況する競技スポーツ形式
 */
import path from 'path'
import { fetchIrasutoyaImage } from './services/image/irasutoya'

const ASSET_DIR = path.resolve('assets/repro/lLBcGh4DZ8A')

const targets = [
  // === 人物キャラクター ===
  {
    filename: 'commentator.png',
    keywords: ['実況', 'アナウンサー', 'マイク'],
    description: '実況者（ヘッドセット・興奮してる）',
  },
  {
    filename: 'businessman_normal.png',
    keywords: ['ビジネスマン', 'スーツ', '男性'],
    description: 'スーツ姿の彼氏（出勤準備完了）',
  },
  {
    filename: 'boyfriend_annoyed.png',
    keywords: ['男性', '怒る', '四つん這い'],
    description: '彼氏（マイナス点でキレてる）',
  },
  {
    filename: 'girlfriend_annoyed.png',
    keywords: ['女性', 'あきれる', '呆れる'],
    description: '彼女（ツッコミ・呆れ顔）',
  },
  {
    filename: 'boyfriend_smug.png',
    keywords: ['男性', '得意', 'ドヤ顔'],
    description: '彼氏（エコアピール・ドヤ顔）',
  },
  // === 小道具 ===
  {
    filename: 'toaster_toast.png',
    keywords: ['トースター', '食パン'],
    description: 'トースター（食パン飛び出し）',
  },
  {
    filename: 'toast_hand.png',
    keywords: ['食パン', '持つ', '手'],
    description: 'トーストを持った手',
  },
  {
    filename: 'toothbrush.png',
    keywords: ['歯ブラシ', '歯磨き'],
    description: '歯ブラシ',
  },
  {
    filename: 'trophy.png',
    keywords: ['トロフィー', '優勝'],
    description: 'トロフィー（優勝）',
  },
  {
    filename: 'globe.png',
    keywords: ['地球', 'エコ'],
    description: '地球（エコ意識シーン）',
  },
]

async function main() {
  console.log(`\n=== 競技化彼氏 素材取得 ===`)
  console.log(`出力先: ${ASSET_DIR}\n`)

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
