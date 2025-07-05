/**
 * @fileoverview HTTP Recorder Configuration Value Object
 * 
 * This module defines the HttpRecorderConfig class used to configure the HTTP recorder
 * behavior, including storage path, recording mode, header exclusions, and redaction functions.
 * 
 * @since 1.0.0
 */
import type { Config } from "effect";
import { Schema } from "effect";
import type { RedactionFunction } from "../Types/RedactionFunction.js";

/**
 * Configuration schema for the HTTP recorder
 * 
 * This class defines all the configuration options available for the HTTP recorder,
 * including where to store recordings, which headers to exclude, and how to redact
 * sensitive data.
 * 
 * @since 1.0.0
 * @category models
 * @example
 * ```typescript
 * // Basic configuration
 * const config = HttpRecorderConfig.make({
 *   path: "./recordings"
 * });
 * 
 * // Advanced configuration with redaction
 * const advancedConfig = HttpRecorderConfig.make({
 *   path: "./test-recordings",
 *   excludedHeaders: ["x-custom-token", "x-internal-id"],
 *   // Optional: provide a redaction function to sanitize sensitive data
 *   redactionFn: (context) => ({
 *     headers: context.headers,
 *     body: context.type === "request" ? "***REDACTED***" : context.body
 *   })
 * });
 * 
 * // Configuration with dynamic headers
 * const configWithHeaders = HttpRecorderConfig.make({
 *   path: "./recordings",
 *   headers: {
 *     "Authorization": Config.string("API_TOKEN"),
 *     "X-Client-Version": Config.succeed("1.0.0")
 *   }
 * });
 * ```
 */
export class HttpRecorderConfig extends Schema.Class<HttpRecorderConfig>(
  "HttpRecorderConfig",
)({
  /** 
   * Directory path where recording files will be stored.
   * The directory will be created if it doesn't exist.
   */
  path: Schema.String,
  /** 
   * Optional array of header names to exclude from recordings.
   * These headers will be filtered out before saving to disk.
   * Note: Common sensitive headers are excluded by default.
   */
  excludedHeaders: Schema.optional(Schema.Array(Schema.String)),
  /** 
   * Optional redaction function to modify request/response data before recording.
   * This function receives context about the HTTP interaction and can return
   * modified headers and body data to mask sensitive information.
   */
  redactionFn: Schema.optional(
    Schema.Unknown as Schema.Schema<RedactionFunction>,
  ),
  /** 
   * Optional record of header names to Config values for dynamic header resolution.
   * This allows headers to be resolved from environment variables or other sources
   * at runtime.
   */
  headers: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown as Schema.Schema<Config.Config<string>>,
    }),
  ),
}) {}
