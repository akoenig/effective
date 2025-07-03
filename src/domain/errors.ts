import { Schema } from 'effect';

/**
 * GitHub SDK specific error types using Schema.TaggedError
 */

/**
 * Authentication related errors
 */
export class GitHubAuthError extends Schema.TaggedError<GitHubAuthError>()(
  'GitHubAuthError',
  {
    message: Schema.String,
    type: Schema.optional(
      Schema.Literal('invalid_config', 'missing_token', 'app_not_implemented')
    ),
  }
) {}

/**
 * HTTP client related errors
 */
export class GitHubHttpError extends Schema.TaggedError<GitHubHttpError>()(
  'GitHubHttpError',
  {
    message: Schema.String,
    status: Schema.optional(Schema.Number),
    response: Schema.optional(Schema.String),
  }
) {}

/**
 * API request related errors
 */
export class GitHubApiError extends Schema.TaggedError<GitHubApiError>()(
  'GitHubApiError',
  {
    message: Schema.String,
    status: Schema.Number,
    endpoint: Schema.String,
    response: Schema.optional(Schema.String),
  }
) {}

/**
 * Repository specific errors
 */
export class GitHubRepositoryError extends Schema.TaggedError<GitHubRepositoryError>()(
  'GitHubRepositoryError',
  {
    message: Schema.String,
    repository: Schema.optional(Schema.String),
    operation: Schema.optional(
      Schema.Literal('list', 'get', 'create', 'update', 'delete')
    ),
  }
) {}

/**
 * Notification specific errors
 */
export class GitHubNotificationError extends Schema.TaggedError<GitHubNotificationError>()(
  'GitHubNotificationError',
  {
    message: Schema.String,
    notificationId: Schema.optional(Schema.String),
    operation: Schema.optional(
      Schema.Literal('list', 'mark_read', 'mark_all_read', 'get_thread')
    ),
  }
) {}

/**
 * Configuration related errors
 */
export class GitHubConfigError extends Schema.TaggedError<GitHubConfigError>()(
  'GitHubConfigError',
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
  }
) {}

/**
 * Union type of all GitHub SDK errors
 */
export type GitHubSDKError =
  | GitHubAuthError
  | GitHubHttpError
  | GitHubApiError
  | GitHubRepositoryError
  | GitHubNotificationError
  | GitHubConfigError;