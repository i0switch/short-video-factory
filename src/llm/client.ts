import { ConfigError } from '../utils/errors'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatCompletion(
  messages: ChatMessage[],
  provider: 'openai' | 'anthropic',
  apiKey: string,
  model: string,
): Promise<string> {
  if (provider === 'openai') {
    return callOpenAI(messages, apiKey, model)
  } else {
    return callAnthropic(messages, apiKey, model)
  }
}

async function callOpenAI(messages: ChatMessage[], apiKey: string, model: string): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new ConfigError(`OpenAI API error ${res.status}: ${text}`)
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content
}

async function callAnthropic(messages: ChatMessage[], apiKey: string, model: string): Promise<string> {
  const systemMsg = messages[0]?.role === 'system' ? messages[0].content : undefined
  const userMessages = systemMsg ? messages.slice(1) : messages

  const body: Record<string, unknown> = {
    model,
    max_tokens: 2048,
    messages: userMessages.map(m => ({ role: m.role, content: m.content })),
  }
  if (systemMsg) body.system = systemMsg

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new ConfigError(`Anthropic API error ${res.status}: ${text}`)
  }
  const data = await res.json() as { content: Array<{ text: string }> }
  let text = data.content[0].text

  // ```json...``` ブロックを剥がす
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) text = match[1].trim()

  return text
}
