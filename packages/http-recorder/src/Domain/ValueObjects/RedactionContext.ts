/**
 * @fileoverview Redaction Context Value Object
 * 
 * This module defines the RedactionContext class used to provide context information
 * to redaction functions for HTTP request/response processing.
 * 
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * Context object provided to redaction functions containing HTTP interaction details
 * 
 * This class encapsulates all the information about an HTTP request or response that
 * a redaction function needs to make decisions about what data to redact. It includes
 * the HTTP method, URL, headers, body, and indicates whether it's a request or response.
 * 
 * @since 1.0.0
 * @category models
 * @example
 * ```typescript
 * // Example of a RedactionContext for a POST request
 * const requestContext = RedactionContext.make({
 *   method: "POST",
 *   url: "https://api.example.com/users",
 *   headers: { "content-type": "application/json", "authorization": "Bearer token123" },
 *   body: { name: "John", password: "secret123" },
 *   type: "request"
 * });
 * 
 * // Example of a RedactionContext for a response
 * const responseContext = RedactionContext.make({
 *   method: "GET",
 *   url: "https://api.example.com/users/123",
 *   headers: { "content-type": "application/json" },
 *   body: { id: 123, name: "John", email: "john@example.com" },
 *   type: "response",
 *   status: 200
 * });
 * ```
 */
export class RedactionContext extends Schema.Class<RedactionContext>(
  "RedactionContext",
)({
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: Schema.String,
  /** Full URL of the HTTP request */
  url: Schema.String,
  /** HTTP headers as key-value pairs */
  headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  /** Request/response body data (can be any type) */
  body: Schema.optional(Schema.Unknown),
  /** Indicates whether this is a "request" or "response" context */
  type: Schema.Literal("request", "response"),
  /** HTTP status code (only present for response contexts) */
  status: Schema.optional(Schema.Number),
}) {}
