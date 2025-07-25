/**
 * @fileoverview HTTP Recorder - Main entry point for the effect-http-recorder package
 *
 * This package provides HTTP request/response recording and replay functionality for Effect applications.
 * It supports recording HTTP interactions for testing, debugging, and development purposes.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import { HttpRecorder, HttpReplayer } from "@akoenig/effect-http-recorder";
 * import { HttpClient } from "@effect/platform";
 * import { NodeHttpClient } from "@effect/platform-node";
 * import { Effect, Layer } from "effect";
 *
 * // Create a recorder that saves interactions to ./recordings
 * const recorder = HttpRecorder.layer({
 *   path: "./recordings",
 *   excludedHeaders: ["authorization", "x-api-key"],
 *   // Optional: provide a redaction effect to sanitize sensitive data
 *   redaction: (context) => Effect.succeed(RedactionResult.make({
 *     headers: context.headers,
 *     body: context.body // Add your redaction logic here
 *   }))
 * });
 *
 * // Create a replayer for replay mode
 * const replayer = HttpReplayer.layer({ path: "./recordings" });
 *
 * // Use with your HTTP client
 * const program = Effect.gen(function* () {
 *   const http = yield* HttpClient.HttpClient;
 *   const response = yield* http.get("https://api.example.com/data");
 *   return response;
 * }).pipe(
 *   Effect.provide(Layer.provideMerge(recorder, NodeHttpClient.layer))
 * );
 * ```
 */
export * from './HttpRecorder.js'
export * from './HttpReplayer.js'
