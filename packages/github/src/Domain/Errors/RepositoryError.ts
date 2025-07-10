import { Schema } from 'effect'

/**
 * Repository specific errors
 */
export class RepositoryError extends Schema.TaggedError<RepositoryError>()(
  'RepositoryError',
  {
    message: Schema.String,
    repository: Schema.optional(Schema.String),
    operation: Schema.optional(
      Schema.Literal('list', 'get', 'create', 'update', 'delete'),
    ),
  },
) {}