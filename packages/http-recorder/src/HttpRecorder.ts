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
 * Configuration for the HttpRecorder
 */
export interface HttpRecorderConfig {
  readonly path: string;
  readonly mode: "record" | "replay";
  readonly excludedHeaders?: ReadonlyArray<string>;
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
 * Recording HttpClient service with parameter support
 */
export class HttpRecorder extends Effect.Service<HttpRecorder>()(
  "HttpRecorder",
  {
    effect: Effect.fn(function* (config: HttpRecorderConfig) {
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
        const method = request.method.toLowerCase();
        const urlPath = new URL(request.url).pathname;
        const sluggedPath = createSlug(urlPath);
        const timestamp = Date.now();
        return `${method}__${sluggedPath}__${timestamp}`;
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

          const requestBody =
            request.body?._tag === "Raw" ? request.body.body : undefined;

          const transaction: RecordedTransaction = {
            id: transactionId,
            request: {
              method: request.method,
              url: request.url,
              headers: filterHeaders(request.headers),
              body: requestBody,
            },
            response: {
              status: response.status,
              headers: filterHeaders(response.headers),
              body: responseBody,
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
            const transaction = JSON.parse(content) as RecordedTransaction;

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
    }),
  },
) {}
