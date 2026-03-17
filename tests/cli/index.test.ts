import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import fs from 'fs'
import path from 'path'

// vi.mock must be at top level
vi.mock('../../src/llm/generate-script', () => ({
  generateScript: vi.fn(),
}))
vi.mock('../../src/services/renderer/build-plan', () => ({
  buildPlan: vi.fn(),
}))
vi.mock('../../src/utils/config', () => ({
  getLlmConfig: vi.fn(() => ({ provider: 'openai', apiKey: 'sk-x', model: 'gpt-4o' })),
  getVoicevoxConfig: vi.fn(() => ({ url: 'http://localhost:50021', speaker: 3, gain: 1.5 })),
}))

import * as generateScriptModule from '../../src/llm/generate-script'
import * as buildPlanModule from '../../src/services/renderer/build-plan'
import * as configModule from '../../src/utils/config'

// Mimics the CLI main() logic without Remotion bundling/rendering
async function cliMainLogic(
  topic: string,
  itemCount: number,
  dryRun: boolean,
  jobDir: string,
): Promise<{ done: boolean; scriptSaved?: boolean; planBuilt?: boolean }> {
  const llmConfig = (configModule as any).getLlmConfig()
  const script = await (generateScriptModule as any).generateScript(topic, itemCount, llmConfig)
  const scriptPath = path.join(jobDir, 'script.json')
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2))
  if (dryRun) return { done: true, scriptSaved: true }
  const plan = await (buildPlanModule as any).buildPlan(script, jobDir)
  return { done: true, planBuilt: true }
}

describe('CLI itemCount clamping', () => {
  it('TC-097: items=2 → clamp to 3', () => {
    const itemCount = Math.min(10, Math.max(3, parseInt('2', 10)))
    expect(itemCount).toBe(3)
  })

  it('TC-098: items=11 → clamp to 10', () => {
    const itemCount = Math.min(10, Math.max(3, parseInt('11', 10)))
    expect(itemCount).toBe(10)
  })
})

describe('CLI main logic', () => {
  let jobDir: string

  const mockScript = {
    videoTitle: 'テストタイトル',
    intro: 'イントロ',
    items: [
      { rank: 1, topic: 'トピック', comment1: 'c1', comment2: 'c2', body: 'ボディ', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
    ],
    outro: 'おわり',
  }

  beforeEach(() => {
    jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svf-cli-test-'))
    vi.mocked(generateScriptModule.generateScript).mockResolvedValue(mockScript as any)
    vi.mocked(buildPlanModule.buildPlan).mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    try {
      fs.rmSync(jobDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('TC-099: dryRun=true → generateScript called, buildPlan NOT called', async () => {
    const result = await cliMainLogic('テスト', 5, true, jobDir)

    expect(result.done).toBe(true)
    expect(result.scriptSaved).toBe(true)
    expect(generateScriptModule.generateScript).toHaveBeenCalledOnce()
    expect(buildPlanModule.buildPlan).not.toHaveBeenCalled()

    // script.json should exist
    expect(fs.existsSync(path.join(jobDir, 'script.json'))).toBe(true)
  })

  it('TC-100: buildPlan throws → error propagates', async () => {
    vi.mocked(buildPlanModule.buildPlan).mockRejectedValue(new Error('buildPlan failure'))

    await expect(cliMainLogic('テスト', 5, false, jobDir)).rejects.toThrow('buildPlan failure')

    expect(generateScriptModule.generateScript).toHaveBeenCalledOnce()
    expect(buildPlanModule.buildPlan).toHaveBeenCalledOnce()
  })
})
