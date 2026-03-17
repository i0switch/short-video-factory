export class ConfigError extends Error {
  name = 'ConfigError' as const
  constructor(message: string) { super(message) }
}

export class VoicevoxError extends Error {
  name = 'VoicevoxError' as const
  constructor(message: string) { super(message) }
}

export class ScriptValidationError extends Error {
  name = 'ScriptValidationError' as const
  constructor(message: string) { super(message) }
}

export class AssetFetchError extends Error {
  name = 'AssetFetchError' as const
  constructor(message: string) { super(message) }
}

export class RenderError extends Error {
  name = 'RenderError' as const
  constructor(message: string) { super(message) }
}

export class JobError extends Error {
  name = 'JobError' as const
  constructor(message: string) { super(message) }
}
