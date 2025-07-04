/**
 * @since 1.0.0
 */
import type { Config } from "effect";
import { Schema } from "effect";
import type { RedactionFunction } from "../Types/RedactionFunction.js";

/**
 * @since 1.0.0
 * @category schemas
 */
export class HttpRecorderConfig extends Schema.Class<HttpRecorderConfig>(
  "HttpRecorderConfig",
)({
  path: Schema.String,
  mode: Schema.Literal("record", "replay"),
  excludedHeaders: Schema.optional(Schema.Array(Schema.String)),
  redactionFn: Schema.optional(
    Schema.Unknown as Schema.Schema<RedactionFunction>,
  ),
  headers: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown as Schema.Schema<Config.Config<string>>,
    }),
  ),
}) {}
