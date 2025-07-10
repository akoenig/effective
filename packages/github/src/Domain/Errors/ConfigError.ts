import { Schema } from 'effect'

/**
 * Configuration related errors
 */
export class ConfigError extends Schema.TaggedError<ConfigError>()(
  'ConfigError',
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
  },
) {}
