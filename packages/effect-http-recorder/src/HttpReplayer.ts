/**
 * @fileoverview HTTP Replayer - Core replay functionality
 *
 * This module provides the HttpReplayer implementation for replaying previously
 * recorded HTTP requests and responses in Effect applications.
 *
 * @since 1.0.0
 */
import { HttpClient, HttpClientError } from '@effect/platform'
import { Effect, Layer, Predicate, Schema } from 'effect'

export { TransactionNotFoundError } from './Domain/Errors/TransactionNotFoundError.js'

import { ReplayService } from './Services/ReplayService.js'

/**
 * Configuration for the HTTP replayer
 * @since 1.0.0
 * @category models
 */
export class HttpReplayerConfig extends Schema.Class<HttpReplayerConfig>(
  'HttpReplayerConfig',
)({
  /**
   * Directory path where recording files are stored.
   */
  path: Schema.String,
}) {}

/**
 * Creates the HttpReplayer layer that replays recorded HTTP requests
 * @since 1.0.0
 * @category layers
 * @internal
 * @param config - Configuration for the HTTP replayer
 * @returns Effect layer that provides HTTP replay functionality
 */
const replayerLayer = (config: HttpReplayerConfig) =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const baseHttpClient = yield* HttpClient.HttpClient
      const replayService = yield* ReplayService

      return HttpClient.transform(baseHttpClient, (_effect, request) =>
        Effect.gen(function* () {
          const recording = yield* replayService
            .findAndReplayTransaction(request, config)
            .pipe(
              Effect.mapError(
                (error) =>
                  new HttpClientError.RequestError({
                    request,
                    reason: 'Transport',
                    description: `Recording error: ${error.message}`,
                  }),
              ),
            )

          const hasRecording = Predicate.isNotNull(recording)

          if (hasRecording) {
            return recording
          }

          return yield* Effect.fail(
            new HttpClientError.RequestError({
              request,
              reason: 'Transport',
              description: 'No matching recording found',
            }),
          )
        }).pipe(Effect.withSpan('HttpReplayer.transform')),
      )
    }),
  ).pipe(Layer.provide(ReplayService.Default))

/**
 * HttpReplayer namespace containing the API for HTTP request/response replay
 *
 * This namespace provides layers for creating HTTP replayers that can replay previously
 * recorded HTTP interactions in Effect applications.
 *
 * @since 1.0.0
 * @category namespace
 * @example
 * ```typescript
 * import { HttpReplayer } from "@akoenig/effect-http-recorder";
 * import { HttpClient } from "@effect/platform";
 * import { NodeHttpClient } from "@effect/platform-node";
 * import { Effect, Layer } from "effect";
 *
 * // Basic usage
 * const replayer = HttpReplayer.layer({
 *   path: "./recordings"
 * });
 *
 * // Use in your application
 * const program = Effect.gen(function* () {
 *   const http = yield* HttpClient.HttpClient;
 *   return yield* http.get("https://api.example.com/data");
 * }).pipe(
 *   Effect.provide(Layer.provideMerge(replayer, NodeHttpClient.layer))
 * );
 * ```
 */
export const HttpReplayer = {
  /**
   * Creates an HTTP replayer layer with static configuration
   * @since 1.0.0
   * @category layers
   * @param config - Configuration options for the replayer
   * @param config.path - Directory path where recordings are stored
   * @returns Effect layer that provides HTTP replay functionality
   * @example
   * ```typescript
   * const replayer = HttpReplayer.layer({ path: "./recordings" });
   * ```
   */
  layer: (config: { path: string }) =>
    replayerLayer(HttpReplayerConfig.make(config)),
} as const
