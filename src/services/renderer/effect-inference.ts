// effect-inference.ts — ルールベースのエフェクト自動選択
// 台本テキスト + emotion から最適なエフェクトを推論する
// 手動指定 (effect !== 'none') は常に優先される

import type { TwoChEffect, TwoChEmotion } from '../../schema/twoch-script'

/** テキストパターン → エフェクト (先にマッチした方が優先) */
const TEXT_EFFECT_RULES: Array<{ pattern: RegExp; effect: TwoChEffect }> = [
  // 衝撃・爆発系 → lightning
  { pattern: /ドン|バン|爆発|衝撃|落下|崩壊|まじか|信じられ|え[！!]+/, effect: 'lightning' },
  // 怒り・叫び系 → concentration_lines
  { pattern: /怒鳴|叫|ふざけ|なんで|やめろ|集中|本気|決め|ガチ|おい[！!]/, effect: 'concentration_lines' },
  // 成功・キラキラ系 → sparkle
  { pattern: /きらきら|キラキラ|輝|成功|やった|合格|優勝|最高|完璧|おめでと/, effect: 'sparkle' },
  // 悲しみ・雨系 → rain
  { pattern: /雨|濡|涙|泣[いくき]|悲し|つらい|残念|絶望/, effect: 'rain' },
  // 混乱系 → vortex
  { pattern: /グルグル|ぐるぐる|混乱|わけわから|頭が|パニック|どういうこと/, effect: 'vortex' },
  // 震え・恐怖系 → shake
  { pattern: /震え|揺れ|ガタガタ|恐[ろい]|ゾッ|ブルブル|ヤバ/, effect: 'shake' },
]

/** emotion → エフェクトのフォールバック (テキストマッチがない場合のみ) */
const EMOTION_EFFECT_MAP: Partial<Record<TwoChEmotion, TwoChEffect>> = {
  shock: 'lightning',
  anger: 'concentration_lines',
  happy: 'sparkle',
  sad: 'rain',
  confusion: 'vortex',
}

/**
 * 台本テキストと感情からエフェクトを推論する
 * - currentEffect が 'none' でない場合は手動指定としてそのまま返す
 * - テキストパターンマッチ → emotion フォールバックの順で推論
 * - neutral emotion はエフェクトなし (テンポを保つため)
 */
export function inferEffect(
  text: string,
  emotion: TwoChEmotion,
  currentEffect: TwoChEffect,
): TwoChEffect {
  if (currentEffect !== 'none') return currentEffect

  for (const rule of TEXT_EFFECT_RULES) {
    if (rule.pattern.test(text)) return rule.effect
  }

  return EMOTION_EFFECT_MAP[emotion] ?? 'none'
}
