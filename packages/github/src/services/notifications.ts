import { Effect, type ParseResult, Schema } from "effect";
import {
  GitHubApiError,
  type GitHubAuthError,
  type GitHubHttpError,
  GitHubNotificationError,
} from "../domain/errors.js";
import {
  GitHubNotification,
  type NotificationListOptions,
} from "../domain/notification.js";
import { GitHubAuthService } from "../infrastructure/auth-service.js";
import { GitHubHttpClientService } from "../infrastructure/http-client.js";

type GitHubListResponseType<T> = {
  readonly data: readonly T[];
  readonly totalCount?: number;
  readonly incompleteResults?: boolean;
};

type NotificationServiceError =
  | GitHubNotificationError
  | GitHubAuthError
  | GitHubHttpError
  | GitHubApiError
  | ParseResult.ParseError;

/**
 * GitHub Notifications service implementing notification-related API endpoints
 */
export class NotificationsService extends Effect.Service<NotificationsService>()(
  "NotificationsService",
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* GitHubHttpClientService;
      const auth = yield* GitHubAuthService;

      const listForAuthenticatedUser = (
        options: NotificationListOptions = {},
      ): Effect.Effect<
        GitHubListResponseType<Schema.Schema.Type<typeof GitHubNotification>>,
        NotificationServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();
          const searchParams = Object.fromEntries(
            Object.entries(options)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)]),
          );

          const rawNotifications = yield* httpClient.get<unknown[]>(
            "/notifications",
            {
              headers: authHeaders,
              searchParams,
            },
          );

          // Decode snake_case response to camelCase
          const notifications = yield* Schema.decodeUnknown(
            Schema.Array(GitHubNotification),
          )(rawNotifications);

          return {
            data: notifications,
          };
        });

      const markAsRead = (
        notificationId: string,
      ): Effect.Effect<void, NotificationServiceError> =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

          yield* httpClient
            .delete<void>(`/notifications/threads/${notificationId}`, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof GitHubApiError && error.status === 404) {
                  return new GitHubNotificationError({
                    message: `Notification ${notificationId} not found`,
                    notificationId,
                    operation: "mark_read",
                  });
                }
                return error;
              }),
            );
        });

      const markAllAsRead = (
        options: { last_read_at?: string } = {},
      ): Effect.Effect<void, NotificationServiceError> =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

          yield* httpClient
            .put<void, typeof options>("/notifications", options, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof GitHubApiError) {
                  return new GitHubNotificationError({
                    message: "Failed to mark all notifications as read",
                    operation: "mark_all_read",
                  });
                }
                return error;
              }),
            );
        });

      const getThread = (
        threadId: string,
      ): Effect.Effect<
        Schema.Schema.Type<typeof GitHubNotification>,
        NotificationServiceError
      > =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

          const rawNotification = yield* httpClient
            .get<unknown>(`/notifications/threads/${threadId}`, {
              headers: authHeaders,
            })
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof GitHubApiError && error.status === 404) {
                  return new GitHubNotificationError({
                    message: `Notification thread ${threadId} not found`,
                    notificationId: threadId,
                    operation: "get_thread",
                  });
                }
                return error;
              }),
            );

          // Decode snake_case response to camelCase
          return yield* Schema.decodeUnknown(GitHubNotification)(
            rawNotification,
          );
        });

      const markThreadAsRead = (
        threadId: string,
      ): Effect.Effect<void, NotificationServiceError> =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();

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
                if (error instanceof GitHubApiError && error.status === 404) {
                  return new GitHubNotificationError({
                    message: `Notification thread ${threadId} not found`,
                    notificationId: threadId,
                    operation: "mark_read",
                  });
                }
                return error;
              }),
            );
        });

      return {
        listForAuthenticatedUser,
        markAsRead,
        markAllAsRead,
        getThread,
        markThreadAsRead,
      };
    }),
  },
) {}
