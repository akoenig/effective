import { Effect, Option, type ParseResult, Schema } from 'effect'
import * as EffectArray from 'effect/Array'
import {
  ApiError,
  type AuthError,
  type HttpError,
  IssueError,
} from '../Domain/Errors/index.js'
import {
  CreateIssueCommentData,
  CreateIssueData,
  Issue,
  IssueComment,
  IssueListOptions,
  type ListResponseType,
  UpdateIssueCommentData,
  UpdateIssueData,
} from '../Domain/index.js'
import { GitHubAuthService } from '../Infrastructure/Auth/GitHubAuthService.js'
import { GitHubHttpClientService } from '../Infrastructure/Http/GitHubHttpClientService.js'
import { normalizeGitHubNulls } from '../Infrastructure/Schemas/GitHubSchemas.js'

type IssueServiceError =
  | IssueError
  | AuthError
  | HttpError
  | ApiError
  | ParseResult.ParseError

/**
 * GitHub Issues service implementing issue-related API endpoints
 */
export class GitHubIssues extends Effect.Service<GitHubIssues>()('GitHubIssues', {
  effect: Effect.gen(function* () {
    const httpClient = yield* GitHubHttpClientService
    const auth = yield* GitHubAuthService

    const listForRepository = (
      owner: string,
      repo: string,
      options: IssueListOptions = {},
    ): Effect.Effect<
      ListResponseType<Schema.Schema.Type<typeof Issue>>,
      IssueServiceError
    > =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        // Encode camelCase options to snake_case for GitHub API
        const encodedOptions = yield* Schema.encode(IssueListOptions)(options)
        const searchParams = Object.fromEntries(
          Object.entries(encodedOptions)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        )

        const rawIssues = yield* httpClient
          .get<unknown[]>(`/repos/${owner}/${repo}/issues`, {
            headers: authHeaders,
            searchParams,
          })
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Repository ${owner}/${repo} not found or no access to issues`,
                  repository: `${owner}/${repo}`,
                  operation: 'list',
                })
              }
              if (error instanceof ApiError && error.status === 410) {
                return new IssueError({
                  message: `Issues are disabled for repository ${owner}/${repo}`,
                  repository: `${owner}/${repo}`,
                  operation: 'list',
                })
              }
              return error
            }),
          )

        // Normalize null values to undefined and decode snake_case response to camelCase
        const normalizedData = normalizeGitHubNulls(rawIssues)
        const issues = yield* Schema.decodeUnknown(Schema.Array(Issue))(
          normalizedData,
        )

        return {
          data: EffectArray.isNonEmptyReadonlyArray(issues)
            ? Option.some(issues)
            : Option.none(),
        }
      })

    const get = (
      owner: string,
      repo: string,
      issueNumber: number,
    ): Effect.Effect<Schema.Schema.Type<typeof Issue>, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        const rawIssue = yield* httpClient
          .get<unknown>(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
            headers: authHeaders,
          })
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'get',
                })
              }
              return error
            }),
          )

        // Normalize null values to undefined and decode snake_case response to camelCase
        const normalizedData = normalizeGitHubNulls(rawIssue)
        return yield* Schema.decodeUnknown(Issue)(normalizedData)
      })

    const create = (
      owner: string,
      repo: string,
      data: CreateIssueData,
    ): Effect.Effect<Schema.Schema.Type<typeof Issue>, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        // Encode camelCase data to snake_case for GitHub API
        const encodedData = yield* Schema.encode(CreateIssueData)(data)

        const rawIssue = yield* httpClient
          .post<unknown, typeof encodedData>(
            `/repos/${owner}/${repo}/issues`,
            encodedData,
            {
              headers: authHeaders,
            },
          )
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Repository ${owner}/${repo} not found or no access to create issues`,
                  repository: `${owner}/${repo}`,
                  operation: 'create',
                })
              }
              if (error instanceof ApiError && error.status === 410) {
                return new IssueError({
                  message: `Issues are disabled for repository ${owner}/${repo}`,
                  repository: `${owner}/${repo}`,
                  operation: 'create',
                })
              }
              if (error instanceof ApiError && error.status === 422) {
                return new IssueError({
                  message: 'Invalid issue data provided',
                  repository: `${owner}/${repo}`,
                  operation: 'create',
                })
              }
              return error
            }),
          )

        // Normalize null values to undefined and decode snake_case response to camelCase
        const normalizedData = normalizeGitHubNulls(rawIssue)
        return yield* Schema.decodeUnknown(Issue)(normalizedData)
      })

    const update = (
      owner: string,
      repo: string,
      issueNumber: number,
      data: UpdateIssueData,
    ): Effect.Effect<Schema.Schema.Type<typeof Issue>, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        // Encode camelCase data to snake_case for GitHub API
        const encodedData = yield* Schema.encode(UpdateIssueData)(data)

        const rawIssue = yield* httpClient
          .patch<unknown, typeof encodedData>(
            `/repos/${owner}/${repo}/issues/${issueNumber}`,
            encodedData,
            {
              headers: authHeaders,
            },
          )
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'update',
                })
              }
              if (error instanceof ApiError && error.status === 422) {
                return new IssueError({
                  message: 'Invalid issue data provided',
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'update',
                })
              }
              return error
            }),
          )

        // Normalize null values to undefined and decode snake_case response to camelCase
        const normalizedData = normalizeGitHubNulls(rawIssue)
        return yield* Schema.decodeUnknown(Issue)(normalizedData)
      })

    const listComments = (
      owner: string,
      repo: string,
      issueNumber: number,
    ): Effect.Effect<
      ListResponseType<Schema.Schema.Type<typeof IssueComment>>,
      IssueServiceError
    > =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        const rawComments = yield* httpClient
          .get<unknown[]>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            headers: authHeaders,
          })
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'list_comments',
                })
              }
              return error
            }),
          )

        // Normalize null values to undefined and decode snake_case response to camelCase
        const normalizedData = normalizeGitHubNulls(rawComments)
        const comments = yield* Schema.decodeUnknown(Schema.Array(IssueComment))(
          normalizedData,
        )

        return {
          data: EffectArray.isNonEmptyReadonlyArray(comments)
            ? Option.some(comments)
            : Option.none(),
        }
      })

    const createComment = (
      owner: string,
      repo: string,
      issueNumber: number,
      data: CreateIssueCommentData,
    ): Effect.Effect<
      Schema.Schema.Type<typeof IssueComment>,
      IssueServiceError
    > =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        // Encode camelCase data to snake_case for GitHub API
        const encodedData = yield* Schema.encode(CreateIssueCommentData)(data)

        const rawComment = yield* httpClient
          .post<unknown, typeof encodedData>(
            `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
            encodedData,
            {
              headers: authHeaders,
            },
          )
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'create_comment',
                })
              }
              if (error instanceof ApiError && error.status === 422) {
                return new IssueError({
                  message: 'Invalid comment data provided',
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'create_comment',
                })
              }
              return error
            }),
          )

        // Normalize null values to undefined and decode snake_case response to camelCase
        const normalizedData = normalizeGitHubNulls(rawComment)
        return yield* Schema.decodeUnknown(IssueComment)(normalizedData)
      })

    const updateComment = (
      owner: string,
      repo: string,
      commentId: number,
      data: UpdateIssueCommentData,
    ): Effect.Effect<
      Schema.Schema.Type<typeof IssueComment>,
      IssueServiceError
    > =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        // Encode camelCase data to snake_case for GitHub API
        const encodedData = yield* Schema.encode(UpdateIssueCommentData)(data)

        const rawComment = yield* httpClient
          .patch<unknown, typeof encodedData>(
            `/repos/${owner}/${repo}/issues/comments/${commentId}`,
            encodedData,
            {
              headers: authHeaders,
            },
          )
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Comment ${commentId} not found in repository ${owner}/${repo}`,
                  repository: `${owner}/${repo}`,
                  operation: 'update_comment',
                })
              }
              if (error instanceof ApiError && error.status === 422) {
                return new IssueError({
                  message: 'Invalid comment data provided',
                  repository: `${owner}/${repo}`,
                  operation: 'update_comment',
                })
              }
              return error
            }),
          )

        // Normalize null values to undefined and decode snake_case response to camelCase
        const normalizedData = normalizeGitHubNulls(rawComment)
        return yield* Schema.decodeUnknown(IssueComment)(normalizedData)
      })

    const deleteComment = (
      owner: string,
      repo: string,
      commentId: number,
    ): Effect.Effect<void, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        yield* httpClient
          .delete<void>(`/repos/${owner}/${repo}/issues/comments/${commentId}`, {
            headers: authHeaders,
          })
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Comment ${commentId} not found in repository ${owner}/${repo}`,
                  repository: `${owner}/${repo}`,
                  operation: 'delete_comment',
                })
              }
              return error
            }),
          )
      })

    const addLabels = (
      owner: string,
      repo: string,
      issueNumber: number,
      labels: string[],
    ): Effect.Effect<void, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        yield* httpClient
          .post<unknown, { labels: string[] }>(
            `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
            { labels },
            {
              headers: authHeaders,
            },
          )
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'add_labels',
                })
              }
              if (error instanceof ApiError && error.status === 422) {
                return new IssueError({
                  message: 'Invalid labels provided',
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'add_labels',
                })
              }
              return error
            }),
          )
      })

    const removeLabel = (
      owner: string,
      repo: string,
      issueNumber: number,
      label: string,
    ): Effect.Effect<void, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        yield* httpClient
          .delete<void>(`/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`, {
            headers: authHeaders,
          })
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} or label "${label}" not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'remove_label',
                })
              }
              return error
            }),
          )
      })

    const addAssignees = (
      owner: string,
      repo: string,
      issueNumber: number,
      assignees: string[],
    ): Effect.Effect<void, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        yield* httpClient
          .post<unknown, { assignees: string[] }>(
            `/repos/${owner}/${repo}/issues/${issueNumber}/assignees`,
            { assignees },
            {
              headers: authHeaders,
            },
          )
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'add_assignees',
                })
              }
              if (error instanceof ApiError && error.status === 422) {
                return new IssueError({
                  message: 'Invalid assignees provided',
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'add_assignees',
                })
              }
              return error
            }),
          )
      })

    const removeAssignees = (
      owner: string,
      repo: string,
      issueNumber: number,
      assignees: string[],
    ): Effect.Effect<void, IssueServiceError> =>
      Effect.gen(function* () {
        const authHeaders = yield* auth.getAuthHeaders()

        yield* httpClient
          .delete<void, { assignees: string[] }>(
            `/repos/${owner}/${repo}/issues/${issueNumber}/assignees`,
            {
              headers: authHeaders,
              body: { assignees },
            },
          )
          .pipe(
            Effect.mapError((error) => {
              if (error instanceof ApiError && error.status === 404) {
                return new IssueError({
                  message: `Issue #${issueNumber} not found in repository ${owner}/${repo}`,
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'remove_assignees',
                })
              }
              if (error instanceof ApiError && error.status === 422) {
                return new IssueError({
                  message: 'Invalid assignees data provided',
                  issueNumber,
                  repository: `${owner}/${repo}`,
                  operation: 'remove_assignees',
                })
              }
              return error
            }),
          )
      })

    return {
      listForRepository,
      get,
      create,
      update,
      listComments,
      createComment,
      updateComment,
      deleteComment,
      addLabels,
      removeLabel,
      addAssignees,
      removeAssignees,
    }
  }),
}) {}