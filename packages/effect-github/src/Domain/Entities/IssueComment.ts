import { Schema } from 'effect'
import { GitHub } from '../../Infrastructure/Schemas/GitHubSchemas.js'
import { User } from './User.js'

/**
 * GitHub issue comment schema with camelCase properties
 * Compliant with GitHub REST API v3 specification
 */
export const IssueComment = Schema.Struct({
  // Core identifiers
  id: Schema.Number,
  nodeId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('node_id'),
  ),

  // Content
  body: Schema.String,
  bodyText: Schema.optional(Schema.String).pipe(Schema.fromKey('body_text')),
  bodyHtml: Schema.optional(Schema.String).pipe(Schema.fromKey('body_html')),

  // User
  user: GitHub.nullable(User),

  // URLs
  url: Schema.String,
  htmlUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('html_url'),
  ),
  issueUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('issue_url'),
  ),

  // Timestamps
  createdAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('updated_at'),
  ),

  // Author association
  authorAssociation: Schema.propertySignature(
    Schema.Literal(
      'COLLABORATOR',
      'CONTRIBUTOR',
      'FIRST_TIMER',
      'FIRST_TIME_CONTRIBUTOR',
      'MANNEQUIN',
      'MEMBER',
      'NONE',
      'OWNER',
    ),
  ).pipe(Schema.fromKey('author_association')),

  // Reactions
  reactions: Schema.optional(
    Schema.Struct({
      url: Schema.String,
      totalCount: Schema.propertySignature(Schema.Number).pipe(
        Schema.fromKey('total_count'),
      ),
      '+1': Schema.Number,
      '-1': Schema.Number,
      laugh: Schema.Number,
      hooray: Schema.Number,
      confused: Schema.Number,
      heart: Schema.Number,
      rocket: Schema.Number,
      eyes: Schema.Number,
    }),
  ),
})

export type IssueComment = Schema.Schema.Type<typeof IssueComment>
