import path from 'path'
import { fetchIrasutoyaImage } from './services/image/irasutoya'

const ASSET_DIR = path.resolve('assets/repro/lLBcGh4DZ8A')

const targets = [
  { filename: 'woman_excited.png', keywords: ['万歳', '女性'], description: '万歳する女性（妻・喜び爆発）' },
  { filename: 'grandma_normal.png', keywords: ['おばあさん', '立つ'], description: 'おばあちゃん（百貫キャラ）' },
  { filename: 'birthday_cake.png', keywords: ['誕生日', 'ケーキ'], description: '誕生日ケーキ' },
  { filename: 'cake_box.png', keywords: ['ケーキ', '箱'], description: 'ケーキ箱' },
  { filename: 'library_staff_angry.png', keywords: ['司書', '怒り'], description: '図書館職員（怒り）' },
  { filename: 'library_staff_normal.png', keywords: ['司書', '女性'], description: '図書館職員（通常）' },
  { filename: 'bookmark.png', keywords: ['しおり', '本'], description: 'しおり' },
]

async function main() {
  console.log(`\n=== lLBcGh4DZ8A 素材取得 ===`)
  for (const t of targets) {
    console.log(`\n--- ${t.description} ---`)
    try {
      const dest = await fetchIrasutoyaImage(t.keywords, ASSET_DIR, t.filename)
      console.log(`  ✅ ${dest}`)
    } catch (e: unknown) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

main().catch(console.error)
