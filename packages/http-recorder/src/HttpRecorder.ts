import type { HttpClientRequest } from "@effect/platform";
import {
  FileSystem,
  HttpClient,
  HttpClientError,
  HttpClientResponse,
  Path,
} from "@effect/platform";
import { Effect, Schema } from "effect";

/**
 * Context provided to redaction functions
 */
export interface RedactionContext {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
  readonly type: "request" | "response";
  readonly status?: number;
}

/**
 * Result returned by redaction functions
 */
export interface RedactionResult {
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
}

/**
 * Function type for custom redaction logic
 */
export type RedactionFunction = (context: RedactionContext) => RedactionResult;

/**
 * Configuration for the HttpRecorder
 */
export interface HttpRecorderConfig {
  readonly path: string;
  readonly mode: "record" | "replay";
  readonly excludedHeaders?: ReadonlyArray<string>;
  readonly redactionFn?: RedactionFunction;
}

/**
 * Schema for HttpRecorder configuration
 */
export const HttpRecorderConfigSchema = Schema.Struct({
  path: Schema.String,
  mode: Schema.Literal("record", "replay"),
  excludedHeaders: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * Default excluded headers for security
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
 * Structure of a recorded HTTP transaction
 */
export interface RecordedTransaction {
  readonly id: string;
  readonly request: {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
    readonly body?: unknown;
  };
  readonly response: {
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body: unknown;
  };
  readonly timestamp: string;
}

/**
 * Schema for recorded transaction
 */
export const RecordedTransactionSchema = Schema.Struct({
  id: Schema.String,
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
});

/**
 * Tagged error for recording issues
 */
export class HttpRecorderError extends Schema.TaggedError<HttpRecorderError>()(
  "HttpRecorderError",
  {
    message: Schema.String,
  },
) {}

/**
 * Creates an HTTP client with recording and replay capabilities
 * 
 * @param config - Configuration object specifying the recording path, mode, optional excluded headers, and optional redaction function
 * @returns An Effect that yields an HttpClient with recording/replay functionality
 * 
 * @example
 * Basic usage:
 * ```typescript
 * const recorder = yield* HttpRecorder({
 *   path: "./recordings",
 *   mode: "record",
 *   excludedHeaders: ["authorization", "x-api-key"]
 * });
 * 
 * const response = yield* recorder.execute(
 *   HttpClientRequest.get("https://api.example.com/data")
 * );
 * ```
 * 
 * @example
 * With redaction:
 * ```typescript
 * import { createHeaderRedactor, createJsonRedactor, compose } from "@akoenig/effect-http-recorder";
 * 
 * const recorder = yield* HttpRecorder({
 *   path: "./recordings",
 *   mode: "record",
 *   redactionFn: compose(
 *     createHeaderRedactor(["x-api-key", "authorization"]),
 *     createJsonRedactor(["user.email", "user.phone"])
 *   )
 * });
 * ```
 */
export function HttpRecorder(config: HttpRecorderConfig): Effect.Effect<
  HttpClient.HttpClient,
  never,
  FileSystem.FileSystem | Path.Path | HttpClient.HttpClient
> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const httpClient = yield* HttpClient.HttpClient;

    const excludedHeaders = new Set([
      ...DEFAULT_EXCLUDED_HEADERS,
      ...(config.excludedHeaders ?? []).map((h: string) => h.toLowerCase()),
    ]);

    function filterHeaders(
      headers: Record<string, string>,
    ): Record<string, string> {
      const filtered: Record<string, string> = {};

      for (const [key, value] of Object.entries(headers)) {
        if (!excludedHeaders.has(key.toLowerCase())) {
          filtered[key] = value;
        }
      }

      return filtered;
    }

    function applyRedaction(
      request: HttpClientRequest.HttpClientRequest,
      response: HttpClientResponse.HttpClientResponse,
      requestBody: unknown,
      responseBody: unknown,
    ): {
      redactedRequest: { headers: Record<string, string>; body: unknown };
      redactedResponse: { headers: Record<string, string>; body: unknown };
    } {
      if (!config.redactionFn) {
        return {
          redactedRequest: {
            headers: filterHeaders(request.headers),
            body: requestBody,
          },
          redactedResponse: {
            headers: filterHeaders(response.headers),
            body: responseBody,
          },
        };
      }

      // Apply redaction first, before filtering sensitive headers
      const requestContext: RedactionContext = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: requestBody,
        type: "request",
      };

      const responseContext: RedactionContext = {
        method: request.method,
        url: request.url,
        headers: response.headers,
        body: responseBody,
        type: "response",
        status: response.status,
      };

      const redactedRequestResult = config.redactionFn(requestContext);
      const redactedResponseResult = config.redactionFn(responseContext);

      // When redaction is provided, trust the redaction function to handle security
      // and bypass default header filtering
      return {
        redactedRequest: {
          headers: redactedRequestResult.headers ?? requestContext.headers,
          body: redactedRequestResult.body ?? requestContext.body,
        },
        redactedResponse: {
          headers: redactedResponseResult.headers ?? responseContext.headers,
          body: redactedResponseResult.body ?? responseContext.body,
        },
      };
    }

    function createSlug(input: string): string {
      return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    function generateTransactionId(
      request: HttpClientRequest.HttpClientRequest,
    ): string {
      const method = request.method.toUpperCase();
      const urlPath = new URL(request.url).pathname;
      const sluggedPath = createSlug(urlPath);
      const timestamp = Date.now();
      return `${timestamp}__${method}__${sluggedPath}`;
    }

    function getRecordingFilePath(transactionId: string): string {
      return path.join(config.path, `${transactionId}.json`);
    }

    function ensureDirectoryExists(
      dirPath: string,
    ): Effect.Effect<void, HttpRecorderError> {
      return Effect.gen(function* () {
        yield* fs.makeDirectory(dirPath, { recursive: true }).pipe(
          Effect.mapError(
            (error) =>
              new HttpRecorderError({
                message: `Failed to create directory: ${String(error)}`,
              }),
          ),
        );
      });
    }

    function recordTransaction(
      request: HttpClientRequest.HttpClientRequest,
      response: HttpClientResponse.HttpClientResponse,
      responseBody: unknown,
    ): Effect.Effect<void, HttpRecorderError> {
      return Effect.gen(function* () {
        const transactionId = generateTransactionId(request);
        const filePath = getRecordingFilePath(transactionId);

        yield* ensureDirectoryExists(config.path);

        const requestBody = request.body?._tag === "Raw" 
          ? request.body.body 
          : request.body?._tag === "Uint8Array" 
            ? new TextDecoder().decode(request.body.body)
            : undefined;

        // Parse JSON bodies for redaction if possible
        const parsedRequestBody = (() => {
          if (typeof requestBody === "string") {
            try {
              return JSON.parse(requestBody);
            } catch {
              return requestBody;
            }
          }
          return requestBody;
        })();

        const parsedResponseBody = (() => {
          if (typeof responseBody === "string") {
            try {
              return JSON.parse(responseBody);
            } catch {
              return responseBody;
            }
          }
          return responseBody;
        })();

        const { redactedRequest, redactedResponse } = applyRedaction(
          request,
          response,
          parsedRequestBody,
          parsedResponseBody,
        );

        // Serialize redacted bodies back to appropriate format
        const finalRequestBody = (() => {
          if (redactedRequest.body !== undefined && redactedRequest.body !== requestBody) {
            // Body was redacted, serialize it
            return typeof requestBody === "string" 
              ? JSON.stringify(redactedRequest.body)
              : redactedRequest.body;
          }
          return requestBody;
        })();

        const transaction: RecordedTransaction = {
          id: transactionId,
          request: {
            method: request.method,
            url: request.url,
            headers: redactedRequest.headers,
            body: finalRequestBody,
          },
          response: {
            status: response.status,
            headers: redactedResponse.headers,
            body: redactedResponse.body,
          },
          timestamp: new Date().toISOString(),
        };

        yield* fs
          .writeFileString(filePath, JSON.stringify(transaction, null, 2))
          .pipe(
            Effect.mapError(
              (error) =>
                new HttpRecorderError({
                  message: `Failed to write recording: ${String(error)}`,
                }),
            ),
          );
      });
    }

    function findMatchingRecording(
      request: HttpClientRequest.HttpClientRequest,
    ): Effect.Effect<RecordedTransaction | null, HttpRecorderError> {
      return Effect.gen(function* () {
        const files = yield* fs.readDirectory(config.path).pipe(
          Effect.mapError(
            (error) =>
              new HttpRecorderError({
                message: `Failed to read directory: ${String(error)}`,
              }),
          ),
        );
        const jsonFiles = files.filter((file) => file.endsWith(".json"));

        for (const file of jsonFiles) {
          const filePath = path.join(config.path, file);
          const content = yield* fs.readFileString(filePath).pipe(
            Effect.mapError(
              (error) =>
                new HttpRecorderError({
                  message: `Failed to read file: ${String(error)}`,
                }),
            ),
          );
          let transaction: RecordedTransaction;
          try {
            transaction = JSON.parse(content) as RecordedTransaction;
          } catch {
            // Skip invalid JSON files and continue to next file
            continue;
          }

          if (
            transaction.request.method === request.method &&
            transaction.request.url === request.url
          ) {
            return transaction;
          }
        }

        return null;
      });
    }

    function createResponseFromRecording(
      transaction: RecordedTransaction,
      request: HttpClientRequest.HttpClientRequest,
    ): HttpClientResponse.HttpClientResponse {
      // Note: In replay mode, we use the recorded data as-is
      // The data has already been redacted when it was recorded
      const webResponse = new Response(
        typeof transaction.response.body === "string"
          ? transaction.response.body
          : JSON.stringify(transaction.response.body),
        {
          status: transaction.response.status,
          headers: transaction.response.headers,
        },
      );

      return HttpClientResponse.fromWeb(request, webResponse);
    }

    function execute(
      request: HttpClientRequest.HttpClientRequest,
    ): Effect.Effect<
      HttpClientResponse.HttpClientResponse,
      HttpClientError.HttpClientError
    > {
      return Effect.gen(function* () {
        if (config.mode === "replay") {
          const recording = yield* findMatchingRecording(request).pipe(
            Effect.mapError(
              (error) =>
                new HttpClientError.RequestError({
                  request,
                  reason: "Transport",
                  description: `Recording error: ${error.message}`,
                }),
            ),
          );

          if (recording) {
            return createResponseFromRecording(recording, request);
          }

          return yield* Effect.fail(
            new HttpClientError.RequestError({
              request,
              reason: "Transport",
              description: "No matching recording found",
            }),
          );
        }

        const response = yield* httpClient.execute(request);
        const responseBody = yield* response.json.pipe(
          Effect.catchAll(() => response.text),
          Effect.catchAll(() => Effect.succeed(null)),
        );

        yield* recordTransaction(request, response, responseBody).pipe(
          Effect.catchAll((error) =>
            Effect.logWarning(
              `Failed to record transaction: ${error.message}`,
            ),
          ),
        );

        return response;
      });
    }

    return HttpClient.make(execute);
  });
}
