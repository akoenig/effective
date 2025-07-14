import { HttpClient, HttpClientRequest } from '@effect/platform'
import { Effect } from 'effect'
import { ApiError, HttpError } from '../../Domain/Errors/index.js'

/**
 * Configuration for the GitHub HTTP client
 */
export interface GitHubHttpClientConfig {
  readonly baseUrl?: string
  readonly userAgent?: string
}

/**
 * GitHub-specific HTTP client service that wraps the Effect HTTP client
 * with GitHub API conventions and error handling.
 */
export class GitHubHttpClientService extends Effect.Service<GitHubHttpClientService>()(
  'GitHubHttpClient',
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient
      const config = yield* GitHubHttpClientConfigService

      const baseUrl = config.baseUrl ?? 'https://api.github.com'
      const userAgent = config.userAgent ?? '@akoenig/effect-github'

      const makeRequest = <A>(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: string,
        options: {
          readonly headers?: Record<string, string>
          readonly searchParams?: Record<string, string>
          readonly body?: unknown
        } = {},
      ): Effect.Effect<A, HttpError | ApiError> => {
        return Effect.gen(function* () {
          const url = new URL(path, baseUrl)

          // Add search params if provided
          if (options.searchParams) {
            Object.entries(options.searchParams).forEach(([key, value]) => {
              if (value !== undefined) {
                url.searchParams.set(key, String(value))
              }
            })
          }

          let request = HttpClientRequest.make(method)(url.toString())
          request = HttpClientRequest.setHeader(
            'User-Agent',
            userAgent,
          )(request)
          request = HttpClientRequest.setHeader(
            'Accept',
            'application/vnd.github+json',
          )(request)
          request = HttpClientRequest.setHeader(
            'X-GitHub-Api-Version',
            '2022-11-28',
          )(request)

          // Add custom headers
          if (options.headers) {
            request = Object.entries(options.headers).reduce(
              (req, [key, value]) =>
                HttpClientRequest.setHeader(key, value)(req),
              request,
            )
          }

          // Add body for POST/PUT/PATCH/DELETE requests
          if (
            options.body &&
            (method === 'POST' ||
              method === 'PUT' ||
              method === 'PATCH' ||
              method === 'DELETE')
          ) {
            request = yield* HttpClientRequest.bodyJson(options.body)(
              request,
            ).pipe(
              Effect.mapError(
                (error) =>
                  new HttpError({
                    message: `Failed to serialize request body: ${String(error)}`,
                  }),
              ),
            )
          }

          const response = yield* httpClient.execute(request).pipe(
            Effect.mapError(
              (error) =>
                new HttpError({
                  message: `HTTP request failed: ${String(error)}`,
                }),
            ),
          )

          if (response.status >= 400) {
            const errorText = yield* response.text.pipe(
              Effect.mapError(
                (error) =>
                  new HttpError({
                    message: `Failed to read error response: ${String(error)}`,
                  }),
              ),
            )
            return yield* Effect.fail(
              new ApiError({
                message: `GitHub API error: ${response.status}`,
                status: response.status,
                endpoint: path,
                response: errorText,
              }),
            )
          }

          // Handle 204 No Content and 205 Reset Content responses
          if (response.status === 204 || response.status === 205) {
            return undefined as A
          }

          return yield* (response.json as Effect.Effect<A, unknown>).pipe(
            Effect.mapError(
              (error) =>
                new HttpError({
                  message: `Failed to parse JSON response: ${String(error)}`,
                }),
            ),
          )
        })
      }

      return {
        get: <A>(
          path: string,
          options?: {
            readonly headers?: Record<string, string>
            readonly searchParams?: Record<string, string>
          },
        ): Effect.Effect<A, HttpError | ApiError> =>
          makeRequest<A>('GET', path, options),

        post: <A, B>(
          path: string,
          body: B,
          options?: {
            readonly headers?: Record<string, string>
          },
        ): Effect.Effect<A, HttpError | ApiError> =>
          makeRequest<A>('POST', path, { ...options, body }),

        put: <A, B>(
          path: string,
          body: B,
          options?: {
            readonly headers?: Record<string, string>
          },
        ): Effect.Effect<A, HttpError | ApiError> =>
          makeRequest<A>('PUT', path, { ...options, body }),

        patch: <A, B>(
          path: string,
          body: B,
          options?: {
            readonly headers?: Record<string, string>
          },
        ): Effect.Effect<A, HttpError | ApiError> =>
          makeRequest<A>('PATCH', path, { ...options, body }),

        delete: <A, B = undefined>(
          path: string,
          options?: {
            readonly headers?: Record<string, string>
            readonly body?: B
          },
        ): Effect.Effect<A, HttpError | ApiError> =>
          makeRequest<A>('DELETE', path, options),
      }
    }),
  },
) {}

/**
 * Configuration service for GitHub HTTP client
 */
export class GitHubHttpClientConfigService extends Effect.Service<GitHubHttpClientConfigService>()(
  'GitHubHttpClientConfig',
  {
    sync: () => ({
      baseUrl: 'https://api.github.com' as const,
      userAgent: 'pulse-github-sdk' as const,
    }),
    accessors: true,
  },
) {}
