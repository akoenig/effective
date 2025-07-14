import { Schema } from 'effect'
import { GitHub } from '../../Infrastructure/Schemas/GitHubSchemas.js'
import { MinimalRepository } from '../ValueObjects/MinimalRepository.js'
import { User } from './User.js'

/**
 * GitHub issue label schema
 */
export const IssueLabel = Schema.Struct({
  id: Schema.Number,
  nodeId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('node_id'),
  ),
  url: Schema.String,
  name: Schema.String,
  description: GitHub.nullable(Schema.String),
  color: Schema.String,
  default: Schema.Boolean,
})

/**
 * GitHub issue milestone schema
 */
export const IssueMilestone = Schema.Struct({
  id: Schema.Number,
  nodeId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('node_id'),
  ),
  url: Schema.String,
  htmlUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('html_url'),
  ),
  labelsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('labels_url'),
  ),
  number: Schema.Number,
  state: Schema.Literal('open', 'closed'),
  title: Schema.String,
  description: GitHub.nullable(Schema.String),
  creator: GitHub.nullable(User),
  openIssues: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('open_issues'),
  ),
  closedIssues: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('closed_issues'),
  ),
  createdAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('updated_at'),
  ),
  closedAt: Schema.propertySignature(GitHub.nullableDate()).pipe(
    Schema.fromKey('closed_at'),
  ),
  dueOn: Schema.propertySignature(GitHub.nullableDate()).pipe(
    Schema.fromKey('due_on'),
  ),
})

/**
 * GitHub issue pull request reference schema
 */
export const IssuePullRequest = Schema.Struct({
  url: GitHub.nullable(Schema.String),
  htmlUrl: Schema.propertySignature(GitHub.nullable(Schema.String)).pipe(
    Schema.fromKey('html_url'),
  ),
  diffUrl: Schema.propertySignature(GitHub.nullable(Schema.String)).pipe(
    Schema.fromKey('diff_url'),
  ),
  patchUrl: Schema.propertySignature(GitHub.nullable(Schema.String)).pipe(
    Schema.fromKey('patch_url'),
  ),
  mergedAt: Schema.propertySignature(GitHub.nullableDate()).pipe(
    Schema.fromKey('merged_at'),
  ),
})

/**
 * GitHub issue schema with camelCase properties
 * Compliant with GitHub REST API v3 specification
 */
export const Issue = Schema.Struct({
  // Core identifiers
  id: Schema.Number,
  nodeId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('node_id'),
  ),
  number: Schema.Number,
  
  // Basic properties
  title: Schema.String,
  body: GitHub.nullable(Schema.String),
  state: Schema.Literal('open', 'closed'),
  stateReason: Schema.propertySignature(GitHub.nullable(Schema.Literal('completed', 'not_planned', 'reopened'))).pipe(
    Schema.fromKey('state_reason'),
  ),
  
  // Users
  user: GitHub.nullable(User),
  assignee: GitHub.nullable(User),
  assignees: Schema.Array(User),
  
  // Labels and milestone
  labels: Schema.Array(IssueLabel),
  milestone: GitHub.nullable(IssueMilestone),
  
  // Counts and statistics
  comments: Schema.Number,
  
  // URLs
  url: Schema.String,
  repositoryUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('repository_url'),
  ),
  labelsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('labels_url'),
  ),
  commentsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('comments_url'),
  ),
  eventsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('events_url'),
  ),
  htmlUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('html_url'),
  ),
  
  // Timestamps
  createdAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('updated_at'),
  ),
  closedAt: Schema.propertySignature(GitHub.nullableDate()).pipe(
    Schema.fromKey('closed_at'),
  ),
  
  // Optional fields
  activeLockReason: Schema.propertySignature(GitHub.nullable(Schema.Literal('off-topic', 'too heated', 'resolved', 'spam'))).pipe(
    Schema.fromKey('active_lock_reason'),
  ),
  locked: Schema.Boolean,
  pullRequest: Schema.optional(IssuePullRequest),
  repository: Schema.optional(MinimalRepository),
  
  // Author association
  authorAssociation: Schema.propertySignature(Schema.Literal(
    'COLLABORATOR',
    'CONTRIBUTOR', 
    'FIRST_TIMER',
    'FIRST_TIME_CONTRIBUTOR',
    'MANNEQUIN',
    'MEMBER',
    'NONE',
    'OWNER'
  )).pipe(Schema.fromKey('author_association')),
  
  // Reactions
  reactions: Schema.optional(Schema.Struct({
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
  })),
  
  // Draft (for pull requests that are also issues)
  draft: Schema.optional(Schema.Boolean),
})

export type Issue = Schema.Schema.Type<typeof Issue>
export type IssueLabel = Schema.Schema.Type<typeof IssueLabel>
export type IssueMilestone = Schema.Schema.Type<typeof IssueMilestone>
export type IssuePullRequest = Schema.Schema.Type<typeof IssuePullRequest>