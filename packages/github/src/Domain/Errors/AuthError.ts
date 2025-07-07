import { Schema } from 'effect'

/**
 * Authentication related errors
 */
export class AuthError extends Schema.TaggedError<AuthError>()(
  'AuthError',
  {
    message: Schema.String,
    type: Schema.optional(
      Schema.Literal('invalid_config', 'missing_token', 'app_not_implemented'),
    ),
  },
) {}