import { Schema } from 'effect'

/**
 * API request related errors
 */
export class ApiError extends Schema.TaggedError<ApiError>()(
  'ApiError',
  {
    message: Schema.String,
    status: Schema.Number,
    endpoint: Schema.String,
    response: Schema.optional(Schema.String),
  },
) {}