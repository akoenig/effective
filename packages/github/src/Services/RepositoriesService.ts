import { Effect, type ParseResult, Schema } from 'effect'
import {
  ApiError,
  type AuthError,
  type HttpError,
  RepositoryError,
} from '../Domain/Errors/index.js'
import {
  Repository,
  RepositoryListOptions,
  type ListResponseType,
} from '../Domain/index.js'
import { GitHubAuthService } from '../Infrastructure/Auth/GitHubAuthService.js'
import { GitHubHttpClientService } from '../Infrastructure/Http/GitHubHttpClientService.js'

type RepositoryServiceError =
  | RepositoryError
  | AuthError
  | HttpError
  | ApiError
  | ParseResult.ParseError

/**
 * GitHub Repositories service implementing repository-related API endpoints
 */
export class RepositoriesService extends Effect.Service<RepositoriesService>()(
  'RepositoriesService',
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* GitHubHttpClientService
      const auth = yield* GitHubAuthService

      const listForAuthenticatedUser = (
        options: RepositoryListOptions = {},
      ): Effect.Effect<
        ListResponseType<Schema.Schema.Type<typeof Repository>>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          // Encode camelCase options to snake_case for GitHub API
          const encodedOptions = yield* Schema.encode(RepositoryListOptions)(
            options,
          )
          const searchParams = Object.fromEntries(
            Object.entries(encodedOptions)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          )

          const rawRepositories = yield* httpClient
            .get<unknown[]>('/user/repos', {
              headers: authHeaders,
              searchParams,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof ApiError && error.status === 404) {
                  return new RepositoryError({
                    message: 'No repositories found for authenticated user',
                    operation: 'list',
                  })
                }
                return error
              }),
            )

          // Decode snake_case response to camelCase
          const repositories = yield* Schema.decodeUnknown(
            Schema.Array(Repository),
          )(rawRepositories)

          return {
            data: repositories,
          }
        })

      const get = (
        owner: string,
        repo: string,
      ): Effect.Effect<
        Schema.Schema.Type<typeof Repository>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          const rawRepository = yield* httpClient
            .get<unknown>(`/repos/${owner}/${repo}`, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof ApiError && error.status === 404) {
                  return new RepositoryError({
                    message: `Repository ${owner}/${repo} not found`,
                    repository: `${owner}/${repo}`,
                    operation: 'get',
                  })
                }
                return error
              }),
            )

          // Decode snake_case response to camelCase
          return yield* Schema.decodeUnknown(Repository)(rawRepository)
        })

      const listForUser = (
        username: string,
        options: RepositoryListOptions = {},
      ): Effect.Effect<
        ListResponseType<Schema.Schema.Type<typeof Repository>>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          // Encode camelCase options to snake_case for GitHub API
          const encodedOptions = yield* Schema.encode(RepositoryListOptions)(
            options,
          )
          const searchParams = Object.fromEntries(
            Object.entries(encodedOptions)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          )

          const rawRepositories = yield* httpClient.get<unknown[]>(
            `/users/${username}/repos`,
            {
              headers: authHeaders,
              searchParams,
            },
          )

          // Decode snake_case response to camelCase
          const repositories = yield* Schema.decodeUnknown(
            Schema.Array(Repository),
          )(rawRepositories)

          return {
            data: repositories,
          }
        })

      const listForOrg = (
        org: string,
        options: RepositoryListOptions = {},
      ): Effect.Effect<
        ListResponseType<Schema.Schema.Type<typeof Repository>>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          // Encode camelCase options to snake_case for GitHub API
          const encodedOptions = yield* Schema.encode(RepositoryListOptions)(
            options,
          )
          const searchParams = Object.fromEntries(
            Object.entries(encodedOptions)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          )

          const rawRepositories = yield* httpClient.get<unknown[]>(
            `/orgs/${org}/repos`,
            {
              headers: authHeaders,
              searchParams,
            },
          )

          // Decode snake_case response to camelCase
          const repositories = yield* Schema.decodeUnknown(
            Schema.Array(Repository),
          )(rawRepositories)

          return {
            data: repositories,
          }
        })

      return {
        listForAuthenticatedUser,
        get,
        listForUser,
        listForOrg,
      }
    }),
  },
) {}
