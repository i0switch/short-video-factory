import path from 'path'
import { fetchIrasutoyaImage } from './services/image/irasutoya'

const dir = path.resolve('assets/repro/lLBcGh4DZ8A')

async function main() {
  // girlfriend_annoyed: 呆れ顔の女性
  console.log('--- girlfriend_annoyed ---')
  try {
    const r = await fetchIrasutoyaImage(['呆れ', '女性'], dir, 'girlfriend_annoyed.png')
    console.log('OK', path.basename(r))
  } catch (e) {
    console.log('NG', String(e))
  }

  // toast_hand: トーストを持つ・食べる
  console.log('--- toast_hand ---')
  try {
    const r = await fetchIrasutoyaImage(['食パン', '食べる', '朝食'], dir, 'toast_hand.png')
    console.log('OK', path.basename(r))
  } catch (e) {
    console.log('NG', String(e))
  }
}

main().catch(console.error)
