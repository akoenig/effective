import { Schema } from 'effect'

/**
 * Issue-specific error for GitHub Issues operations
 */
export class IssueError extends Schema.TaggedError<IssueError>()('IssueError', {
  message: Schema.String,
  issueNumber: Schema.optional(Schema.Number),
  repository: Schema.optional(Schema.String),
  operation: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Unknown),
}) {}