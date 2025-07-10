import type { AuthError } from './AuthError.js'
import type { HttpError } from './HttpError.js'
import type { ApiError } from './ApiError.js'
import type { RepositoryError } from './RepositoryError.js'
import type { NotificationError } from './NotificationError.js'
import type { ConfigError } from './ConfigError.js'

/**
 * Union type of all GitHub SDK errors
 */
export type SDKError =
  | AuthError
  | HttpError
  | ApiError
  | RepositoryError
  | NotificationError
  | ConfigError
