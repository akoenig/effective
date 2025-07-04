/**
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
 * @since 1.0.0
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
 * @since 1.0.0
 * @category predicates
 * @internal
 */
const isReplayMode = (mode: string): boolean => mode === "replay";

/**
 * @since 1.0.0
 * @internal
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
 * @since 1.0.0
 * @category layers
 */
export const layerWithHeaders = (options: {
  path: string;
  mode: "record" | "replay";
  excludedHeaders?: Array<string>;
  redactionFn?: RedactionFunction;
  headers: Record<string, Config.Config<string>>;
}) => layer(HttpRecorderConfig.make(options));

/**
 * @since 1.0.0
 * @category namespace
 * @summary HttpRecorder - Main API for HTTP request/response recording and replay
 *
 * Public API includes:
 *
 * - HttpRecorder.layer() - Create recorder layer
 * - HttpRecorder.layerWithHeaders() - Create recorder layer with headers support
 * - RedactionFunction type - For custom redaction logic
 * - RedactionContext/RedactionResult classes - Redaction data structures
 * - HttpRecorderConfig class - Configuration schema
 * - Specific error classes - Detailed error handling
 */
export const HttpRecorder = {
  /**
   * @since 1.0.0
   * @category layers
   */
  layer,
  /**
   * @since 1.0.0
   * @category layers
   */
  layerWithHeaders,
} as const;
