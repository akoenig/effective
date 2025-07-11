import { Schema } from 'effect'

/**
 * Notification specific errors
 */
export class NotificationError extends Schema.TaggedError<NotificationError>()(
  'NotificationError',
  {
    message: Schema.String,
    notificationId: Schema.optional(Schema.String),
    operation: Schema.optional(
      Schema.Literal('list', 'mark_read', 'mark_all_read', 'get_thread'),
    ),
  },
) {}
