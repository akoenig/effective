/**
 * GitHub-specific data redaction utilities for HTTP recordings
 * 
 * This module provides redaction functions that preserve GitHub API data structure
 * while removing sensitive information like tokens, real usernames, emails, etc.
 */

import {
  type RedactionContext,
  RedactionResult,
} from '@akoenig/effect-http-recorder'
import { Effect } from 'effect'

/**
 * GitHub-specific redaction effect that preserves data structure while redacting sensitive values
 */
export const createGitHubRedactionEffect = (context: RedactionContext) => {
  return Effect.gen(function* () {
    // Always redact ALL headers for both requests and responses
    const redactedHeaders: Record<string, string> = {}
    Object.keys(context.headers).forEach((key) => {
      redactedHeaders[key] = '***REDACTED***'
    })

    // Only redact response bodies to preserve API structure for testing
    if (context.type !== 'response' || !context.body) {
      return RedactionResult.make({
        headers: redactedHeaders,
        body: context.body,
      })
    }

    try {
      const body =
        typeof context.body === 'string'
          ? JSON.parse(context.body)
          : context.body

      const redactedBody = redactGitHubData(body)

      return RedactionResult.make({
        headers: redactedHeaders,
        body:
          typeof context.body === 'string'
            ? JSON.stringify(redactedBody, null, 2)
            : redactedBody,
      })
    } catch {
      // If not JSON, return as-is
      return RedactionResult.make({
        headers: redactedHeaders,
        body: context.body,
      })
    }
  })
}

/**
 * Recursively redact sensitive data while preserving GitHub API data structure
 */
export const redactGitHubData = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(redactGitHubData)
  }

  const redacted = { ...(obj as Record<string, unknown>) }

  // IDs and unique identifiers
  if (
    'id' in redacted &&
    (typeof redacted.id === 'string' || typeof redacted.id === 'number')
  ) {
    redacted.id = typeof redacted.id === 'string' ? 'redacted_id' : 12345
  }
  if ('node_id' in redacted && typeof redacted.node_id === 'string') {
    redacted.node_id = 'redacted_node_id'
  }
  if ('thread_id' in redacted && typeof redacted.thread_id === 'string') {
    redacted.thread_id = 'redacted_thread_id'
  }

  // Timestamps
  if ('created_at' in redacted && typeof redacted.created_at === 'string') {
    redacted.created_at = '2023-01-01T00:00:00Z'
  }
  if ('updated_at' in redacted && typeof redacted.updated_at === 'string') {
    redacted.updated_at = '2023-01-01T00:00:00Z'
  }
  if ('pushed_at' in redacted && typeof redacted.pushed_at === 'string') {
    redacted.pushed_at = '2023-01-01T00:00:00Z'
  }
  if (
    'last_read_at' in redacted &&
    redacted.last_read_at &&
    typeof redacted.last_read_at === 'string'
  ) {
    redacted.last_read_at = '2023-01-01T00:00:00Z'
  }

  // Titles and content
  if (
    'title' in redacted &&
    typeof redacted.title === 'string' &&
    redacted.title
  ) {
    redacted.title = 'Example title'
  }
  if (
    'body' in redacted &&
    typeof redacted.body === 'string' &&
    redacted.body
  ) {
    redacted.body = 'Example body content'
  }
  if (
    'message' in redacted &&
    typeof redacted.message === 'string' &&
    redacted.message
  ) {
    redacted.message = 'Example message'
  }

  // User/Organization sensitive data
  if ('email' in redacted) redacted.email = 'user@example.com'
  if ('private_email' in redacted)
    redacted.private_email = 'private@example.com'
  if ('gravatar_id' in redacted && redacted.gravatar_id)
    redacted.gravatar_id = 'redacted_gravatar_id'

  // Personal identifiable information
  if (
    'name' in redacted &&
    typeof redacted.name === 'string' &&
    redacted.name
  ) {
    redacted.name = 'Example User'
  }
  if (
    'full_name' in redacted &&
    typeof redacted.full_name === 'string' &&
    redacted.full_name
  ) {
    redacted.full_name = 'example-user/example-repo'
  }
  if (
    'login' in redacted &&
    typeof redacted.login === 'string' &&
    redacted.login
  ) {
    redacted.login = 'example-user'
  }
  if ('company' in redacted && redacted.company) {
    redacted.company = 'Example Company'
  }
  if ('location' in redacted && redacted.location) {
    redacted.location = 'Example City'
  }
  if ('bio' in redacted && redacted.bio) {
    redacted.bio = 'Example bio'
  }
  if ('blog' in redacted && redacted.blog) {
    redacted.blog = 'https://example.com'
  }
  if ('twitter_username' in redacted && redacted.twitter_username) {
    redacted.twitter_username = 'example_user'
  }

  // Repository sensitive data
  if ('description' in redacted && redacted.description) {
    redacted.description = 'Example repository description'
  }
  if ('homepage' in redacted && redacted.homepage) {
    redacted.homepage = 'https://example.com'
  }

  // URLs that might contain sensitive info
  redactUrlField(redacted, 'url')
  redactUrlField(redacted, 'html_url')
  redactUrlField(redacted, 'clone_url')
  redactUrlField(redacted, 'ssh_url')
  redactUrlField(redacted, 'git_url')
  redactUrlField(redacted, 'svn_url')
  
  // Special handling for latest_comment_url (can be null)
  if (
    'latest_comment_url' in redacted &&
    redacted.latest_comment_url === null
  ) {
    // Keep null values as null to preserve API structure
  } else if (
    'latest_comment_url' in redacted &&
    typeof redacted.latest_comment_url === 'string'
  ) {
    redacted.latest_comment_url = redactUrl(redacted.latest_comment_url)
      .replace(/\/comments\/\d+/g, '/comments/12345')
  }

  // URL templates - redact user/org names in templates
  const urlTemplateFields = [
    'archive_url',
    'assignees_url',
    'blobs_url',
    'branches_url',
    'collaborators_url',
    'comments_url',
    'commits_url',
    'compare_url',
    'contents_url',
    'contributors_url',
    'deployments_url',
    'downloads_url',
    'events_url',
    'forks_url',
    'git_commits_url',
    'git_refs_url',
    'git_tags_url',
    'hooks_url',
    'issue_comment_url',
    'issue_events_url',
    'issues_url',
    'keys_url',
    'labels_url',
    'languages_url',
    'merges_url',
    'milestones_url',
    'notifications_url',
    'pulls_url',
    'releases_url',
    'stargazers_url',
    'statuses_url',
    'subscribers_url',
    'subscription_url',
    'tags_url',
    'teams_url',
    'trees_url',
    'avatar_url',
    'followers_url',
    'following_url',
    'gists_url',
    'starred_url',
    'subscriptions_url',
    'organizations_url',
    'repos_url',
    'received_events_url',
  ]

  urlTemplateFields.forEach((field) => {
    redactUrlField(redacted, field)
  })

  // Keep structure intact for important fields but redact sensitive values
  if ('owner' in redacted && typeof redacted.owner === 'object') {
    redacted.owner = redactGitHubData(redacted.owner)
  }
  if ('organization' in redacted && typeof redacted.organization === 'object') {
    redacted.organization = redactGitHubData(redacted.organization)
  }
  if ('repository' in redacted && typeof redacted.repository === 'object') {
    redacted.repository = redactGitHubData(redacted.repository)
  }
  if ('subject' in redacted && typeof redacted.subject === 'object') {
    redacted.subject = redactGitHubData(redacted.subject)
  }

  // Recursively process arrays and nested objects
  Object.keys(redacted).forEach((key) => {
    if (
      typeof redacted[key as keyof typeof redacted] === 'object' &&
      redacted[key as keyof typeof redacted] !== null
    ) {
      redacted[key as keyof typeof redacted] = redactGitHubData(
        redacted[key as keyof typeof redacted],
      )
    }
  })

  return redacted
}

/**
 * Helper function to redact a URL field in an object
 */
function redactUrlField(obj: Record<string, unknown>, field: string) {
  if (field in obj && typeof obj[field] === 'string') {
    obj[field] = redactUrl(obj[field] as string)
  }
}

/**
 * Helper function to redact URLs with GitHub-specific patterns
 */
function redactUrl(url: string): string {
  return url
    // Replace GitHub.com URLs
    .replace(/github\.com\/[^/]+/g, 'github.com/example-user')
    // Replace API URLs - handle all patterns
    .replace(
      /api\.github\.com\/repos\/[^/]+\/[^/]+/g,
      'api.github.com/repos/example-user/example-repo',
    )
    .replace(
      /api\.github\.com\/users\/[^/]+/g,
      'api.github.com/users/example-user',
    )
    .replace(
      /api\.github\.com\/orgs\/[^/]+/g,
      'api.github.com/orgs/example-org',
    )
    // Handle patterns where example-user is already present
    .replace(
      /api\.github\.com\/example-user\/[^/]+\/[^/]+/g,
      'api.github.com/repos/example-user/example-repo',
    )
    .replace(
      /api\.github\.com\/example-user\/[^/]+(?=\/|$)/g,
      'api.github.com/users/example-user',
    )
    .replace(
      /github\.com\/example-user\/[^/]+/g,
      'github.com/example-user/example-repo',
    )
    // Replace PR and issue numbers
    .replace(/\/pulls\/\d+/g, '/pulls/12345')
    .replace(/\/issues\/\d+/g, '/issues/12345')
    // Handle SSH URLs
    .replace(/github\.com:[^/]+/g, 'github.com:example-user')
    .replace(
      /github\.com:example-user\/[^/]+/g,
      'github.com:example-user/example-repo',
    )
}