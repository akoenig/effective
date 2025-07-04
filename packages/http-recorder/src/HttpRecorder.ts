/**
 * @fileoverview HTTP Recorder - Core recording and replay functionality
 * 
 * This module provides the main HttpRecorder implementation for recording and replaying
 * HTTP requests and responses in Effect applications.
 * 
 * @since 1.0.0
 */
import type { HttpClientRequest } from "@effect/platform";
import { HttpClient, HttpClientError } from "@effect/platform";
import { type Config, Effect, Layer, Predicate } from "effect";

export { BodySerializationError } from "./Domain/Errors/BodySerializationError.js";
export { DirectoryCreationError } from "./Domain/Errors/DirectoryCreationError.js";
export { FileSystemReadError } from "./Domain/Errors/FileSystemReadError.js";
export { FileSystemWriteError } from "./Domain/Errors/FileSystemWriteError.js";
export { TransactionNotFoundError } from "./Domain/Errors/TransactionNotFoundError.js";
export { TransactionSerializationError } from "./Domain/Errors/TransactionSerializationError.js";
export type { RedactionFunction } from "./Domain/Types/RedactionFunction.js";
export { HttpRecorderConfig } from "./Domain/ValueObjects/HttpRecorderConfig.js";
export { RedactionContext } from "./Domain/ValueObjects/RedactionContext.js";
export { RedactionResult } from "./Domain/ValueObjects/RedactionResult.js";

import type { RedactionFunction } from "./Domain/Types/RedactionFunction.js";
import { HttpRecorderConfig } from "./Domain/ValueObjects/HttpRecorderConfig.js";
import { HttpClientAdapter } from "./Infrastructure/Http/HttpClientAdapter.js";
import { HeaderService } from "./Services/HeaderService.js";
import { RecordingService } from "./Services/RecordingService.js";
import { RedactionService } from "./Services/RedactionService.js";
import { ReplayService } from "./Services/ReplayService.js";

/**
 * Default headers that are excluded from recordings for security purposes
 * @since 1.0.0
 * @category constants
 * @internal
 */
const DEFAULT_EXCLUDED_HEADERS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "access-token",
  "refresh-token",
  "bearer",
  "x-csrf-token",
  "x-xsrf-token",
] as const;

/**
 * Checks if the recorder is in replay mode
 * @since 1.0.0
 * @category predicates
 * @internal
 * @param mode - The recorder mode to check
 * @returns True if mode is "replay"
 */
const isReplayMode = (mode: string): boolean => mode === "replay";

/**
 * Creates the main HttpRecorder layer that intercepts HTTP requests
 * @since 1.0.0
 * @category layers
 * @internal
 * @param config - Configuration for the HTTP recorder
 * @returns Effect layer that provides HTTP recording/replay functionality
 */
const layer = (config: HttpRecorderConfig) =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const baseHttpClient = yield* HttpClient.HttpClient;
      const headerService = yield* HeaderService;
      const recordingService = yield* RecordingService;
      const replayService = yield* ReplayService;
      const httpClientAdapter = yield* HttpClientAdapter;

      // Create excluded headers set
      const excludedHeaders = headerService.createExcludedHeadersSet(
        DEFAULT_EXCLUDED_HEADERS,
        config.excludedHeaders,
      );

      return HttpClient.transform(baseHttpClient, (_effect, request) =>
        Effect.gen(function* () {
          // Resolve headers for each request
          const resolvedHeaders = yield* headerService.resolveHeaders(
            config.headers,
          );

          // Merge resolved headers with request headers
          const enhancedRequest: HttpClientRequest.HttpClientRequest = {
            ...request,
            headers: {
              ...resolvedHeaders,
              ...request.headers,
            },
          };

          const shouldReplay = isReplayMode(config.mode);

          if (shouldReplay) {
            const recording = yield* replayService
              .findAndReplayTransaction(enhancedRequest, config)
              .pipe(
                Effect.mapError(
                  (error) =>
                    new HttpClientError.RequestError({
                      request,
                      reason: "Transport",
                      description: `Recording error: ${error.message}`,
                    }),
                ),
              );

            const hasRecording = Predicate.isNotNull(recording);

            if (hasRecording) {
              return recording;
            }

            return yield* Effect.fail(
              new HttpClientError.RequestError({
                request: enhancedRequest,
                reason: "Transport",
                description: "No matching recording found",
              }),
            );
          }

          // Record mode: execute the request and record the transaction
          const response = yield* baseHttpClient.execute(enhancedRequest);
          const responseBody =
            yield* httpClientAdapter.extractResponseBody(response);

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
            );

          return response;
        }).pipe(Effect.withSpan("HttpRecorder.transform")),
      );
    }),
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        HttpClientAdapter.Default,
        ReplayService.Default,
        RecordingService.Default,
        RedactionService.Default,
        HeaderService.Default,
      ),
    ),
  );

/**
 * Creates an HTTP recorder layer with dynamic header support
 * @since 1.0.0
 * @category layers
 * @param options - Configuration options for the recorder
 * @param options.path - Directory path where recordings will be stored
 * @param options.mode - Recording mode: "record" to save interactions, "replay" to use saved recordings
 * @param options.excludedHeaders - Optional array of header names to exclude from recordings
 * @param options.redactionFn - Optional function to redact sensitive data from requests/responses
 * @param options.headers - Record of header names to Config values for dynamic header resolution
 * @returns Effect layer that provides HTTP recording/replay functionality
 * @example
 * ```typescript
 * import { Config } from "effect";
 * 
 * const recorder = HttpRecorder.layerWithHeaders({
 *   path: "./recordings",
 *   mode: "record",
 *   excludedHeaders: ["x-sensitive-header"],
 *   headers: {
 *     "X-API-Key": Config.string("API_KEY"),
 *     "User-Agent": Config.succeed("MyApp/1.0")
 *   }
 * });
 * ```
 */
export const layerWithHeaders = (options: {
  path: string;
  mode: "record" | "replay";
  excludedHeaders?: Array<string>;
  redactionFn?: RedactionFunction;
  headers: Record<string, Config.Config<string>>;
}) => layer(HttpRecorderConfig.make(options));

/**
 * HttpRecorder namespace containing the main API for HTTP request/response recording and replay
 * 
 * This namespace provides layers for creating HTTP recorders that can intercept, record, and replay
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
 *   path: "./recordings",
 *   mode: "record"
 * });
 * 
 * // With custom redaction
 * const recorderWithRedaction = HttpRecorder.layer({
 *   path: "./recordings",
 *   mode: "record",
 *   redactionFn: (context) => ({
 *     headers: context.headers,
 *     body: context.type === "request" ? "***REDACTED***" : context.body
 *   })
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
   * @param config.mode - Recording mode: "record" to save interactions, "replay" to use saved recordings
   * @param config.excludedHeaders - Optional array of header names to exclude from recordings
   * @param config.redactionFn - Optional function to redact sensitive data from requests/responses
   * @returns Effect layer that provides HTTP recording/replay functionality
   * @example
   * ```typescript
   * const recorder = HttpRecorder.layer({
   *   path: "./recordings",
   *   mode: "record",
   *   excludedHeaders: ["authorization", "x-api-key"],
   *   redactionFn: (context) => ({
   *     headers: context.headers,
   *     body: context.body
   *   })
   * });
   * ```
   */
  layer,
  /**
   * Creates an HTTP recorder layer with dynamic header support
   * @since 1.0.0
   * @category layers
   * @param options - Configuration options including dynamic headers
   * @returns Effect layer that provides HTTP recording/replay functionality
   * @example
   * ```typescript
   * import { Config } from "effect";
   * 
   * const recorder = HttpRecorder.layerWithHeaders({
   *   path: "./recordings",
   *   mode: "record",
   *   headers: {
   *     "Authorization": Config.string("AUTH_TOKEN"),
   *     "X-Client-Version": Config.succeed("1.0.0")
   *   }
   * });
   * ```
   */
  layerWithHeaders,
} as const;
