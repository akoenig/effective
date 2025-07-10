import { Schema } from 'effect'

/**
 * GitHub simple user schema with camelCase properties
 * Compliant with GitHub REST API v3 specification (simple-user)
 * Used for basic user references in other objects like repository owners
 */
export const User = Schema.Struct({
  // Core identifiers (required)
  id: Schema.Number,
  nodeId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('node_id'),
  ),
  login: Schema.String,

  // Avatar and profile (required)
  avatarUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('avatar_url'),
  ),
  gravatarId: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('gravatar_id'),
  ),

  // URLs (required)
  url: Schema.String,
  htmlUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('html_url'),
  ),
  followersUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('followers_url'),
  ),
  followingUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('following_url'),
  ),
  gistsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('gists_url'),
  ),
  starredUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('starred_url'),
  ),
  subscriptionsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('subscriptions_url'),
  ),
  organizationsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('organizations_url'),
  ),
  reposUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('repos_url'),
  ),
  eventsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('events_url'),
  ),
  receivedEventsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('received_events_url'),
  ),

  // User type and permissions (required)
  type: Schema.String,
  siteAdmin: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.fromKey('site_admin'),
  ),

  // Optional fields that may appear in some contexts
  name: Schema.optional(Schema.NullOr(Schema.String)),
  email: Schema.optional(Schema.NullOr(Schema.String)),
  starredAt: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('starred_at'),
  ),
  userViewType: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('user_view_type'),
  ),
})

export type User = Schema.Schema.Type<typeof User>
