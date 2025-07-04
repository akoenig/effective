/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category errors
 */
export class TransactionNotFoundError extends Schema.TaggedError<TransactionNotFoundError>()(
  "TransactionNotFoundError",
  {
    message: Schema.String,
    method: Schema.String,
    url: Schema.String,
  },
) {}
