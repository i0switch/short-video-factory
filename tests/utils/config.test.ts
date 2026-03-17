import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getLlmConfig } from '../../src/utils/config'
import { ConfigError } from '../../src/utils/errors'

const ENV_KEYS = ['LLM_PROVIDER', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'LLM_MODEL'] as const
const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  ENV_KEYS.forEach(k => {
    savedEnv[k] = process.env[k]
    delete process.env[k]
  })
})

afterEach(() => {
  ENV_KEYS.forEach(k => {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  })
})

describe('getLlmConfig', () => {
  // TC-049: openai + KEY正常 → {provider:'openai', apiKey:'sk-xxx', model:'gpt-4o'}
  it('TC-049: openai + KEY正常', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'sk-xxx'
    const cfg = getLlmConfig()
    expect(cfg.provider).toBe('openai')
    expect(cfg.apiKey).toBe('sk-xxx')
    expect(cfg.model).toBe('gpt-4o')
  })

  // TC-050: openai + KEY未設定 → throw ConfigError containing 'OPENAI_API_KEY'
  it('TC-050: openai + KEY未設定 → ConfigError', () => {
    process.env.LLM_PROVIDER = 'openai'
    // OPENAI_API_KEY is not set (deleted in beforeEach)
    expect(() => getLlmConfig()).toThrow(ConfigError)
    expect(() => getLlmConfig()).toThrow('OPENAI_API_KEY')
  })

  // TC-051: anthropic + KEY正常 → {provider:'anthropic', model:'claude-3-5-sonnet-20241022'}
  it('TC-051: anthropic + KEY正常', () => {
    process.env.LLM_PROVIDER = 'anthropic'
    process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx'
    const cfg = getLlmConfig()
    expect(cfg.provider).toBe('anthropic')
    expect(cfg.apiKey).toBe('sk-ant-xxx')
    expect(cfg.model).toBe('claude-3-5-sonnet-20241022')
  })

  // TC-052: anthropic + KEY未設定 → throw ConfigError containing 'ANTHROPIC_API_KEY'
  it('TC-052: anthropic + KEY未設定 → ConfigError', () => {
    process.env.LLM_PROVIDER = 'anthropic'
    // ANTHROPIC_API_KEY is not set (deleted in beforeEach)
    expect(() => getLlmConfig()).toThrow(ConfigError)
    expect(() => getLlmConfig()).toThrow('ANTHROPIC_API_KEY')
  })

  // TC-053: LLM_MODEL指定 → model='custom-model'
  it('TC-053: LLM_MODEL 指定あり', () => {
    process.env.LLM_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'sk-xxx'
    process.env.LLM_MODEL = 'custom-model'
    const cfg = getLlmConfig()
    expect(cfg.model).toBe('custom-model')
  })

  // TC-054: LLM_PROVIDER未設定 → provider='openai'
  it('TC-054: LLM_PROVIDER未設定 → デフォルト openai', () => {
    // LLM_PROVIDER is not set (deleted in beforeEach)
    process.env.OPENAI_API_KEY = 'sk-xxx'
    const cfg = getLlmConfig()
    expect(cfg.provider).toBe('openai')
  })
})
