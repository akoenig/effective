import { Effect, type ParseResult, Schema } from "effect";
import {
  GitHubApiError,
  type GitHubAuthError,
  type GitHubHttpError,
  GitHubRepositoryError,
} from "../domain/errors.js";
import {
  GitHubRepository,
  RepositoryListOptions,
} from "../domain/repository.js";
import { GitHubAuthService } from "../infrastructure/auth-service.js";
import { GitHubHttpClientService } from "../infrastructure/http-client.js";

type GitHubListResponseType<T> = {
  readonly data: readonly T[];
  readonly totalCount?: number;
  readonly incompleteResults?: boolean;
};

type RepositoryServiceError =
  | GitHubRepositoryError
  | GitHubAuthError
  | GitHubHttpError
  | GitHubApiError
  | ParseResult.ParseError;

/**
 * GitHub Repositories service implementing repository-related API endpoints
 */
export class RepositoriesService extends Effect.Service<RepositoriesService>()(
  "RepositoriesService",
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* GitHubHttpClientService;
      const auth = yield* GitHubAuthService;

      const listForAuthenticatedUser = (
        options: RepositoryListOptions = {},
      ): Effect.Effect<
        GitHubListResponseType<Schema.Schema.Type<typeof GitHubRepository>>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

          // Encode camelCase options to snake_case for GitHub API
          const encodedOptions = yield* Schema.encode(RepositoryListOptions)(
            options,
          );
          const searchParams = Object.fromEntries(
            Object.entries(encodedOptions)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          );

          const rawRepositories = yield* httpClient
            .get<unknown[]>("/user/repos", {
              headers: authHeaders,
              searchParams,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof GitHubApiError && error.status === 404) {
                  return new GitHubRepositoryError({
                    message: "No repositories found for authenticated user",
                    operation: "list",
                  });
                }
                return error;
              }),
            );

          // Decode snake_case response to camelCase
          const repositories = yield* Schema.decodeUnknown(
            Schema.Array(GitHubRepository),
          )(rawRepositories);

          return {
            data: repositories,
          };
        });

      const get = (
        owner: string,
        repo: string,
      ): Effect.Effect<
        Schema.Schema.Type<typeof GitHubRepository>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

          const rawRepository = yield* httpClient
            .get<unknown>(`/repos/${owner}/${repo}`, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof GitHubApiError && error.status === 404) {
                  return new GitHubRepositoryError({
                    message: `Repository ${owner}/${repo} not found`,
                    repository: `${owner}/${repo}`,
                    operation: "get",
                  });
                }
                return error;
              }),
            );

          // Decode snake_case response to camelCase
          return yield* Schema.decodeUnknown(GitHubRepository)(rawRepository);
        });

      const listForUser = (
        username: string,
        options: RepositoryListOptions = {},
      ): Effect.Effect<
        GitHubListResponseType<Schema.Schema.Type<typeof GitHubRepository>>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

          // Encode camelCase options to snake_case for GitHub API
          const encodedOptions = yield* Schema.encode(RepositoryListOptions)(
            options,
          );
          const searchParams = Object.fromEntries(
            Object.entries(encodedOptions)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          );

          const rawRepositories = yield* httpClient.get<unknown[]>(
            `/users/${username}/repos`,
            {
              headers: authHeaders,
              searchParams,
            },
          );

          // Decode snake_case response to camelCase
          const repositories = yield* Schema.decodeUnknown(
            Schema.Array(GitHubRepository),
          )(rawRepositories);

          return {
            data: repositories,
          };
        });

      const listForOrg = (
        org: string,
        options: RepositoryListOptions = {},
      ): Effect.Effect<
        GitHubListResponseType<Schema.Schema.Type<typeof GitHubRepository>>,
        RepositoryServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

          // Encode camelCase options to snake_case for GitHub API
          const encodedOptions = yield* Schema.encode(RepositoryListOptions)(
            options,
          );
          const searchParams = Object.fromEntries(
            Object.entries(encodedOptions)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          );

          const rawRepositories = yield* httpClient.get<unknown[]>(
            `/orgs/${org}/repos`,
            {
              headers: authHeaders,
              searchParams,
            },
          );

          // Decode snake_case response to camelCase
          const repositories = yield* Schema.decodeUnknown(
            Schema.Array(GitHubRepository),
          )(rawRepositories);

          return {
            data: repositories,
          };
        });

      return {
        listForAuthenticatedUser,
        get,
        listForUser,
        listForOrg,
      };
    }),
  },
) {}
