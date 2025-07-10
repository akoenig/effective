import { Schema } from 'effect'
import { User } from '../Entities/User.js'

/**
 * GitHub minimal repository schema with camelCase properties
 * Compliant with GitHub REST API v3 specification (minimal-repository)
 * Used in notifications and other contexts where only basic repo info is needed
 */
export const MinimalRepository = Schema.Struct({
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
  archived: Schema.optional(Schema.Boolean),
  disabled: Schema.optional(Schema.Boolean),
  
  // Essential URLs
  htmlUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('html_url'),
  ),
  url: Schema.String,
  
  // All the URL templates (required in minimal-repository)
  archiveUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('archive_url'),
  ),
  assigneesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('assignees_url'),
  ),
  blobsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('blobs_url'),
  ),
  branchesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('branches_url'),
  ),
  collaboratorsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('collaborators_url'),
  ),
  commentsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('comments_url'),
  ),
  commitsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('commits_url'),
  ),
  compareUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('compare_url'),
  ),
  contentsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('contents_url'),
  ),
  contributorsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('contributors_url'),
  ),
  deploymentsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('deployments_url'),
  ),
  downloadsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('downloads_url'),
  ),
  eventsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('events_url'),
  ),
  forksUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('forks_url'),
  ),
  gitCommitsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('git_commits_url'),
  ),
  gitRefsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('git_refs_url'),
  ),
  gitTagsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('git_tags_url'),
  ),
  hooksUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('hooks_url'),
  ),
  issueCommentUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('issue_comment_url'),
  ),
  issueEventsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('issue_events_url'),
  ),
  issuesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('issues_url'),
  ),
  keysUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('keys_url'),
  ),
  labelsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('labels_url'),
  ),
  languagesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('languages_url'),
  ),
  mergesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('merges_url'),
  ),
  milestonesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('milestones_url'),
  ),
  notificationsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('notifications_url'),
  ),
  pullsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('pulls_url'),
  ),
  releasesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('releases_url'),
  ),
  stargazersUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('stargazers_url'),
  ),
  statusesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('statuses_url'),
  ),
  subscribersUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('subscribers_url'),
  ),
  subscriptionUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('subscription_url'),
  ),
  tagsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('tags_url'),
  ),
  teamsUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('teams_url'),
  ),
  treesUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('trees_url'),
  ),
  
  // Basic repo URLs (optional as they're not in all API responses)
  cloneUrl: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('clone_url'),
  ),
  mirrorUrl: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }).pipe(
    Schema.fromKey('mirror_url'),
  ),
  sshUrl: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('ssh_url'),
  ),
  svnUrl: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('svn_url'),
  ),
  homepage: Schema.optional(Schema.NullOr(Schema.String)),
  language: Schema.optional(Schema.NullOr(Schema.String)),
  forksCount: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('forks_count'),
  ),
  stargazersCount: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('stargazers_count'),
  ),
  watchersCount: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('watchers_count'),
  ),
  size: Schema.optional(Schema.Number),
  defaultBranch: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('default_branch'),
  ),
  openIssuesCount: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('open_issues_count'),
  ),
  topics: Schema.optional(Schema.Array(Schema.String)),
  hasIssues: Schema.optionalWith(Schema.Boolean, { exact: true }).pipe(
    Schema.fromKey('has_issues'),
  ),
  hasProjects: Schema.optionalWith(Schema.Boolean, { exact: true }).pipe(
    Schema.fromKey('has_projects'),
  ),
  hasWiki: Schema.optionalWith(Schema.Boolean, { exact: true }).pipe(
    Schema.fromKey('has_wiki'),
  ),
  hasPages: Schema.optionalWith(Schema.Boolean, { exact: true }).pipe(
    Schema.fromKey('has_pages'),
  ),
  hasDownloads: Schema.optionalWith(Schema.Boolean, { exact: true }).pipe(
    Schema.fromKey('has_downloads'),
  ),
  hasDiscussions: Schema.optionalWith(Schema.Boolean, { default: () => false }).pipe(
    Schema.fromKey('has_discussions'),
  ),
  pushedAt: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }).pipe(
    Schema.fromKey('pushed_at'),
  ),
  createdAt: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('created_at'),
  ),
  updatedAt: Schema.optionalWith(Schema.String, { exact: true }).pipe(
    Schema.fromKey('updated_at'),
  ),
  license: Schema.optional(Schema.NullOr(Schema.Any)), // License can be null or a complex object
  forks: Schema.optional(Schema.Number),
  openIssues: Schema.optionalWith(Schema.Number, { exact: true }).pipe(
    Schema.fromKey('open_issues'),
  ),
  watchers: Schema.optional(Schema.Number),
  visibility: Schema.optional(Schema.String),
})

export type MinimalRepository = Schema.Schema.Type<typeof MinimalRepository>