// prop-inference.ts — テキスト・キーワードからプロップ素材を自動推論
// シーンの内容から「キャラ以外に画面に出すべき物体」を推論し、
// いらすとや検索用のキーワードを返す

export interface PropSuggestion {
  keywordsJa: string[]   // いらすとや検索用 (日本語)
  keywordsEn: string[]   // Pexels検索用 (英語)
  position: 'left' | 'right' | 'top-right' | 'top-left'
}

/** 人物系キーワード (プロップとして抽出しない) */
const PERSON_KEYWORDS = new Set([
  '男', '女', '男性', '女性', '男の子', '女の子', '人', '人物',
  '先生', '生徒', 'お父さん', 'お母さん', '子供', '赤ちゃん',
  '上司', '部下', '同僚', '友達', '彼氏', '彼女', '夫婦',
  '店員', '客', '医者', '看護師', '警察',
])

/** テキストから物体名詞を抽出するパターン → [日本語キーワード, 英語キーワード] */
const OBJECT_PATTERNS: Array<{ pattern: RegExp; ja: string[]; en: string[] }> = [
  // 食べ物
  { pattern: /ケーキ|誕生日ケーキ/, ja: ['ケーキ'], en: ['birthday cake'] },
  { pattern: /ラーメン/, ja: ['ラーメン'], en: ['ramen'] },
  { pattern: /カレー/, ja: ['カレーライス'], en: ['curry rice'] },
  { pattern: /ハンバーグ/, ja: ['ハンバーグ'], en: ['hamburger steak'] },
  { pattern: /弁当/, ja: ['お弁当'], en: ['bento box'] },
  { pattern: /寿司|すし/, ja: ['寿司'], en: ['sushi'] },
  { pattern: /ピザ/, ja: ['ピザ'], en: ['pizza'] },
  { pattern: /パン|食パン/, ja: ['パン'], en: ['bread'] },
  { pattern: /おにぎり/, ja: ['おにぎり'], en: ['rice ball'] },
  { pattern: /コーヒー|珈琲/, ja: ['コーヒー'], en: ['coffee'] },
  { pattern: /ビール|酒/, ja: ['ビール'], en: ['beer'] },
  // 日用品
  { pattern: /スマホ|携帯|電話/, ja: ['スマートフォン'], en: ['smartphone'] },
  { pattern: /パソコン|PC|ノートPC/, ja: ['パソコン'], en: ['laptop computer'] },
  { pattern: /本|教科書|参考書/, ja: ['本', '読書'], en: ['book'] },
  { pattern: /手紙|ラブレター/, ja: ['手紙'], en: ['letter'] },
  { pattern: /時計/, ja: ['時計'], en: ['clock'] },
  { pattern: /鍵|カギ/, ja: ['鍵'], en: ['key'] },
  { pattern: /傘/, ja: ['傘'], en: ['umbrella'] },
  { pattern: /財布/, ja: ['財布'], en: ['wallet'] },
  { pattern: /レジ|会計/, ja: ['レジ'], en: ['cash register'] },
  // 乗り物
  { pattern: /車|自動車/, ja: ['車'], en: ['car'] },
  { pattern: /自転車/, ja: ['自転車'], en: ['bicycle'] },
  { pattern: /電車/, ja: ['電車'], en: ['train'] },
  // 動物
  { pattern: /猫|ネコ/, ja: ['猫'], en: ['cat'] },
  { pattern: /犬|イヌ/, ja: ['犬'], en: ['dog'] },
  // その他
  { pattern: /花束|花/, ja: ['花束'], en: ['bouquet'] },
  { pattern: /指輪|リング/, ja: ['指輪'], en: ['ring'] },
  { pattern: /プレゼント|贈り物/, ja: ['プレゼント'], en: ['gift box'] },
  { pattern: /刀|剣/, ja: ['刀'], en: ['sword'] },
  { pattern: /ゲーム/, ja: ['ゲーム', 'コントローラー'], en: ['game controller'] },
  { pattern: /テレビ|TV/, ja: ['テレビ'], en: ['television'] },
  { pattern: /お金|札束|万札/, ja: ['お金'], en: ['money'] },
  { pattern: /薬|錠剤/, ja: ['薬'], en: ['medicine'] },
]

/**
 * シーンのテキストとキーワードからプロップを推論する
 * @returns 最大2つのプロップ提案 (見つからなければ空配列)
 */
export function inferProps(
  text: string,
  imageKeywords: string[],
  speaker: string,
): PropSuggestion[] {
  const suggestions: PropSuggestion[] = []

  // 1. テキストからオブジェクトパターンをスキャン
  for (let i = 0; i < OBJECT_PATTERNS.length && suggestions.length < 2; i++) {
    const rule = OBJECT_PATTERNS[i]
    if (rule.pattern.test(text)) {
      suggestions.push({
        keywordsJa: rule.ja,
        keywordsEn: rule.en,
        position: getPosition(suggestions.length, speaker),
      })
    }
  }

  // 2. imageKeywords から人物系を除外して物体キーワードを抽出
  if (suggestions.length < 2) {
    const objectKeywords = imageKeywords.filter(
      kw => !PERSON_KEYWORDS.has(kw) && !isPerson(kw)
    )
    for (const kw of objectKeywords) {
      if (suggestions.length >= 2) break
      // 既にテキストパターンで同じものを拾ってないか確認
      const alreadySuggested = suggestions.some(s =>
        s.keywordsJa.some(ja => kw.includes(ja) || ja.includes(kw))
      )
      if (!alreadySuggested) {
        suggestions.push({
          keywordsJa: [kw],
          keywordsEn: [],  // imageKeywordsEn は呼び出し側で補完
          position: getPosition(suggestions.length, speaker),
        })
      }
    }
  }

  return suggestions
}

/** speakerに応じてプロップの配置位置を決定 */
function getPosition(
  index: number,
  speaker: string,
): 'left' | 'right' | 'top-right' | 'top-left' {
  // キャラは基本中央なので、プロップは左右に配置
  if (index === 0) {
    // 1つ目: speaker がcharacter2(右寄り) なら左、それ以外は右
    return speaker === 'character2' ? 'top-left' : 'top-right'
  }
  // 2つ目: 1つ目の反対側
  return speaker === 'character2' ? 'top-right' : 'top-left'
}

/** 人物を表すキーワードかどうかのヒューリスティック判定 */
function isPerson(keyword: string): boolean {
  return /人|者|さん|くん|ちゃん|氏|様|嬢|殿|師/.test(keyword)
}
