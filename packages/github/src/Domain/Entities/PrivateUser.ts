import { Schema } from 'effect'
import { User } from './User.js'

/**
 * GitHub private user schema with camelCase properties
 * Compliant with GitHub REST API v3 specification (private-user)
 * Used for authenticated user profiles with private information
 */
export const PrivateUser = Schema.Struct({
  // Extend from simple user
  ...User.fields,
  
  // Additional required fields for private user
  name: Schema.NullOr(Schema.String),
  email: Schema.NullOr(Schema.String),
  bio: Schema.NullOr(Schema.String),
  blog: Schema.NullOr(Schema.String),
  company: Schema.NullOr(Schema.String),
  location: Schema.NullOr(Schema.String),
  hireable: Schema.NullOr(Schema.Boolean),
  twitterUsername: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('twitter_username'),
  ),
  
  // Counts (required for private user)
  publicRepos: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('public_repos'),
  ),
  publicGists: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('public_gists'),
  ),
  followers: Schema.Number,
  following: Schema.Number,
  
  // Timestamps (required for private user)
  createdAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('updated_at'),
  ),
  
  // Private user specific fields (optional)
  privateGists: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('private_gists'),
  ),
  totalPrivateRepos: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('total_private_repos'),
  ),
  ownedPrivateRepos: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('owned_private_repos'),
  ),
  diskUsage: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('disk_usage'),
  ),
  collaborators: Schema.optionalWith(Schema.Number, { exact: true }),
  twoFactorAuthentication: Schema.optionalWith(Schema.Boolean, { exact: true }).pipe(
    Schema.fromKey('two_factor_authentication'),
  ),
  notificationEmail: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }).pipe(
    Schema.fromKey('notification_email'),
  ),
  businessPlus: Schema.optionalWith(Schema.Boolean, { exact: true }).pipe(
    Schema.fromKey('business_plus'),
  ),
  ldapDn: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('ldap_dn'),
  ),
  plan: Schema.optional(Schema.Struct({
    collaborators: Schema.Number,
    name: Schema.String,
    space: Schema.Number,
    privateRepos: Schema.propertySignature(Schema.Number).pipe(
      Schema.fromKey('private_repos'),
    ),
  })),
})

export type PrivateUser = Schema.Schema.Type<typeof PrivateUser>