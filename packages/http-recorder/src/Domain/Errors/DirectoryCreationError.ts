/**
 * @since 1.0.0
 */
import { Schema } from 'effect'

/**
 * @since 1.0.0
 * @category errors
 */
export class DirectoryCreationError extends Schema.TaggedError<DirectoryCreationError>()(
  'DirectoryCreationError',
  {
    message: Schema.String,
    directoryPath: Schema.String,
    cause: Schema.String,
  },
) {}
