/**
 * @since 1.0.0
 */
import type { Config } from "effect";
import { Effect } from "effect";

/**
 * @since 1.0.0
 * @category services
 * @summary Service for processing and managing HTTP headers
 */
export class HeaderService extends Effect.Service<HeaderService>()(
  "@akoenig/effect-http-recorder/HeaderService",
  {
    succeed: {
      /**
       * Filter out excluded headers from a headers object
       * @since 1.0.0
       */
      filterHeaders(
        headers: Record<string, string>,
        excludedHeaders: Set<string>,
      ) {
        const filtered: Record<string, string> = {};

        for (const [key, value] of Object.entries(headers)) {
          if (!excludedHeaders.has(key.toLowerCase())) {
            filtered[key] = value;
          }
        }

        return filtered;
      },

      /**
       * Resolve configuration-based headers to actual values
       * @since 1.0.0
       */
      resolveHeaders(
        configHeaders: Record<string, Config.Config<string>> | undefined,
      ) {
        return Effect.gen(function* () {
          const hasNoConfigHeaders = !configHeaders;

          if (hasNoConfigHeaders) {
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
      },

      /**
       * Merge multiple header objects with precedence
       * @since 1.0.0
       */
      mergeHeaders(...headerObjects: Array<Record<string, string>>) {
        return Object.assign({}, ...headerObjects);
      },

      /**
       * Create excluded headers set from array with case normalization
       * @since 1.0.0
       */
      createExcludedHeadersSet(
        defaultHeaders: readonly string[],
        customHeaders: readonly string[] = [],
      ) {
        return new Set([
          ...defaultHeaders,
          ...customHeaders.map((h) => h.toLowerCase()),
        ]);
      },
    },
  },
) {}
