/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category schemas
 */
export class RedactionResult extends Schema.Class<RedactionResult>(
  "RedactionResult",
)({
  headers: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String }),
  ),
  body: Schema.optional(Schema.Unknown),
}) {}