import { Schema } from 'effect';
import { GitHubRepository } from './repository.js';

/**
 * GitHub notification subject schema with camelCase properties
 */
export const GitHubNotificationSubject = Schema.Struct({
  title: Schema.String,
  url: Schema.NullOr(Schema.String),
  latestCommentUrl: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('latest_comment_url')
  ),
  type: Schema.String,
});

export type GitHubNotificationSubject = Schema.Schema.Type<
  typeof GitHubNotificationSubject
>;

/**
 * GitHub notification schema with camelCase properties
 */
export const GitHubNotification = Schema.Struct({
  id: Schema.String,
  unread: Schema.Boolean,
  reason: Schema.String,
  updatedAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('updated_at')
  ),
  lastReadAt: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('last_read_at')
  ),
  subject: GitHubNotificationSubject,
  repository: GitHubRepository,
  url: Schema.String,
  subscriptionUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('subscription_url')
  ),
});

export type GitHubNotification = Schema.Schema.Type<typeof GitHubNotification>;

/**
 * Notification list options schema with camelCase properties
 */
export const NotificationListOptions = Schema.Struct({
  all: Schema.optional(Schema.Boolean),
  participating: Schema.optional(Schema.Boolean),
  since: Schema.optional(Schema.String),
  before: Schema.optional(Schema.String),
  perPage: Schema.optional(Schema.Number).pipe(
    Schema.fromKey('per_page')
  ),
  page: Schema.optional(Schema.Number),
});

export type NotificationListOptions = Schema.Schema.Type<
  typeof NotificationListOptions
>;