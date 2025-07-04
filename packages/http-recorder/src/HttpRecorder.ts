/**
 * @since 1.0.0
 */
import type { HttpClientRequest } from "@effect/platform";
import {
  FileSystem,
  HttpClient,
  HttpClientError,
  HttpClientResponse,
  Path,
} from "@effect/platform";
import { type Config, Context, DateTime, Effect, Layer, Schema } from "effect";

/**
 * @since 1.0.0
 * @category schemas
 */
export class RedactionContext extends Schema.Class<RedactionContext>(
  "RedactionContext",
)({
  method: Schema.String,
  url: Schema.String,
  headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  body: Schema.optional(Schema.Unknown),
  type: Schema.Literal("request", "response"),
  status: Schema.optional(Schema.Number),
}) {}

/**
 * @since 1.0.0
 * @category schemas
 */
export class RedactionResult extends Schema.Class<RedactionResult>(
  "RedactionResult",
)({
  headers: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String }),
  ),
  body: Schema.optional(Schema.Unknown),
}) {}

/**
 * @since 1.0.0
 * @category models
 */
export type RedactionFunction = (context: RedactionContext) => RedactionResult;

/**
 * @since 1.0.0
 * @category schemas
 */
export class HttpRecorderConfig extends Schema.Class<HttpRecorderConfig>(
  "HttpRecorderConfig",
)({
  path: Schema.String,
  mode: Schema.Literal("record", "replay"),
  excludedHeaders: Schema.optional(Schema.Array(Schema.String)),
  redactionFn: Schema.optional(
    Schema.Unknown as Schema.Schema<RedactionFunction>,
  ),
  headers: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown as Schema.Schema<Config.Config<string>>,
    }),
  ),
}) {}

/**
 * @since 1.0.0
 * @category schemas
 */
const TransactionId = Schema.String.pipe(
  Schema.pattern(/^\d+__[A-Z]+_[a-z0-9-]*$/),
  Schema.brand("TransactionId"),
);

/**
 * @since 1.0.0
 * @category schemas
 */
export class RecordedTransaction extends Schema.Class<RecordedTransaction>(
  "RecordedTransaction",
)({
  id: TransactionId,
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
}) {}

/**
 * @since 1.0.0
 * @category errors
 */
export class HttpRecorderError extends Schema.TaggedError<HttpRecorderError>()(
  "HttpRecorderError",
  {
    message: Schema.String,
  },
) {}

/**
 * @since 1.0.0
 * @category tags
 */
export class RecorderConfig extends Context.Tag(
  "@effect/http-recorder/RecorderConfig",
)<RecorderConfig, HttpRecorderConfig>() {}

/**
 * @since 1.0.0
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
 */
const filterHeaders = (
  headers: Record<string, string>,
  excludedHeaders: Set<string>,
): Record<string, string> => {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!excludedHeaders.has(key.toLowerCase())) {
      filtered[key] = value;
    }
  }
  return filtered;
};

/**
 * @since 1.0.0
 */
const applyRedaction = (
  request: HttpClientRequest.HttpClientRequest,
  response: HttpClientResponse.HttpClientResponse,
  requestBody: unknown,
  responseBody: unknown,
  config: HttpRecorderConfig,
  excludedHeaders: Set<string>,
): {
  redactedRequest: { headers: Record<string, string>; body: unknown };
  redactedResponse: { headers: Record<string, string>; body: unknown };
} => {
  if (!config.redactionFn) {
    return {
      redactedRequest: {
        headers: filterHeaders(request.headers, excludedHeaders),
        body: requestBody,
      },
      redactedResponse: {
        headers: filterHeaders(response.headers, excludedHeaders),
        body: responseBody,
      },
    };
  }

  const requestContext = RedactionContext.make({
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: requestBody,
    type: "request",
  });

  const responseContext = RedactionContext.make({
    method: request.method,
    url: request.url,
    headers: response.headers,
    body: responseBody,
    type: "response",
    status: response.status,
  });

  const redactedRequestResult = config.redactionFn(requestContext);
  const redactedResponseResult = config.redactionFn(responseContext);

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
};

/**
 * @since 1.0.0
 * @category schemas
 */
const Slug = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9-]*$/),
  Schema.brand("Slug"),
);

/**
 * @since 1.0.0
 * @category schemas
 */
const StringToSlug = Schema.transform(Schema.String, Slug, {
  decode: (input: string) =>
    input
      .toLowerCase()
      .trim()
      .replace(/\//g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  encode: (slug) => slug,
});

/**
 * @since 1.0.0
 * @category schemas
 */
const CreateTransactionId = Schema.transform(
  Schema.Struct({
    timestamp: Schema.Number,
    method: Schema.String,
    slug: Slug,
  }),
  TransactionId,
  {
    strict: true,
    decode: ({ timestamp, method, slug }) =>
      `${timestamp}__${method.toUpperCase()}_${slug}` as Schema.Schema.Type<
        typeof TransactionId
      >,
    encode: (id) => {
      const [timestamp, rest = ""] = id.split("__");
      const [method = "", slug = ""] = rest.split("_", 2);
      return {
        timestamp: Number(timestamp),
        method,
        slug: slug as Schema.Schema.Type<typeof Slug>,
      };
    },
  },
);

/**
 * @since 1.0.0
 */
const generateTransactionId = (
  request: HttpClientRequest.HttpClientRequest,
  now: DateTime.DateTime,
): Schema.Schema.Type<typeof TransactionId> => {
  const method = request.method;
  const urlPath = new URL(request.url).pathname;
  const sluggedPath = Schema.decodeSync(StringToSlug)(urlPath);
  const timestamp = DateTime.toEpochMillis(now);

  return Schema.decodeSync(CreateTransactionId)({
    timestamp,
    method,
    slug: sluggedPath,
  });
};

/**
 * @since 1.0.0
 */
const ensureDirectoryExists = (
  dirPath: string,
): Effect.Effect<void, HttpRecorderError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    yield* fs.makeDirectory(dirPath, { recursive: true }).pipe(
      Effect.mapError(
        (error) =>
          new HttpRecorderError({
            message: `Failed to create directory: ${String(error)}`,
          }),
      ),
    );
  });

/**
 * @since 1.0.0
 */
const recordTransaction = (
  request: HttpClientRequest.HttpClientRequest,
  response: HttpClientResponse.HttpClientResponse,
  responseBody: unknown,
  config: HttpRecorderConfig,
  excludedHeaders: Set<string>,
): Effect.Effect<void, HttpRecorderError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const now = yield* DateTime.now;

    const transactionId = generateTransactionId(request, now);
    const filePath = path.join(config.path, `${transactionId}.json`);

    yield* ensureDirectoryExists(config.path);

    const requestBody =
      request.body?._tag === "Raw"
        ? request.body.body
        : request.body?._tag === "Uint8Array"
          ? new TextDecoder().decode(request.body.body)
          : undefined;

    const parsedRequestBody =
      typeof requestBody === "string"
        ? yield* Schema.decodeUnknown(Schema.parseJson(Schema.Unknown))(
            requestBody,
          ).pipe(Effect.catchAll(() => Effect.succeed(requestBody)))
        : requestBody;

    const parsedResponseBody =
      typeof responseBody === "string"
        ? yield* Schema.decodeUnknown(Schema.parseJson(Schema.Unknown))(
            responseBody,
          ).pipe(Effect.catchAll(() => Effect.succeed(responseBody)))
        : responseBody;

    const { redactedRequest, redactedResponse } = applyRedaction(
      request,
      response,
      parsedRequestBody,
      parsedResponseBody,
      config,
      excludedHeaders,
    );

    const finalRequestBody =
      redactedRequest.body !== undefined && redactedRequest.body !== requestBody
        ? typeof requestBody === "string"
          ? yield* Schema.encode(Schema.parseJson(Schema.Unknown))(
              redactedRequest.body,
            ).pipe(
              Effect.mapError(
                (error) =>
                  new HttpRecorderError({
                    message: `Failed to serialize request body: ${String(error)}`,
                  }),
              ),
            )
          : redactedRequest.body
        : requestBody;

    const transaction = RecordedTransaction.make({
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
      timestamp: DateTime.formatIso(now),
    });

    const serializedTransaction = yield* Schema.encode(
      Schema.parseJson(RecordedTransaction),
    )(transaction).pipe(
      Effect.mapError(
        (error) =>
          new HttpRecorderError({
            message: `Failed to serialize transaction: ${String(error)}`,
          }),
      ),
    );

    yield* fs.writeFileString(filePath, serializedTransaction).pipe(
      Effect.mapError(
        (error) =>
          new HttpRecorderError({
            message: `Failed to write recording: ${String(error)}`,
          }),
      ),
    );
  });

/**
 * @since 1.0.0
 */
const findMatchingRecording = (
  request: HttpClientRequest.HttpClientRequest,
  config: HttpRecorderConfig,
): Effect.Effect<
  RecordedTransaction | null,
  HttpRecorderError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

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

      const parseResult = yield* Schema.decodeUnknown(
        Schema.parseJson(RecordedTransaction),
      )(content).pipe(Effect.catchAll(() => Effect.succeed(null)));

      if (!parseResult) {
        continue;
      }

      const transaction = parseResult;

      if (
        transaction.request.method === request.method &&
        transaction.request.url === request.url
      ) {
        return transaction;
      }
    }

    return null;
  });

/**
 * @since 1.0.0
 */
const createResponseFromRecording = (
  transaction: RecordedTransaction,
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpRecorderError,
  never
> =>
  Effect.gen(function* () {
    const bodyString =
      typeof transaction.response.body === "string"
        ? transaction.response.body
        : yield* Schema.encode(Schema.parseJson(Schema.Unknown))(
            transaction.response.body,
          ).pipe(
            Effect.mapError(
              (error) =>
                new HttpRecorderError({
                  message: `Failed to serialize response body: ${String(error)}`,
                }),
            ),
          );

    const webResponse = new Response(bodyString, {
      status: transaction.response.status,
      headers: transaction.response.headers,
    });

    return HttpClientResponse.fromWeb(request, webResponse);
  });

/**
 * @since 1.0.0
 */
const resolveHeaders = (
  configHeaders: Record<string, Config.Config<string>> | undefined,
): Effect.Effect<Record<string, string>, never, never> =>
  Effect.gen(function* () {
    if (!configHeaders) {
      return {};
    }

    const resolvedHeaders: Record<string, string> = {};
    for (const [key, configValue] of Object.entries(configHeaders)) {
      const value = yield* configValue.pipe(
        Effect.orElse(() => Effect.succeed("")),
      );
      if (value) {
        resolvedHeaders[key] = value;
      }
    }

    return resolvedHeaders;
  });

/**
 * @since 1.0.0
 */
const layerImpl = (
  config: HttpRecorderConfig,
): Layer.Layer<
  HttpClient.HttpClient,
  never,
  HttpClient.HttpClient | FileSystem.FileSystem | Path.Path
> =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function* () {
      const baseHttpClient = yield* HttpClient.HttpClient;
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const excludedHeaders = new Set([
        ...DEFAULT_EXCLUDED_HEADERS,
        ...(config.excludedHeaders ?? []).map((h: string) => h.toLowerCase()),
      ]);

      return HttpClient.transform(baseHttpClient, (_effect, request) =>
        Effect.gen(function* () {
          // Resolve headers for each request
          const resolvedHeaders = yield* resolveHeaders(config.headers);

          // Merge resolved headers with request headers
          const enhancedRequest: HttpClientRequest.HttpClientRequest = {
            ...request,
            headers: {
              ...resolvedHeaders,
              ...request.headers,
            },
          };

          if (config.mode === "replay") {
            const recording = yield* findMatchingRecording(
              enhancedRequest,
              config,
            ).pipe(
              Effect.provide(Layer.succeed(FileSystem.FileSystem, fileSystem)),
              Effect.provide(Layer.succeed(Path.Path, path)),
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
              return yield* createResponseFromRecording(
                recording,
                enhancedRequest,
              ).pipe(
                Effect.mapError(
                  (error) =>
                    new HttpClientError.RequestError({
                      request: enhancedRequest,
                      reason: "Transport",
                      description: `Response creation error: ${error.message}`,
                    }),
                ),
              );
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
          const responseBody = yield* response.json.pipe(
            Effect.catchAll(() => response.text),
            Effect.catchAll(() => Effect.succeed(null)),
          );

          yield* recordTransaction(
            enhancedRequest,
            response,
            responseBody,
            config,
            excludedHeaders,
          ).pipe(
            Effect.provide(Layer.succeed(FileSystem.FileSystem, fileSystem)),
            Effect.provide(Layer.succeed(Path.Path, path)),
            Effect.catchAll((error) =>
              Effect.logWarning(
                `Failed to record transaction: ${error.message}`,
              ),
            ),
          );

          return response;
        }),
      );
    }),
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
}): Layer.Layer<
  HttpClient.HttpClient,
  never,
  HttpClient.HttpClient | FileSystem.FileSystem | Path.Path
> => layerImpl(HttpRecorderConfig.make(options));

/**
 * @since 1.0.0
 * @category namespace
 */
export const HttpRecorder = {
  /**
   * @since 1.0.0
   * @category layers
   */
  layer: layerImpl,
  /**
   * @since 1.0.0
   * @category layers
   */
  layerWithHeaders,
} as const;
