/**
 * @fileoverview Redaction Result Value Object
 *
 * This module defines the RedactionResult class used to return redacted data
 * from redaction functions.
 *
 * @since 1.0.0
 */
import { Schema } from 'effect'

/**
 * Result object returned by redaction functions containing redacted data
 *
 * This class represents the output of a redaction function, containing potentially
 * modified headers and body data. If a property is undefined, it indicates that
 * the original data should be preserved unchanged.
 *
 * @since 1.0.0
 * @category models
 * @example
 * ```typescript
 * // Example redaction result that masks sensitive headers
 * const result = RedactionResult.make({
 *   headers: { "authorization": "***REDACTED***", "content-type": "application/json" },
 *   body: { name: "John", password: "***REDACTED***" }
 * });
 *
 * // Example result that only redacts the body
 * const bodyOnlyResult = RedactionResult.make({
 *   body: "***REDACTED***"
 * });
 *
 * // Example result that preserves original data (no redaction)
 * const noRedactionResult = RedactionResult.make({
 *   headers: undefined, // Keep original headers
 *   body: undefined     // Keep original body
 * });
 * ```
 */
export class RedactionResult extends Schema.Class<RedactionResult>(
  'RedactionResult',
)({
  /**
   * Redacted headers as key-value pairs. If undefined, original headers are preserved.
   * If provided, this completely replaces the original headers.
   */
  headers: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String }),
  ),
  /**
   * Redacted body data. If undefined, original body is preserved.
   * Can be any type of data including strings, objects, arrays, etc.
   */
  body: Schema.optional(Schema.Unknown),
}) {}
