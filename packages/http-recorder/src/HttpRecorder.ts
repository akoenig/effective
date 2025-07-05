/**
 * @fileoverview HTTP Recorder - Core recording and replay functionality
 *
 * This module provides the main HttpRecorder implementation for recording and replaying
 * HTTP requests and responses in Effect applications.
 *
 * @since 1.0.0
 */
import type { HttpClientRequest } from '@effect/platform'
import { HttpClient } from '@effect/platform'
import { type Config, Effect, Layer } from 'effect'

export { BodySerializationError } from './Domain/Errors/BodySerializationError.js'
export { DirectoryCreationError } from './Domain/Errors/DirectoryCreationError.js'
export { FileSystemReadError } from './Domain/Errors/FileSystemReadError.js'
export { FileSystemWriteError } from './Domain/Errors/FileSystemWriteError.js'
export { TransactionNotFoundError } from './Domain/Errors/TransactionNotFoundError.js'
export { TransactionSerializationError } from './Domain/Errors/TransactionSerializationError.js'
export type { RedactionEffect } from './Domain/Types/RedactionEffect.js'
export { HttpRecorderConfig } from './Domain/ValueObjects/HttpRecorderConfig.js'
export { RedactionContext } from './Domain/ValueObjects/RedactionContext.js'
export { RedactionResult } from './Domain/ValueObjects/RedactionResult.js'

import type { RedactionEffect } from './Domain/Types/RedactionEffect.js'
import { HttpRecorderConfig } from './Domain/ValueObjects/HttpRecorderConfig.js'
import { HttpClientAdapter } from './Infrastructure/Http/HttpClientAdapter.js'
import { HeaderService } from './Services/HeaderService.js'
import { RecordingService } from './Services/RecordingService.js'
import { RedactionService } from './Services/RedactionService.js'

/**
 * Default headers that are excluded from recordings for security purposes
 * @since 1.0.0
 * @category constants
 * @internal
 */
const DEFAULT_EXCLUDED_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'access-token',
  'refresh-token',
  'bearer',
  'x-csrf-token',
  'x-xsrf-token',
] as const

/**
 * Creates the HttpRecorder layer that records HTTP requests
 * @since 1.0.0
 * @category layers
 * @internal
 * @param config - Configuration for the HTTP recorder
 * @returns Effect layer that provides HTTP recording functionality
 */
const recorderLayer = (config: HttpRecorderConfig) =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const baseHttpClient = yield* HttpClient.HttpClient
      const headerService = yield* HeaderService
      const recordingService = yield* RecordingService
      const httpClientAdapter = yield* HttpClientAdapter

      // Create excluded headers set
      const excludedHeaders = headerService.createExcludedHeadersSet(
        DEFAULT_EXCLUDED_HEADERS,
        config.excludedHeaders,
      )

      return HttpClient.transform(baseHttpClient, (_effect, request) =>
        Effect.gen(function* () {
          // Resolve headers for each request
          const resolvedHeaders = yield* headerService.resolveHeaders(
            config.headers,
          )

          // Merge resolved headers with request headers
          const enhancedRequest: HttpClientRequest.HttpClientRequest = {
            ...request,
            headers: {
              ...resolvedHeaders,
              ...request.headers,
            },
          }

          // Execute the request and record the transaction
          const response = yield* baseHttpClient.execute(enhancedRequest)
          const responseBody =
            yield* httpClientAdapter.extractResponseBody(response)

          yield* recordingService
            .recordTransaction(
              enhancedRequest,
              response,
              responseBody,
              config,
              excludedHeaders,
            )
            .pipe(
              Effect.catchAll((error) =>
                Effect.logWarning(
                  `Failed to record transaction: ${error.message}`,
                ),
              ),
            )

          return response
        }).pipe(Effect.withSpan('HttpRecorder.transform')),
      )
    }),
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        HttpClientAdapter.Default,
        RecordingService.Default,
        RedactionService.Default,
        HeaderService.Default,
      ),
    ),
  )

/**
 * Creates an HTTP recorder layer with dynamic header support
 * @since 1.0.0
 * @category layers
 * @param options - Configuration options for the recorder
 * @param options.path - Directory path where recordings will be stored
 * @param options.excludedHeaders - Optional array of header names to exclude from recordings
 * @param options.redaction - Optional effect to redact sensitive data from requests/responses
 * @param options.headers - Record of header names to Config values for dynamic header resolution
 * @returns Effect layer that provides HTTP recording functionality
 * @example
 * ```typescript
 * import { Config } from "effect";
 *
 * const recorder = HttpRecorder.layerWithHeaders({
 *   path: "./recordings",
 *   excludedHeaders: ["x-sensitive-header"],
 *   headers: {
 *     "X-API-Key": Config.string("API_KEY"),
 *     "User-Agent": Config.succeed("MyApp/1.0")
 *   }
 * });
 * ```
 */
export const recorderLayerWithHeaders = (options: {
  path: string
  excludedHeaders?: Array<string>
  redaction?: RedactionEffect
  headers: Record<string, Config.Config<string>>
}) => recorderLayer(HttpRecorderConfig.make(options))

/**
 * HttpRecorder namespace containing the API for HTTP request/response recording
 *
 * This namespace provides layers for creating HTTP recorders that can intercept and record
 * HTTP interactions in Effect applications. It supports various configuration options including
 * custom redaction functions, header exclusion, and dynamic header resolution.
 *
 * @since 1.0.0
 * @category namespace
 * @example
 * ```typescript
 * import { HttpRecorder } from "@akoenig/effect-http-recorder";
 * import { HttpClient } from "@effect/platform";
 * import { NodeHttpClient } from "@effect/platform-node";
 * import { Effect, Layer } from "effect";
 *
 * // Basic usage
 * const recorder = HttpRecorder.layer({
 *   path: "./recordings"
 * });
 *
 * // With custom redaction
 * const recorderWithRedaction = HttpRecorder.layer({
 *   path: "./recordings",
 *   redaction: (context) => Effect.succeed(RedactionResult.make({
 *     headers: context.headers,
 *     body: context.type === "request" ? "***REDACTED***" : context.body
 *   }))
 * });
 *
 * // Use in your application
 * const program = Effect.gen(function* () {
 *   const http = yield* HttpClient.HttpClient;
 *   return yield* http.get("https://api.example.com/data");
 * }).pipe(
 *   Effect.provide(Layer.provideMerge(recorder, NodeHttpClient.layer))
 * );
 * ```
 */
export const HttpRecorder = {
  /**
   * Creates an HTTP recorder layer with static configuration
   * @since 1.0.0
   * @category layers
   * @param config - Configuration options for the recorder
   * @param config.path - Directory path where recordings will be stored
   * @param config.excludedHeaders - Optional array of header names to exclude from recordings
   * @param config.redaction - Optional effect to redact sensitive data from requests/responses
   * @returns Effect layer that provides HTTP recording functionality
   * @example
   * ```typescript
   * const recorder = HttpRecorder.layer({
   *   path: "./recordings",
   *   excludedHeaders: ["authorization", "x-api-key"],
   *   redaction: (context) => Effect.succeed(RedactionResult.make({
   *     headers: context.headers,
   *     body: context.body
   *   }))
   * });
   * ```
   */
  layer: recorderLayer,
  /**
   * Creates an HTTP recorder layer with dynamic header support
   * @since 1.0.0
   * @category layers
   * @param options - Configuration options including dynamic headers
   * @returns Effect layer that provides HTTP recording functionality
   * @example
   * ```typescript
   * import { Config } from "effect";
   *
   * const recorder = HttpRecorder.layerWithHeaders({
   *   path: "./recordings",
   *   headers: {
   *     "Authorization": Config.string("AUTH_TOKEN"),
   *     "X-Client-Version": Config.succeed("1.0.0")
   *   }
   * });
   * ```
   */
  layerWithHeaders: recorderLayerWithHeaders,
} as const
