import { Schema } from 'effect'

/**
 * GitHub API Schema helpers for handling null/undefined normalization
 * These helpers transform GitHub's null values to undefined in our type system
 * while maintaining proper serialization for the GitHub API.
 */
export const GitHub = {
  /**
   * Converts GitHub API nullable fields to undefined in TypeScript types
   * - API receives: value | null
   * - TypeScript type: value | undefined
   * - API sends: value | null (undefined becomes null)
   *
   * @example
   * ```typescript
   * const UserSchema = Schema.Struct({
   *   name: Schema.String,
   *   bio: GitHub.nullable(Schema.String), // Type: string | undefined
   *   location: GitHub.nullable(Schema.String)
   * })
   * ```
   */
  nullable: <A, I, R>(schema: Schema.Schema<A, I, R>) =>
    Schema.Union(schema, Schema.Undefined),

  /**
   * For string fields that can be null in the GitHub API
   * Results in string | undefined type
   *
   * @example
   * ```typescript
   * const RepoSchema = Schema.Struct({
   *   description: GitHub.nullableString(),
   *   homepage: GitHub.nullableString()
   * })
   * ```
   */
  nullableString: () => Schema.Union(Schema.String, Schema.Undefined),

  /**
   * For arrays that might be null in the GitHub API
   * Results in Array<T> | undefined type
   *
   * @example
   * ```typescript
   * const UserSchema = Schema.Struct({
   *   organizations: GitHub.nullableArray(OrganizationSchema)
   * })
   * ```
   */
  nullableArray: <A, I, R>(itemSchema: Schema.Schema<A, I, R>) =>
    Schema.Union(Schema.Array(itemSchema), Schema.Undefined),

  /**
   * For numeric fields that might be null/undefined in GitHub API
   * Results in number | undefined type
   *
   * @example
   * ```typescript
   * const RepoSchema = Schema.Struct({
   *   size: GitHub.nullableNumber()
   * })
   * ```
   */
  nullableNumber: () => Schema.Union(Schema.Number, Schema.Undefined),

  /**
   * For date strings that might be null in GitHub API
   * Results in Date | undefined type with automatic ISO string parsing
   *
   * @example
   * ```typescript
   * const RepoSchema = Schema.Struct({
   *   pushedAt: GitHub.nullableDate(),
   *   createdAt: Schema.DateFromString // Required dates
   * })
   * ```
   */
  nullableDate: () => Schema.Union(Schema.DateFromString, Schema.Undefined),

  /**
   * For optional fields using Schema.optional
   * Results in Array<T> | undefined type
   *
   * @example
   * ```typescript
   * const Schema = Schema.Struct({
   *   topics: GitHub.optionalArray(Schema.String)
   * })
   * ```
   */
  optionalArray: <A, I, R>(itemSchema: Schema.Schema<A, I, R>) =>
    Schema.optional(Schema.Array(itemSchema)),
}

/**
 * Preprocessor effect that recursively normalizes null values to undefined
 * Use this for raw API responses before schema validation
 *
 * @example
 * ```typescript
 * const normalizedData = normalizeGitHubNulls(rawApiResponse)
 * const result = yield* Schema.decodeUnknown(UserSchema)(normalizedData)
 * ```
 */
export const normalizeGitHubNulls = (data: unknown): unknown => {
  if (data === null) {
    return undefined
  }

  if (Array.isArray(data)) {
    return data.map(normalizeGitHubNulls)
  }

  if (typeof data === 'object' && data !== null) {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      normalized[key] = normalizeGitHubNulls(value)
    }
    return normalized
  }

  return data
}

/**
 * Effect-based normalization that can be used in pipes
 *
 * @example
 * ```typescript
 * const processApiResponse = (raw: unknown) =>
 *   Effect.succeed(raw).pipe(
 *     Effect.map(normalizeGitHubNullsEffect),
 *     Effect.flatMap(Schema.decodeUnknown(UserSchema))
 *   )
 * ```
 */
export const normalizeGitHubNullsEffect = (data: unknown) =>
  normalizeGitHubNulls(data)
