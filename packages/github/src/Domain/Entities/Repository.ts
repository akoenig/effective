import { Schema } from 'effect'
import { User } from './User.js'

/**
 * GitHub repository schema with camelCase properties
 * Compliant with GitHub REST API v3 specification
 */
export const Repository = Schema.Struct({
  // Core identifiers
  id: Schema.Number,
  nodeId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('node_id'),
  ),
  name: Schema.String,
  fullName: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('full_name'),
  ),
  owner: User,
  
  // Basic properties
  private: Schema.Boolean,
  fork: Schema.Boolean,
  description: Schema.NullOr(Schema.String),
  language: Schema.NullOr(Schema.String),
  archived: Schema.Boolean,
  disabled: Schema.Boolean,
  visibility: Schema.String,
  
  // URLs
  htmlUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('html_url'),
  ),
  url: Schema.String,
  cloneUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('clone_url'),
  ),
  sshUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('ssh_url'),
  ),
  gitUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('git_url'),
  ),
  svnUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('svn_url'),
  ),
  mirrorUrl: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('mirror_url'),
  ),
  homepage: Schema.NullOr(Schema.String),
  
  // Features and settings
  hasIssues: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.fromKey('has_issues'),
  ),
  hasProjects: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.fromKey('has_projects'),
  ),
  hasWiki: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.fromKey('has_wiki'),
  ),
  hasPages: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.fromKey('has_pages'),
  ),
  hasDownloads: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.fromKey('has_downloads'),
  ),
  hasDiscussions: Schema.optionalWith(Schema.Boolean, { default: () => false }).pipe(
    Schema.fromKey('has_discussions'),
  ),
  
  // Counts and statistics
  stargazersCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('stargazers_count'),
  ),
  watchersCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('watchers_count'),
  ),
  watchers: Schema.Number,
  forksCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('forks_count'),
  ),
  forks: Schema.Number,
  openIssuesCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('open_issues_count'),
  ),
  openIssues: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('open_issues'),
  ),
  size: Schema.Number, // Size in KB
  
  // Branching and version control
  defaultBranch: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('default_branch'),
  ),
  
  // Timestamps
  pushedAt: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('pushed_at'),
  ),
  createdAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('updated_at'),
  ),
  
  // Optional fields that may appear in some contexts
  license: Schema.optional(Schema.NullOr(Schema.Any)), // License can be null or a complex object
  topics: Schema.optional(Schema.Array(Schema.String)),
  isTemplate: Schema.optionalWith(Schema.Boolean, { default: () => false }).pipe(
    Schema.fromKey('is_template'),
  ),
})

export type Repository = Schema.Schema.Type<typeof Repository>