/**
 * @fileoverview Redaction Effect Type Definition
 *
 * This module defines the RedactionEffect type used for Effect-based redaction functions
 * that handle sensitive data redaction from HTTP requests and responses during recording.
 *
 * @since 1.0.0
 */
import type { Effect } from 'effect'
import type { RedactionContext } from '../ValueObjects/RedactionContext.js'
import type { RedactionResult } from '../ValueObjects/RedactionResult.js'

/**
 * Effect-based redaction error for redaction operations
 * @since 1.0.0
 * @category errors
 */
export class RedactionError extends Error {
  readonly _tag = 'RedactionError'

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'RedactionError'
    this.cause = cause
  }
}

/**
 * Effect-based function type for redacting sensitive data from HTTP requests and responses
 *
 * A redaction effect takes a context object containing information about the HTTP interaction
 * and returns an Effect that produces a result object with potentially modified headers and body data.
 * This allows for custom async logic to remove or mask sensitive information before recording.
 *
 * @since 1.0.0
 * @category types
 * @param context - The redaction context containing request/response data
 * @returns An Effect that produces a redaction result with potentially modified headers and body
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { RedactionResult } from "@akoenig/effect-http-recorder";
 *
 * // Simple Effect-based redaction that masks all request bodies
 * const simpleRedactor: RedactionEffect = (context) =>
 *   Effect.succeed(
 *     RedactionResult.make({
 *       headers: context.headers,
 *       body: context.type === "request" ? "***REDACTED***" : context.body
 *     })
 *   );
 *
 * // Redaction with error handling
 * const smartRedactor: RedactionEffect = (context) =>
 *   Effect.gen(function* () {
 *     if (context.body && typeof context.body === "object") {
 *       const body = context.body as Record<string, unknown>;
 *       const redacted = { ...body };
 *       if ("password" in redacted) redacted.password = "***REDACTED***";
 *       if ("token" in redacted) redacted.token = "***REDACTED***";
 *       return RedactionResult.make({
 *         headers: context.headers,
 *         body: redacted
 *       });
 *     }
 *     return RedactionResult.make({
 *       headers: context.headers,
 *       body: context.body
 *     });
 *   });
 *
 * // Conditional redaction with async operations
 * const conditionalRedactor: RedactionEffect = (context) =>
 *   Effect.gen(function* () {
 *     if (context.type === "request" && context.method === "POST") {
 *       // Could perform async operations here
 *       yield* Effect.sleep(1); // Example async operation
 *       return RedactionResult.make({
 *         headers: { ...context.headers, "authorization": "***REDACTED***" },
 *         body: "***REDACTED***"
 *       });
 *     }
 *     return RedactionResult.make({
 *       headers: context.headers,
 *       body: context.body
 *     });
 *   });
 * ```
 */
export type RedactionEffect = (
  context: RedactionContext,
) => Effect.Effect<RedactionResult, RedactionError>
