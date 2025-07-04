/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category schemas
 */
export class RedactionContext extends Schema.Class<RedactionContext>(
  "RedactionContext",
)({
  method: Schema.String,
  url: Schema.String,
  headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  body: Schema.optional(Schema.Unknown),
  type: Schema.Literal("request", "response"),
  status: Schema.optional(Schema.Number),
}) {}
