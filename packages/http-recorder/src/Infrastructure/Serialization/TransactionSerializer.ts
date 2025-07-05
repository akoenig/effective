/**
 * @since 1.0.0
 */
import { Effect, Schema } from 'effect'
import { RecordedTransaction } from '../../Domain/Entities/RecordedTransaction.js'
import { BodySerializationError } from '../../Domain/Errors/BodySerializationError.js'
import { TransactionSerializationError } from '../../Domain/Errors/TransactionSerializationError.js'

/**
 * @since 1.0.0
 * @category serialization
 * @summary Handles serialization and deserialization of RecordedTransaction objects
 */
export class TransactionSerializer extends Effect.Service<TransactionSerializer>()(
  '@akoenig/effect-http-recorder/TransactionSerializer',
  {
    succeed: {
      /**
       * Serialize a RecordedTransaction to JSON string
       * @since 1.0.0
       */
      serialize(transaction: RecordedTransaction) {
        return Schema.encode(Schema.parseJson(RecordedTransaction))(
          transaction,
        ).pipe(
          Effect.mapError(
            (error) =>
              new TransactionSerializationError({
                message: `Failed to serialize transaction: ${String(error)}`,
                operation: 'serialize',
                cause: String(error),
              }),
          ),
        )
      },

      /**
       * Deserialize a JSON string to RecordedTransaction
       * @since 1.0.0
       */
      deserialize(content: string) {
        return Schema.decodeUnknown(Schema.parseJson(RecordedTransaction))(
          content,
        ).pipe(Effect.catchAll(() => Effect.succeed(null)))
      },

      /**
       * Parse JSON body content if it's a string
       * @since 1.0.0
       */
      parseJsonBody(body: unknown) {
        return typeof body === 'string'
          ? Schema.decodeUnknown(Schema.parseJson(Schema.Unknown))(body).pipe(
              Effect.catchAll(() => Effect.succeed(body)),
            )
          : Effect.succeed(body)
      },

      /**
       * Serialize body content to JSON string
       * @since 1.0.0
       */
      serializeBody(body: unknown) {
        return Schema.encode(Schema.parseJson(Schema.Unknown))(body).pipe(
          Effect.mapError(
            (error) =>
              new BodySerializationError({
                message: `Failed to serialize body: ${String(error)}`,
                bodyType: typeof body,
                cause: String(error),
              }),
          ),
        )
      },
    },
  },
) {}
