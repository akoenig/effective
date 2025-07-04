/**
 * @fileoverview Recorded Transaction Entity
 * @since 1.0.0
 */
import { Schema } from "effect";
import { TransactionId } from "../ValueObjects/TransactionId.js";

/**
 * Represents a complete HTTP transaction (request + response) that has been recorded
 * @since 1.0.0
 * @category entities
 * @example
 * ```typescript
 * const transaction = RecordedTransaction.make({
 *   id: "1234567890__GET_users",
 *   request: {
 *     method: "GET",
 *     url: "https://api.example.com/users",
 *     headers: { "content-type": "application/json" },
 *     body: null
 *   },
 *   response: {
 *     status: 200,
 *     headers: { "content-type": "application/json" },
 *     body: [{ id: 1, name: "John" }]
 *   },
 *   timestamp: "2023-12-07T10:30:00.000Z"
 * });
 * ```
 */
export class RecordedTransaction extends Schema.Class<RecordedTransaction>(
  "RecordedTransaction",
)({
  id: TransactionId,
  request: Schema.Struct({
    method: Schema.String,
    url: Schema.String,
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    body: Schema.optional(Schema.Unknown),
  }),
  response: Schema.Struct({
    status: Schema.Number,
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    body: Schema.Unknown,
  }),
  timestamp: Schema.String,
}) {}
