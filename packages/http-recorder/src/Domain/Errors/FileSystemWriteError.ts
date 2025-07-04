/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category errors
 */
export class FileSystemWriteError extends Schema.TaggedError<FileSystemWriteError>()(
  "FileSystemWriteError",
  {
    message: Schema.String,
    filePath: Schema.String,
    operation: Schema.String,
    cause: Schema.String,
  },
) {}