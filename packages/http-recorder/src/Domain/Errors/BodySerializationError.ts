/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category errors
 */
export class BodySerializationError extends Schema.TaggedError<BodySerializationError>()(
  "BodySerializationError",
  {
    message: Schema.String,
    bodyType: Schema.String,
    cause: Schema.String,
  },
) {}
