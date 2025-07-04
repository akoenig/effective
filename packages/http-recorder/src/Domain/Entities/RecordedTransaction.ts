/**
 * @fileoverview Recorded Transaction Entity
 * 
 * This module defines the RecordedTransaction entity that represents a complete
 * HTTP request/response interaction that has been recorded and can be replayed.
 * 
 * @since 1.0.0
 */
import { Schema } from "effect";
import { TransactionId } from "../ValueObjects/TransactionId.js";

/**
 * Entity representing a complete HTTP transaction (request + response) that has been recorded
 * 
 * This class encapsulates both the HTTP request and response data along with metadata
 * like transaction ID and timestamp. It's used to persist HTTP interactions to disk
 * and later replay them during testing or development.
 * 
 * The transaction ID is automatically generated based on the request characteristics
 * to ensure consistent replay behavior. The timestamp records when the interaction
 * was originally captured.
 * 
 * @since 1.0.0
 * @category entities
 * @example
 * ```typescript
 * // Create a recorded transaction for a successful API call
 * const transaction = RecordedTransaction.make({
 *   id: "1234567890__GET_users",
 *   request: {
 *     method: "GET",
 *     url: "https://api.example.com/users",
 *     headers: { 
 *       "content-type": "application/json",
 *       "user-agent": "MyApp/1.0.0"
 *     },
 *     body: null
 *   },
 *   response: {
 *     status: 200,
 *     headers: { 
 *       "content-type": "application/json",
 *       "cache-control": "no-cache"
 *     },
 *     body: [
 *       { id: 1, name: "John Doe", email: "john@example.com" },
 *       { id: 2, name: "Jane Smith", email: "jane@example.com" }
 *     ]
 *   },
 *   timestamp: "2023-12-07T10:30:00.000Z"
 * });
 * 
 * // Create a recorded transaction for a POST request with request body
 * const postTransaction = RecordedTransaction.make({
 *   id: "1234567891__POST_users",
 *   request: {
 *     method: "POST",
 *     url: "https://api.example.com/users",
 *     headers: { 
 *       "content-type": "application/json",
 *       "authorization": "Bearer token123"
 *     },
 *     body: { name: "Bob Wilson", email: "bob@example.com" }
 *   },
 *   response: {
 *     status: 201,
 *     headers: { 
 *       "content-type": "application/json",
 *       "location": "/users/3"
 *     },
 *     body: { id: 3, name: "Bob Wilson", email: "bob@example.com" }
 *   },
 *   timestamp: "2023-12-07T10:31:00.000Z"
 * });
 * ```
 */
export class RecordedTransaction extends Schema.Class<RecordedTransaction>(
  "RecordedTransaction",
)({
  /** 
   * Unique identifier for this transaction, typically generated from request characteristics
   * Format: timestamp__METHOD_pathSegment (e.g., "1234567890__GET_users")
   */
  id: TransactionId,
  /** HTTP request data that was originally made */
  request: Schema.Struct({
    /** HTTP method (GET, POST, PUT, DELETE, etc.) */
    method: Schema.String,
    /** Full URL that was requested */
    url: Schema.String,
    /** HTTP request headers as key-value pairs */
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    /** Request body data (can be any type including objects, strings, or null) */
    body: Schema.optional(Schema.Unknown),
  }),
  /** HTTP response data that was originally received */
  response: Schema.Struct({
    /** HTTP status code (200, 404, 500, etc.) */
    status: Schema.Number,
    /** HTTP response headers as key-value pairs */
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    /** Response body data (can be any type including objects, strings, arrays, etc.) */
    body: Schema.Unknown,
  }),
  /** ISO timestamp of when this transaction was originally recorded */
  timestamp: Schema.String,
}) {}
