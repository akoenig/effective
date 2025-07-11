import { Schema } from 'effect'

/**
 * GitHub notification subject schema with camelCase properties
 */
export const NotificationSubject = Schema.Struct({
  title: Schema.String,
  url: Schema.NullOr(Schema.String),
  latestCommentUrl: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('latest_comment_url'),
  ),
  type: Schema.String,
})

export type NotificationSubject = Schema.Schema.Type<typeof NotificationSubject>
