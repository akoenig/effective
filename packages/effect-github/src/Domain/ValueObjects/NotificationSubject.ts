import { Schema } from 'effect'
import { GitHub } from '../../Infrastructure/Schemas/GitHubSchemas.js'

/**
 * GitHub notification subject schema with camelCase properties
 * 
 * Note: While the GitHub API specification marks url and latest_comment_url as required,
 * actual API responses show these fields can be null for certain notification types
 * like CheckSuite and WorkflowRun. This schema reflects the actual API behavior.
 */
export const NotificationSubject = Schema.Struct({
  title: Schema.String,
  url: GitHub.nullable(Schema.String),
  latestCommentUrl: Schema.propertySignature(GitHub.nullable(Schema.String)).pipe(
    Schema.fromKey('latest_comment_url'),
  ),
  type: Schema.String,
})

export type NotificationSubject = Schema.Schema.Type<typeof NotificationSubject>
