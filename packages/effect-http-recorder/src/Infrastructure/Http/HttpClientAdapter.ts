/**
 * @since 1.0.0
 */
import type { HttpClientRequest } from '@effect/platform'
import { HttpClientResponse } from '@effect/platform'
import { Effect, Predicate } from 'effect'
import type { RecordedTransaction } from '../../Domain/Entities/RecordedTransaction.js'
import { TransactionSerializer } from '../Serialization/TransactionSerializer.js'

/**
 * @since 1.0.0
 * @category http
 * @summary Adapts between HTTP responses and domain objects
 */
export class HttpClientAdapter extends Effect.Service<HttpClientAdapter>()(
  '@akoenig/effect-http-recorder/HttpClientAdapter',
  {
    dependencies: [TransactionSerializer.Default],
    effect: Effect.gen(function* () {
      const transactionSerializer = yield* TransactionSerializer

      return {
        /**
         * Create an HTTP response from a recorded transaction
         * @since 1.0.0
         */
        createResponseFromRecording(
          transaction: RecordedTransaction,
          request: HttpClientRequest.HttpClientRequest,
        ) {
          return Effect.gen(function* () {
            const isResponseBodyString =
              typeof transaction.response.body === 'string'

            const bodyString = isResponseBodyString
              ? transaction.response.body
              : yield* transactionSerializer.serializeBody(
                  transaction.response.body,
                )

            // Handle empty response bodies regardless of status code using Effect utilities
            // This is more robust than checking specific status codes
            const isEmpty = Predicate.not(Predicate.isTruthy)
            const responseBody = isEmpty(transaction.response.body)
              ? null
              : bodyString

            const webResponse = new Response(responseBody, {
              status: transaction.response.status,
              headers: transaction.response.headers,
            })

            return HttpClientResponse.fromWeb(request, webResponse)
          })
        },

        /**
         * Extract and parse HTTP response body
         * @since 1.0.0
         */
        extractResponseBody(response: HttpClientResponse.HttpClientResponse) {
          return response.json.pipe(
            Effect.catchAll(() => response.text),
            Effect.catchAll(() => Effect.succeed(null)),
          )
        },
      }
    }),
  },
) {}
