/**
 * @since 1.0.0
 */
import type { HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { Effect, Predicate } from "effect";
import type { HttpRecorderConfig } from "../Domain/ValueObjects/HttpRecorderConfig.js";
import { RedactionContext } from "../Domain/ValueObjects/RedactionContext.js";
import { HeaderService } from "./HeaderService.js";

/**
 * @since 1.0.0
 * @category services
 * @summary Service for applying data redaction to HTTP requests and responses
 */
export class RedactionService extends Effect.Service<RedactionService>()(
  "@akoenig/effect-http-recorder/RedactionService",
  {
    dependencies: [HeaderService.Default],
    effect: Effect.gen(function* () {
      const headerService = yield* HeaderService;

      return {
        /**
         * Apply redaction rules to request and response data
         * @since 1.0.0
         */
        applyRedaction(
          request: HttpClientRequest.HttpClientRequest,
          response: HttpClientResponse.HttpClientResponse,
          requestBody: unknown,
          responseBody: unknown,
          config: HttpRecorderConfig,
          excludedHeaders: Set<string>,
        ) {
          const { redactionFn } = config;
          
          const shouldSkipRedaction = Predicate.isUndefined(redactionFn);

          if (shouldSkipRedaction) {
            return Effect.succeed({
              redactedRequest: {
                headers: headerService.filterHeaders(
                  request.headers,
                  excludedHeaders,
                ),
                body: requestBody,
              },
              redactedResponse: {
                headers: headerService.filterHeaders(
                  response.headers,
                  excludedHeaders,
                ),
                body: responseBody,
              },
            });
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

          const redactedRequestResult = redactionFn(requestContext);
          const redactedResponseResult = redactionFn(responseContext);

          return Effect.succeed({
            redactedRequest: {
              headers: redactedRequestResult.headers ?? requestContext.headers,
              body: redactedRequestResult.body ?? requestContext.body,
            },
            redactedResponse: {
              headers: redactedResponseResult.headers ?? responseContext.headers,
              body: redactedResponseResult.body ?? responseContext.body,
            },
          });
        },

        /**
         * Check if redaction should be applied
         * @since 1.0.0
         */
        shouldApplyRedaction(config: HttpRecorderConfig) {
          return Predicate.isNotUndefined(config.redactionFn);
        },
      };
    }),
  },
) {}
