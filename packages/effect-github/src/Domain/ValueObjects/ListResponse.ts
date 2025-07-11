import { type Option, Schema } from 'effect'
import type { NonEmptyReadonlyArray } from 'effect/Array'

/**
 * GitHub API list response wrapper with camelCase properties
 */
export const ListResponse = <A>(itemSchema: Schema.Schema<A>) =>
  Schema.Struct({
    data: Schema.Option(Schema.Array(itemSchema)),
    // Add pagination metadata with camelCase properties
    totalCount: Schema.optional(Schema.Number).pipe(
      Schema.fromKey('total_count'),
    ),
    incompleteResults: Schema.optional(Schema.Boolean).pipe(
      Schema.fromKey('incomplete_results'),
    ),
  })

export type ListResponseType<A> = {
  readonly data: Option.Option<NonEmptyReadonlyArray<A>>
  readonly totalCount?: number
  readonly incompleteResults?: boolean
}
