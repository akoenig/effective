import * as fs from "node:fs";
import * as path from "node:path";
import {
	HttpClient,
	HttpClientError,
	type HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { Context, Effect, Layer, Schema } from "effect";

/**
 * Configuration for the RecordingHttpClient
 */
export interface RecordingHttpClientConfig {
	readonly path: string;
	readonly mode: "record" | "replay";
	readonly excludedHeaders?: ReadonlyArray<string>;
}

/**
 * Schema for RecordingHttpClient configuration
 */
export const RecordingHttpClientConfigSchema = Schema.Struct({
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
export class RecordingHttpClientError extends Schema.TaggedError<RecordingHttpClientError>()(
	"RecordingHttpClientError",
	{
		message: Schema.String,
	},
) {}

/**
 * Configuration service for RecordingHttpClient
 */
export class RecordingHttpClientConfigService extends Context.Tag(
	"RecordingHttpClientConfig",
)<RecordingHttpClientConfigService, RecordingHttpClientConfig>() {}

/**
 * Creates a recording HttpClient implementation
 */
const makeRecordingHttpClient = Effect.gen(function* () {
	const httpClient = yield* HttpClient.HttpClient;
	const config = yield* RecordingHttpClientConfigService;

	const excludedHeaders = new Set([
		...DEFAULT_EXCLUDED_HEADERS,
		...(config.excludedHeaders ?? []).map((h: string) => h.toLowerCase()),
	]);

	const filterHeaders = (
		headers: Record<string, string>,
	): Record<string, string> => {
		const filtered: Record<string, string> = {};
		for (const [key, value] of Object.entries(headers)) {
			if (!excludedHeaders.has(key.toLowerCase())) {
				filtered[key] = value;
			}
		}
		return filtered;
	};

	const generateTransactionId = (
		request: HttpClientRequest.HttpClientRequest,
	): string => {
		const method = request.method;
		const url = request.url;
		const timestamp = Date.now();
		return `${method}_${encodeURIComponent(url)}_${timestamp}`;
	};

	const getRecordingFilePath = (transactionId: string): string => {
		return path.join(config.path, `${transactionId}.json`);
	};

	const ensureDirectoryExists = (
		dirPath: string,
	): Effect.Effect<void, RecordingHttpClientError> => {
		return Effect.gen(function* () {
			try {
				yield* Effect.promise(() =>
					fs.promises.mkdir(dirPath, { recursive: true }),
				);
			} catch (error) {
				return yield* Effect.fail(
					new RecordingHttpClientError({
						message: `Failed to create directory: ${String(error)}`,
					}),
				);
			}
		});
	};

	const recordTransaction = (
		request: HttpClientRequest.HttpClientRequest,
		response: HttpClientResponse.HttpClientResponse,
		responseBody: unknown,
	): Effect.Effect<void, RecordingHttpClientError> => {
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

			try {
				yield* Effect.promise(() =>
					fs.promises.writeFile(
						filePath,
						JSON.stringify(transaction, null, 2),
					),
				);
			} catch (error) {
				return yield* Effect.fail(
					new RecordingHttpClientError({
						message: `Failed to write recording: ${String(error)}`,
					}),
				);
			}
		});
	};

	const findMatchingRecording = (
		request: HttpClientRequest.HttpClientRequest,
	): Effect.Effect<
		RecordedTransaction | null,
		RecordingHttpClientError
	> => {
		return Effect.gen(function* () {
			try {
				const files = yield* Effect.promise(() =>
					fs.promises.readdir(config.path),
				);
				const jsonFiles = files.filter((file) => file.endsWith(".json"));

				for (const file of jsonFiles) {
					const filePath = path.join(config.path, file);
					const content = yield* Effect.promise(() =>
						fs.promises.readFile(filePath, "utf8"),
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
			} catch (error) {
				return yield* Effect.fail(
					new RecordingHttpClientError({
						message: `Failed to find matching recording: ${String(error)}`,
					}),
				);
			}
		});
	};

	const createResponseFromRecording = (
		transaction: RecordedTransaction,
		request: HttpClientRequest.HttpClientRequest,
	): HttpClientResponse.HttpClientResponse => {
		// Create a mock web Response to use with fromWeb
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
	};

	const execute = (
		request: HttpClientRequest.HttpClientRequest,
	): Effect.Effect<
		HttpClientResponse.HttpClientResponse,
		HttpClientError.HttpClientError
	> => {
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

			// Record mode - execute the request and record the response
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
	};

	return HttpClient.make(execute);
})

/**
 * Creates a layer that provides an HttpClient with recording/replay capabilities
 */
export const createRecordingHttpClientLayer = (
	config: RecordingHttpClientConfig,
): Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient> => {
	const configLayer = Layer.succeed(RecordingHttpClientConfigService, config);
	const httpClientLayer = Layer.effect(HttpClient.HttpClient, makeRecordingHttpClient);
	
	return Layer.provide(httpClientLayer, configLayer);
};

/**
 * RecordingHttpClient namespace with convenient layer creation functions
 */
export const RecordingHttpClient = {
	/**
	 * Creates an HttpClient layer with recording/replay capabilities
	 */
	layer: (config: RecordingHttpClientConfig) =>
		createRecordingHttpClientLayer(config),
};
