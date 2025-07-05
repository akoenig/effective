// Domain entities

// Domain value objects
export * from './auth-config.js'
// Domain errors
export * from './errors.js'
export * from './notification.js'
export * from './repository.js'
export * from './user.js'

// Common domain types
import { Schema } from 'effect'

/**
 * GitHub API list response wrapper with camelCase properties
 */
export const GitHubListResponse = <A>(itemSchema: Schema.Schema<A>) =>
  Schema.Struct({
    data: Schema.Array(itemSchema),
    // Add pagination metadata with camelCase properties
    totalCount: Schema.optional(Schema.Number).pipe(
      Schema.fromKey('total_count'),
    ),
    incompleteResults: Schema.optional(Schema.Boolean).pipe(
      Schema.fromKey('incomplete_results'),
    ),
  })
