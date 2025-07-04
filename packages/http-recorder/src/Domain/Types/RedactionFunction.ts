/**
 * @fileoverview Redaction Function Type Definition
 * 
 * This module defines the RedactionFunction type used for customizing how sensitive data
 * is redacted from HTTP requests and responses during recording.
 * 
 * @since 1.0.0
 */
import type { RedactionContext } from "../ValueObjects/RedactionContext.js";
import type { RedactionResult } from "../ValueObjects/RedactionResult.js";

/**
 * Function type for redacting sensitive data from HTTP requests and responses
 * 
 * A redaction function takes a context object containing information about the HTTP interaction
 * and returns a result object with potentially modified headers and body data. This allows
 * for custom logic to remove or mask sensitive information before recording.
 * 
 * @since 1.0.0
 * @category types
 * @param context - The redaction context containing request/response data
 * @returns A redaction result with potentially modified headers and body
 * @example
 * ```typescript
 * // Simple redaction function that masks all request bodies
 * const simpleRedactor: RedactionFunction = (context) => ({
 *   headers: context.headers,
 *   body: context.type === "request" ? "***REDACTED***" : context.body
 * });
 * 
 * // Redaction function that handles different data types
 * const smartRedactor: RedactionFunction = (context) => {
 *   if (context.body && typeof context.body === "object") {
 *     const body = context.body as Record<string, unknown>;
 *     const redacted = { ...body };
 *     if ("password" in redacted) redacted.password = "***REDACTED***";
 *     if ("token" in redacted) redacted.token = "***REDACTED***";
 *     return { headers: context.headers, body: redacted };
 *   }
 *   return { headers: context.headers, body: context.body };
 * };
 * 
 * // Conditional redaction based on context
 * const conditionalRedactor: RedactionFunction = (context) => {
 *   if (context.type === "request" && context.method === "POST") {
 *     return {
 *       headers: { ...context.headers, "authorization": "***REDACTED***" },
 *       body: "***REDACTED***"
 *     };
 *   }
 *   return {
 *     headers: context.headers,
 *     body: context.body
 *   };
 * };
 * ```
 */
export type RedactionFunction = (context: RedactionContext) => RedactionResult;
