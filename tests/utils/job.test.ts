import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

// Mock the paths module so generatedDir() and jobDir() return temp locations
vi.mock('../../src/utils/paths', async () => {
  const os = await import('os')
  const path = await import('path')
  const tmpRoot = path.join(os.tmpdir(), 'svf-mock-generated')
  return {
    projectRoot: () => os.tmpdir(),
    generatedDir: () => tmpRoot,
    jobDir: (timestamp: string) => path.join(tmpRoot, 'jobs', timestamp),
    fixturesDir: () => path.join(os.tmpdir(), 'fixtures'),
    fallbackImages: () => [],
  }
})

import { promoteToLatest, createJobDir } from '../../src/utils/job'

let tmpDir: string
let sourceDir: string
let mockGeneratedDir: string

beforeEach(() => {
  // Create a fresh temp directory for each test
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svf-test-'))
  sourceDir = path.join(tmpDir, 'source')
  fs.mkdirSync(sourceDir)
  fs.writeFileSync(path.join(sourceDir, 'output.mp4'), 'dummy')

  // The mocked generatedDir returns this path
  mockGeneratedDir = path.join(os.tmpdir(), 'svf-mock-generated')
  // Ensure it's clean before each test
  if (fs.existsSync(mockGeneratedDir)) {
    fs.rmSync(mockGeneratedDir, { recursive: true, force: true })
  }
  fs.mkdirSync(mockGeneratedDir, { recursive: true })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  if (fs.existsSync(mockGeneratedDir)) {
    fs.rmSync(mockGeneratedDir, { recursive: true, force: true })
  }
})

describe('promoteToLatest', () => {
  // TC-080: latestDir 非存在 → 作成+コピー
  it('TC-080: latestDir 非存在 → 作成+コピー', async () => {
    const latestDir = path.join(mockGeneratedDir, 'latest')
    // Ensure latestDir does not exist
    expect(fs.existsSync(latestDir)).toBe(false)

    await promoteToLatest(sourceDir)

    expect(fs.existsSync(latestDir)).toBe(true)
    expect(fs.existsSync(path.join(latestDir, 'output.mp4'))).toBe(true)
  })

  // TC-081: latestDir 存在 → 削除→再作成 (old file gone)
  it('TC-081: latestDir 存在 → 削除→再作成 (old file gone)', async () => {
    const latestDir = path.join(mockGeneratedDir, 'latest')
    // Pre-create latestDir with an old file
    fs.mkdirSync(latestDir, { recursive: true })
    fs.writeFileSync(path.join(latestDir, 'old.txt'), 'old content')
    expect(fs.existsSync(path.join(latestDir, 'old.txt'))).toBe(true)

    await promoteToLatest(sourceDir)

    // output.mp4 should be present
    expect(fs.existsSync(path.join(latestDir, 'output.mp4'))).toBe(true)
    // old.txt should be gone
    expect(fs.existsSync(path.join(latestDir, 'old.txt'))).toBe(false)
  })
})

describe('createJobDir', () => {
  // TC-082: createJobDir → returns YYYYMMDD-HHmmss format path
  it('TC-082: createJobDir → YYYYMMDD-HHmmss 形式パスを返す', async () => {
    const dir = await createJobDir()

    // The returned path basename should match YYYYMMDD-HHmmss
    const basename = path.basename(dir)
    expect(basename).toMatch(/^\d{8}-\d{6}$/)

    // The directory should actually exist
    expect(fs.existsSync(dir)).toBe(true)
  })
})
