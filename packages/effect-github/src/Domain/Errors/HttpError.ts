import { Schema } from 'effect'

/**
 * HTTP client related errors
 */
export class HttpError extends Schema.TaggedError<HttpError>()('HttpError', {
  message: Schema.String,
  status: Schema.optional(Schema.Number),
  response: Schema.optional(Schema.String),
}) {}
