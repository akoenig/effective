import { Schema } from 'effect'
import { GitHub } from '../../Infrastructure/Schemas/GitHubSchemas.js'
import { License } from '../ValueObjects/License.js'
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
  description: GitHub.nullable(Schema.String),
  language: GitHub.nullable(Schema.String),
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
  mirrorUrl: Schema.propertySignature(GitHub.nullable(Schema.String)).pipe(
    Schema.fromKey('mirror_url'),
  ),
  homepage: GitHub.nullable(Schema.String),

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
  hasDiscussions: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }).pipe(Schema.fromKey('has_discussions')),

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
  pushedAt: Schema.propertySignature(GitHub.nullableDate()).pipe(
    Schema.fromKey('pushed_at'),
  ),
  createdAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('updated_at'),
  ),

  // Merge configuration (commonly used)
  allowRebaseMerge: Schema.optionalWith(Schema.Boolean, {
    default: () => true,
  }).pipe(Schema.fromKey('allow_rebase_merge')),
  allowSquashMerge: Schema.optionalWith(Schema.Boolean, {
    default: () => true,
  }).pipe(Schema.fromKey('allow_squash_merge')),
  allowMergeCommit: Schema.optionalWith(Schema.Boolean, {
    default: () => true,
  }).pipe(Schema.fromKey('allow_merge_commit')),
  allowAutoMerge: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }).pipe(Schema.fromKey('allow_auto_merge')),
  deleteBranchOnMerge: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }).pipe(Schema.fromKey('delete_branch_on_merge')),
  allowUpdateBranch: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }).pipe(Schema.fromKey('allow_update_branch')),
  allowForking: Schema.optional(Schema.Boolean).pipe(
    Schema.fromKey('allow_forking'),
  ),
  webCommitSignoffRequired: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }).pipe(Schema.fromKey('web_commit_signoff_required')),

  // Repository permissions (commonly accessed)
  permissions: Schema.optional(
    Schema.Struct({
      admin: Schema.Boolean,
      maintain: Schema.Boolean,
      push: Schema.Boolean,
      triage: Schema.Boolean,
      pull: Schema.Boolean,
    }),
  ),

  // Optional fields that may appear in some contexts
  license: GitHub.nullable(License),
  topics: GitHub.optionalArray(Schema.String),
  isTemplate: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }).pipe(Schema.fromKey('is_template')),
})

export type Repository = Schema.Schema.Type<typeof Repository>
