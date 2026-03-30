/**
 * fetch-repro-assets.ts
 * 不足素材を irasutoya から取得して assets/repro/EzFYQHX5ICY/ に保存する
 */
import path from 'path'
import { fetchIrasutoyaImage } from './services/image/irasutoya'

const ASSET_DIR = path.resolve('assets/repro/EzFYQHX5ICY')

const targets: Array<{
  filename: string
  keywords: string[]
  description: string
}> = [
  {
    filename: 'student_shocked_gakuran.png',
    // 学ランの男子高校生、驚き・びっくり
    keywords: ['びっくり', '高校生'],
    description: '驚く高校生男子（24s用）',
  },
  {
    filename: 'student_shocked_uniform_female.png',
    // 驚く制服女子高生
    keywords: ['びっくり', '女子高生'],
    description: '驚く女子高生（24s グループ用）',
  },
  {
    filename: 'student_nervous_gakuran.png',
    // 緊張・硬直した学ラン学生（17s用）
    keywords: ['緊張', '学生'],
    description: '緊張した学生（17s 無音用）',
  },
]

async function main() {
  console.log(`\n=== irasutoya 素材取得 ===`)
  console.log(`保存先: ${ASSET_DIR}\n`)

  const results: Array<{ filename: string; status: 'ok' | 'error'; detail: string }> = []

  for (const target of targets) {
    console.log(`\n--- ${target.description} ---`)
    console.log(`  ファイル: ${target.filename}`)
    console.log(`  キーワード: ${target.keywords.join(', ')}`)

    try {
      const dest = await fetchIrasutoyaImage(target.keywords, ASSET_DIR, target.filename)
      console.log(`  ✅ 保存: ${dest}`)
      results.push({ filename: target.filename, status: 'ok', detail: dest })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ❌ 失敗: ${msg}`)
      results.push({ filename: target.filename, status: 'error', detail: msg })
    }
  }

  console.log('\n=== 取得結果まとめ ===')
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : '❌'
    console.log(`${icon} ${r.filename}`)
  }

  const ok = results.filter((r) => r.status === 'ok').length
  const err = results.filter((r) => r.status === 'error').length
  console.log(`\n成功: ${ok}/${targets.length}  失敗: ${err}/${targets.length}`)
}

main().catch(console.error)
