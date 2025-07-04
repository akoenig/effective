/**
 * @since 1.0.0
 */
import type { HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { DateTime, Effect, Predicate } from "effect";
import { RecordedTransaction } from "../Domain/Entities/RecordedTransaction.js";
import type { HttpRecorderConfig } from "../Domain/ValueObjects/HttpRecorderConfig.js";
import { TransactionIdGenerator } from "../Infrastructure/Generators/TransactionIdGenerator.js";
import { TransactionSerializer } from "../Infrastructure/Serialization/TransactionSerializer.js";
import { FileSystemTransactionRepository } from "../Repositories/FileSystemTransactionRepository.js";
import { HeaderService } from "./HeaderService.js";
import { RedactionService } from "./RedactionService.js";

/**
 * @since 1.0.0
 * @category predicates
 * @internal
 */
const isRawBody = (body: unknown): body is { _tag: "Raw"; body: unknown } =>
  body != null &&
  typeof body === "object" &&
  "_tag" in body &&
  body._tag === "Raw";

/**
 * @since 1.0.0
 * @category predicates
 * @internal
 */
const isUint8ArrayBody = (
  body: unknown,
): body is { _tag: "Uint8Array"; body: Uint8Array } =>
  body != null &&
  typeof body === "object" &&
  "_tag" in body &&
  body._tag === "Uint8Array";

/**
 * @since 1.0.0
 * @category predicates
 * @internal
 */
const isRedactedBodyChanged =
  (originalBody: unknown) =>
  (redactedBody: unknown): boolean =>
    Predicate.isNotUndefined(redactedBody) && redactedBody !== originalBody;

/**
 * @since 1.0.0
 * @category services
 * @summary Service for recording HTTP transactions with redaction and persistence
 */
export class RecordingService extends Effect.Service<RecordingService>()(
  "@akoenig/effect-http-recorder/RecordingService",
  {
    dependencies: [
      RedactionService.Default,
      HeaderService.Default,
      FileSystemTransactionRepository.Default,
      TransactionIdGenerator.Default,
      TransactionSerializer.Default,
    ],
    effect: Effect.gen(function* () {
      const redactionService = yield* RedactionService;
      const repository = yield* FileSystemTransactionRepository;
      const transactionIdGenerator = yield* TransactionIdGenerator;
      const transactionSerializer = yield* TransactionSerializer;

      /**
       * Extract request body based on its type
       * @since 1.0.0
       * @internal
       */
      function extractRequestBody(
        request: HttpClientRequest.HttpClientRequest,
      ) {
        const hasRawBody = isRawBody(request.body);
        const hasUint8ArrayBody = isUint8ArrayBody(request.body);

        return hasRawBody
          ? request.body.body
          : hasUint8ArrayBody
            ? new TextDecoder().decode(request.body.body)
            : undefined;
      }

      /**
       * Prepare final request body with potential serialization
       * @since 1.0.0
       * @internal
       */
      function prepareFinalRequestBody(
        originalBody: unknown,
        redactedBody: unknown,
      ) {
        return Effect.gen(function* () {
          const wasBodyRedacted =
            isRedactedBodyChanged(originalBody)(redactedBody);
          const shouldSerializeBody = Predicate.isString(originalBody);

          return wasBodyRedacted
            ? shouldSerializeBody
              ? yield* transactionSerializer.serializeBody(redactedBody)
              : redactedBody
            : originalBody;
        });
      }

      return {
        /**
         * Record a complete HTTP transaction
         * @since 1.0.0
         */
        recordTransaction(
          request: HttpClientRequest.HttpClientRequest,
          response: HttpClientResponse.HttpClientResponse,
          responseBody: unknown,
          config: HttpRecorderConfig,
          excludedHeaders: Set<string>,
        ) {
          return Effect.gen(function* () {
            const now = yield* DateTime.now;

            const transactionId = transactionIdGenerator.generate(request, now);
            const filePath = `${config.path}/${transactionId}.json`;

            yield* repository.ensureStorageExists(config.path);

            const requestBody = extractRequestBody(request);

            const parsedRequestBody =
              yield* transactionSerializer.parseJsonBody(requestBody);

            const parsedResponseBody =
              yield* transactionSerializer.parseJsonBody(responseBody);

            const { redactedRequest, redactedResponse } =
              yield* redactionService.applyRedaction(
                request,
                response,
                parsedRequestBody,
                parsedResponseBody,
                config,
                excludedHeaders,
              );

            const finalRequestBody = yield* prepareFinalRequestBody(
              requestBody,
              redactedRequest.body,
            );

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

            yield* repository.save(transaction, filePath);
          });
        },
      };
    }),
  },
) {}
