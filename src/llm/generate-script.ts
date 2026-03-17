import { ScriptSchema, type Script } from '../schema/script'
import { chatCompletion, type ChatMessage } from './client'
import { ScriptValidationError } from '../utils/errors'
import type { LlmConfig } from '../utils/config'
import { logger } from '../utils/logger'

const MAX_RETRIES = 3

function buildSystemPrompt(itemCount: number): string {
  return `あなたは短尺動画の台本作家です。
以下のJSON形式で台本を生成してください。フィールド説明に従って厳密に守ること。

JSON形式（これ以外は出力しないこと）:
{
  "videoTitle": "string, max 40文字",
  "intro": "string, max 40文字（タイトルコール）",
  "items": [
    {
      "rank": number（降順。${itemCount}位から1位まで）,
      "topic": "string, max 24文字（画面に大きく表示するお題・短く端的に）",
      "comment1": "string, 15〜20文字（視聴者コメント風・具体的な一文。例:「これやると本当に伸びる」「知らなかったは損」）",
      "comment2": "string, 15〜20文字（別の視聴者コメント・前のコメントに呼応する具体的な一文）",
      "body": "string, max 100文字（VOICEVOX読み上げ用・体験・理由を詳しく）",
      "imageKeywords": ["日本語キーワード", ...（1〜5個）],
      "imageKeywordsEn": ["English keywords", ...（1〜5個）]
    }
  ],
  "outro": "string, max 30文字（締めのコメント・コメント欄への誘導）"
}

重要なルール:
- topic は画面に大きく表示される。漢字・ひらがな混じりで短く
- comment1/comment2 は15〜20文字の具体的な一文。「わかるww」などの1〜2語は禁止。理由や感想を含む文にする
- body は画面に表示しない。VOICEVOXが読み上げる自然な文
- imageKeywordsEn は英語で（Pexels 画像検索に使用）
- items の rank は ${itemCount} から 1 まで降順で全て含める
- rank の重複は禁止`
}

export async function generateScript(
  topic: string,
  itemCount: number,
  llmConfig: LlmConfig,
): Promise<Script> {
  const { provider, apiKey, model } = llmConfig
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(itemCount) },
    { role: 'user', content: `テーマ: ${topic}` },
  ]

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    logger.info(`LLM attempt ${attempt}/${MAX_RETRIES}`)
    const raw = await chatCompletion(messages, provider, apiKey, model)
    messages.push({ role: 'assistant', content: raw })

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      logger.warn(`JSON parse failed on attempt ${attempt}`)
      if (attempt < MAX_RETRIES) {
        messages.push({ role: 'user', content: '前の応答はJSONとして解析できませんでした。有効なJSONのみを返してください。' })
      }
      continue
    }

    const result = ScriptSchema.safeParse(parsed)
    if (result.success) {
      return result.data
    }

    logger.warn(`Zod validation failed on attempt ${attempt}: ${result.error.message}`)
    if (attempt < MAX_RETRIES) {
      messages.push({
        role: 'user',
        content: `バリデーションエラー: ${result.error.message}\n上記エラーを修正してJSONを再生成してください。`,
      })
    }
  }

  throw new ScriptValidationError(`LLM script generation failed after ${MAX_RETRIES} attempts`)
}
