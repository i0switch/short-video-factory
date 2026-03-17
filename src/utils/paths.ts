import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function projectRoot(): string {
  return path.resolve(__dirname, '..', '..')
}

export function fallbackImages(): string[] {
  const root = projectRoot()
  return [
    path.join(root, 'assets', 'fallback', 'generic_01.png'),
    path.join(root, 'assets', 'fallback', 'generic_02.png'),
    path.join(root, 'assets', 'fallback', 'generic_03.png'),
  ]
}

export function fixturesDir(): string {
  return path.join(projectRoot(), 'fixtures')
}

export function generatedDir(): string {
  return path.join(projectRoot(), 'generated')
}

export function jobDir(timestamp: string): string {
  return path.join(generatedDir(), 'jobs', timestamp)
}
