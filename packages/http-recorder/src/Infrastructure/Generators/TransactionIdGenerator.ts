/**
 * @since 1.0.0
 */
import type { HttpClientRequest } from "@effect/platform";
import { DateTime, Effect, Schema } from "effect";
import {
  CreateTransactionId,
  StringToSlug,
  type TransactionId,
} from "../../Domain/ValueObjects/TransactionId.js";

/**
 * @since 1.0.0
 * @category generators
 * @summary Generates unique transaction IDs based on HTTP requests and timestamps
 */
export class TransactionIdGenerator extends Effect.Service<TransactionIdGenerator>()(
  "@akoenig/effect-http-recorder/TransactionIdGenerator",
  {
    succeed: {
      /**
       * Generate a unique transaction ID for an HTTP request
       * @since 1.0.0
       */
      generate(
        request: HttpClientRequest.HttpClientRequest,
        now: DateTime.DateTime,
      ) {
        const method = request.method;
        const urlPath = new URL(request.url).pathname;
        const sluggedPath = Schema.decodeSync(StringToSlug)(urlPath);
        const timestamp = DateTime.toEpochMillis(now);

        return Schema.decodeSync(CreateTransactionId)({
          timestamp,
          method,
          slug: sluggedPath,
        });
      },

      /**
       * Generate a unique transaction ID for the current moment
       * @since 1.0.0
       */
      generateNow(request: HttpClientRequest.HttpClientRequest) {
        const now = DateTime.unsafeNow();
        return this.generate(request, now);
      },
    },
  },
) {}
