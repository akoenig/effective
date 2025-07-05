/**
 * @since 1.0.0
 */
import type { HttpClientRequest } from '@effect/platform'
import { Effect } from 'effect'
import type { HttpRecorderConfig } from '../Domain/ValueObjects/HttpRecorderConfig.js'
import { HttpClientAdapter } from '../Infrastructure/Http/HttpClientAdapter.js'
import { FileSystemTransactionRepository } from '../Repositories/FileSystemTransactionRepository.js'

/**
 * @since 1.0.0
 * @category services
 * @summary Service for replaying recorded HTTP transactions
 */
export class ReplayService extends Effect.Service<ReplayService>()(
  '@akoenig/effect-http-recorder/ReplayService',
  {
    dependencies: [
      FileSystemTransactionRepository.Default,
      HttpClientAdapter.Default,
    ],
    effect: Effect.gen(function* () {
      const repository = yield* FileSystemTransactionRepository
      const httpClientAdapter = yield* HttpClientAdapter

      return {
        /**
         * Find and replay a recorded transaction for the given request
         * @since 1.0.0
         */
        findAndReplayTransaction(
          request: HttpClientRequest.HttpClientRequest,
          config: HttpRecorderConfig,
        ) {
          return Effect.gen(function* () {
            const recording = yield* repository
              .findByMethodAndUrl(request, config.path)
              .pipe(
                Effect.catchTag('TransactionNotFoundError', () =>
                  Effect.succeed(null),
                ),
              )

            if (recording === null) {
              return null
            }

            return yield* httpClientAdapter.createResponseFromRecording(
              recording,
              request,
            )
          })
        },

        /**
         * Check if a recorded transaction exists for the given request
         * @since 1.0.0
         */
        hasRecording(
          request: HttpClientRequest.HttpClientRequest,
          config: HttpRecorderConfig,
        ) {
          return Effect.gen(function* () {
            const hasRecording = yield* repository
              .findByMethodAndUrl(request, config.path)
              .pipe(
                Effect.map(() => true),
                Effect.catchTag('TransactionNotFoundError', () =>
                  Effect.succeed(false),
                ),
              )

            return hasRecording
          })
        },
      }
    }),
  },
) {}
