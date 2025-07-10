import { Schema } from 'effect'

/**
 * Notification list options schema with camelCase properties
 */
export const NotificationListOptions = Schema.Struct({
  all: Schema.optional(Schema.Boolean),
  participating: Schema.optional(Schema.Boolean),
  since: Schema.optional(Schema.String),
  before: Schema.optional(Schema.String),
  perPage: Schema.optional(Schema.Number).pipe(Schema.fromKey('per_page')),
  page: Schema.optional(Schema.Number),
})

export type NotificationListOptions = Schema.Schema.Type<
  typeof NotificationListOptions
>
