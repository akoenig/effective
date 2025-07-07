import { Schema } from 'effect'

/**
 * Repository list options schema with camelCase properties
 */
export const RepositoryListOptions = Schema.Struct({
  type: Schema.optional(
    Schema.Literal('all', 'owner', 'public', 'private', 'member'),
  ),
  sort: Schema.optional(
    Schema.Literal('created', 'updated', 'pushed', 'full_name'),
  ),
  direction: Schema.optional(Schema.Literal('asc', 'desc')),
  perPage: Schema.optional(Schema.Number).pipe(Schema.fromKey('per_page')),
  page: Schema.optional(Schema.Number),
})

export type RepositoryListOptions = Schema.Schema.Type<
  typeof RepositoryListOptions
>