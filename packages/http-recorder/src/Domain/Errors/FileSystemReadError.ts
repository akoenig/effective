/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category errors
 */
export class FileSystemReadError extends Schema.TaggedError<FileSystemReadError>()(
  "FileSystemReadError",
  {
    message: Schema.String,
    path: Schema.String,
    operation: Schema.String,
    cause: Schema.String,
  },
) {}