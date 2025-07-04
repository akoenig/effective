/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category errors
 */
export class TransactionSerializationError extends Schema.TaggedError<TransactionSerializationError>()(
  "TransactionSerializationError",
  {
    message: Schema.String,
    operation: Schema.String,
    cause: Schema.String,
  },
) {}
