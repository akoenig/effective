import { Effect, type ParseResult, Schema } from 'effect'
import {
  ApiError,
  type AuthError,
  type HttpError,
  NotificationError,
} from '../Domain/Errors/index.js'
import {
  Notification,
  type NotificationListOptions,
  type ListResponseType,
} from '../Domain/index.js'
import { GitHubAuthService } from '../Infrastructure/Auth/GitHubAuthService.js'
import { GitHubHttpClientService } from '../Infrastructure/Http/GitHubHttpClientService.js'


type NotificationServiceError =
  | NotificationError
  | AuthError
  | HttpError
  | ApiError
  | ParseResult.ParseError

/**
 * GitHub Notifications service implementing notification-related API endpoints
 */
export class NotificationsService extends Effect.Service<NotificationsService>()(
  'NotificationsService',
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* GitHubHttpClientService
      const auth = yield* GitHubAuthService

      const listForAuthenticatedUser = (
        options: NotificationListOptions = {},
      ): Effect.Effect<
        ListResponseType<Schema.Schema.Type<typeof Notification>>,
        NotificationServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()
          const searchParams = Object.fromEntries(
            Object.entries(options)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          )

          const rawNotifications = yield* httpClient.get<unknown[]>(
            '/notifications',
            {
              headers: authHeaders,
              searchParams,
            },
          )

          // Decode snake_case response to camelCase
          const notifications = yield* Schema.decodeUnknown(
            Schema.Array(Notification),
          )(rawNotifications)

          return {
            data: notifications,
          }
        })

      const markAsRead = (
        notificationId: string,
      ): Effect.Effect<void, NotificationServiceError> =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          yield* httpClient
            .delete<void>(`/notifications/threads/${notificationId}`, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof ApiError && error.status === 404) {
                  return new NotificationError({
                    message: `Notification ${notificationId} not found`,
                    notificationId,
                    operation: 'mark_read',
                  })
                }
                return error
              }),
            )
        })

      const markAllAsRead = (
        options: { last_read_at?: string } = {},
      ): Effect.Effect<void, NotificationServiceError> =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          yield* httpClient
            .put<void, typeof options>('/notifications', options, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof ApiError) {
                  return new NotificationError({
                    message: 'Failed to mark all notifications as read',
                    operation: 'mark_all_read',
                  })
                }
                return error
              }),
            )
        })

      const getThread = (
        threadId: string,
      ): Effect.Effect<
        Schema.Schema.Type<typeof Notification>,
        NotificationServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          const rawNotification = yield* httpClient
            .get<unknown>(`/notifications/threads/${threadId}`, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof ApiError && error.status === 404) {
                  return new NotificationError({
                    message: `Notification thread ${threadId} not found`,
                    notificationId: threadId,
                    operation: 'get_thread',
                  })
                }
                return error
              }),
            )

          // Decode snake_case response to camelCase
          return yield* Schema.decodeUnknown(Notification)(
            rawNotification,
          )
        })

      const markThreadAsRead = (
        threadId: string,
      ): Effect.Effect<void, NotificationServiceError> =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders()

          yield* httpClient
            .patch<void, Record<string, never>>(
              `/notifications/threads/${threadId}`,
              {},
              {
                headers: authHeaders,
              },
            )
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof ApiError && error.status === 404) {
                  return new NotificationError({
                    message: `Notification thread ${threadId} not found`,
                    notificationId: threadId,
                    operation: 'mark_read',
                  })
                }
                return error
              }),
            )
        })

      return {
        listForAuthenticatedUser,
        markAsRead,
        markAllAsRead,
        getThread,
        markThreadAsRead,
      }
    }),
  },
) {}
