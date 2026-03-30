/**
 * lLBcGh4DZ8A 素材取得 v2
 * 分析書に基づいて正確なキャラクターを取得:
 * - 図書館職員: 緑エプロンの女性（男性は誤り）
 * - おばあちゃん: 普通に座った高齢女性（車椅子は不適切）
 */
import path from 'path'
import { fetchIrasutoyaImage } from './services/image/irasutoya'

const ASSET_DIR = path.resolve('assets/repro/lLBcGh4DZ8A')

const targets = [
  // === キャラクター（全取得し直し）===
  {
    filename: 'woman_excited.png',
    keywords: ['万歳', '女性'],
    description: '万歳する女性（妻・喜び爆発）',
  },
  {
    filename: 'grandma_normal.png',
    keywords: ['おばあさん', '読書'],
    description: 'おばあちゃん（図書館で読書・百貫キャラ）',
  },
  {
    filename: 'library_staff_normal.png',
    keywords: ['司書', '女性'],
    description: '図書館司書・女性（通常）',
  },
  {
    filename: 'library_staff_angry.png',
    keywords: ['司書', '注意'],
    description: '図書館司書・女性（怒り・注意）',
  },
  // === 小道具 ===
  {
    filename: 'birthday_cake.png',
    keywords: ['誕生日', 'ケーキ'],
    description: '誕生日ケーキ',
  },
  {
    filename: 'cake_box.png',
    keywords: ['ケーキ', '箱'],
    description: 'ケーキ箱',
  },
]

async function main() {
  console.log(`\n=== lLBcGh4DZ8A 素材取得 v2 ===`)
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
