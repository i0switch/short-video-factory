import fs from 'fs'
import path from 'path'
import { generatedDir, jobDir } from './paths'
import { JobError } from './errors'

function getTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('') + '-' + [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

export async function createJobDir(): Promise<string> {
  const timestamp = getTimestamp()
  const dir = jobDir(timestamp)
  try {
    fs.mkdirSync(dir, { recursive: true })
    return dir
  } catch (e) {
    throw new JobError(`Failed to create job directory: ${dir}`)
  }
}

export async function promoteToLatest(sourceDir: string): Promise<void> {
  const latestDir = path.join(generatedDir(), 'latest')
  try {
    if (fs.existsSync(latestDir)) {
      fs.rmSync(latestDir, { recursive: true, force: true })
    }
    fs.mkdirSync(latestDir, { recursive: true })
    const files = fs.readdirSync(sourceDir)
    for (const file of files) {
      fs.copyFileSync(
        path.join(sourceDir, file),
        path.join(latestDir, file)
      )
    }
  } catch (e) {
    throw new JobError(`Failed to promote to latest: ${e}`)
  }
}
