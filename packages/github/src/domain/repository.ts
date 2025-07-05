import { Schema } from 'effect'
import { GitHubUser } from './user.js'

/**
 * GitHub repository schema with camelCase properties
 */
export const GitHubRepository = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  fullName: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('full_name'),
  ),
  description: Schema.NullOr(Schema.String),
  private: Schema.Boolean,
  fork: Schema.Boolean,
  htmlUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('html_url'),
  ),
  cloneUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('clone_url'),
  ),
  sshUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('ssh_url'),
  ),
  language: Schema.NullOr(Schema.String),
  stargazersCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('stargazers_count'),
  ),
  watchersCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('watchers_count'),
  ),
  forksCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('forks_count'),
  ),
  openIssuesCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey('open_issues_count'),
  ),
  size: Schema.Number,
  defaultBranch: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('default_branch'),
  ),
  archived: Schema.Boolean,
  disabled: Schema.Boolean,
  visibility: Schema.String,
  pushedAt: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey('pushed_at'),
  ),
  createdAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('updated_at'),
  ),
  owner: GitHubUser,
})

export type GitHubRepository = Schema.Schema.Type<typeof GitHubRepository>

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
