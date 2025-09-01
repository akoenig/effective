import { Schema } from 'effect'

/**
 * Options for listing issues in a repository
 * Maps camelCase to snake_case for GitHub API compatibility
 */
export const IssueListOptions = Schema.Struct({
  milestone: Schema.optional(
    Schema.Union(Schema.String, Schema.Literal('*', 'none')),
  ),
  state: Schema.optional(Schema.Literal('open', 'closed', 'all')),
  assignee: Schema.optional(
    Schema.Union(Schema.String, Schema.Literal('*', 'none')),
  ),
  creator: Schema.optional(Schema.String),
  mentioned: Schema.optional(Schema.String),
  labels: Schema.optional(Schema.String), // Comma-separated list of label names
  sort: Schema.optional(Schema.Literal('created', 'updated', 'comments')),
  direction: Schema.optional(Schema.Literal('asc', 'desc')),
  since: Schema.optional(Schema.DateFromString), // Issues updated after this time
  perPage: Schema.optional(Schema.Number).pipe(Schema.fromKey('per_page')),
  page: Schema.optional(Schema.Number),
})

export type IssueListOptions = Schema.Schema.Type<typeof IssueListOptions>

/**
 * Data for creating a new issue
 */
export const CreateIssueData = Schema.Struct({
  title: Schema.String,
  body: Schema.optional(Schema.String),
  assignee: Schema.optional(Schema.String),
  milestone: Schema.optional(Schema.Number),
  labels: Schema.optional(Schema.Array(Schema.String)),
  assignees: Schema.optional(Schema.Array(Schema.String)),
})

export type CreateIssueData = Schema.Schema.Type<typeof CreateIssueData>

/**
 * Data for updating an existing issue
 */
export const UpdateIssueData = Schema.Struct({
  title: Schema.optional(Schema.String),
  body: Schema.optional(Schema.String),
  assignee: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
  state: Schema.optional(Schema.Literal('open', 'closed')),
  stateReason: Schema.optional(
    Schema.Literal('completed', 'not_planned', 'reopened'),
  ).pipe(Schema.fromKey('state_reason')),
  milestone: Schema.optional(Schema.Union(Schema.Number, Schema.Null)),
  labels: Schema.optional(Schema.Array(Schema.String)),
  assignees: Schema.optional(Schema.Array(Schema.String)),
})

export type UpdateIssueData = Schema.Schema.Type<typeof UpdateIssueData>

/**
 * Data for creating an issue comment
 */
export const CreateIssueCommentData = Schema.Struct({
  body: Schema.String,
})

export type CreateIssueCommentData = Schema.Schema.Type<
  typeof CreateIssueCommentData
>

/**
 * Data for updating an issue comment
 */
export const UpdateIssueCommentData = Schema.Struct({
  body: Schema.String,
})

export type UpdateIssueCommentData = Schema.Schema.Type<
  typeof UpdateIssueCommentData
>
