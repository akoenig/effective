/**
 * Record command - generates HTTP recordings for all GitHub SDK service methods
 *
 * This command exercises each method in the GitHub SDK services while
 * the http-recorder captures the HTTP interactions for later replay.
 */

import {
  HttpRecorder,
  HttpRecorderConfig,
  type RedactionContext,
  RedactionResult,
} from '@akoenig/effect-http-recorder'
import { Command, Options } from '@effect/cli'
import { FileSystem } from '@effect/platform'
import { NodeContext } from '@effect/platform-node'
import { Config, Console, Effect, Layer, Option, Redacted } from 'effect'
import { GitHub } from '../../src/layer.js'
import { GitHubNotifications } from '../../src/Services/GitHubNotifications.js'
import { GitHubRepositories } from '../../src/Services/GitHubRepositories.js'

// Configuration
const RECORDINGS_PATH = './tests/recordings'
const TEST_DATA = {
  repository: {
    owner: 'effect-ts',
    name: 'effect',
  },
  user: {
    username: 'gcanti',
  },
  organization: {
    name: 'effect-ts',
  },
} as const

/**
 * GitHub-specific redaction effect that preserves data structure while redacting sensitive values
 */
const createGitHubRedactionEffect = (context: RedactionContext) => {
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
const redactGitHubData = (obj: unknown): unknown => {
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
  if ('url' in redacted && typeof redacted.url === 'string') {
    redacted.url = redacted.url
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
      // Handle the pattern: api.github.com/example-user/{actual-username}/{repo-name}
      .replace(
        /api\.github\.com\/example-user\/[^/]+\/[^/]+/g,
        'api.github.com/repos/example-user/example-repo',
      )
      // Handle the pattern: api.github.com/example-user/{actual-username}
      .replace(
        /api\.github\.com\/example-user\/[^/]+$/g,
        'api.github.com/users/example-user',
      )
      // Replace PR and issue numbers
      .replace(/\/pulls\/\d+/g, '/pulls/12345')
      .replace(/\/issues\/\d+/g, '/issues/12345')
  }
  if ('html_url' in redacted && typeof redacted.html_url === 'string') {
    redacted.html_url = redacted.html_url
      .replace(/github\.com\/[^/]+/g, 'github.com/example-user')
      // Handle patterns where example-user is already present
      .replace(
        /github\.com\/example-user\/[^/]+/g,
        'github.com/example-user/example-repo',
      )
  }
  if ('clone_url' in redacted && typeof redacted.clone_url === 'string') {
    redacted.clone_url = redacted.clone_url
      .replace(/github\.com\/[^/]+/g, 'github.com/example-user')
      .replace(
        /github\.com\/example-user\/[^/]+/g,
        'github.com/example-user/example-repo',
      )
  }
  if ('ssh_url' in redacted && typeof redacted.ssh_url === 'string') {
    redacted.ssh_url = redacted.ssh_url
      .replace(/github\.com:[^/]+/g, 'github.com:example-user')
      .replace(
        /github\.com:example-user\/[^/]+/g,
        'github.com:example-user/example-repo',
      )
  }
  if ('git_url' in redacted && typeof redacted.git_url === 'string') {
    redacted.git_url = redacted.git_url
      .replace(/github\.com\/[^/]+/g, 'github.com/example-user')
      .replace(
        /github\.com\/example-user\/[^/]+/g,
        'github.com/example-user/example-repo',
      )
  }
  if ('svn_url' in redacted && typeof redacted.svn_url === 'string') {
    redacted.svn_url = redacted.svn_url
      .replace(/github\.com\/[^/]+/g, 'github.com/example-user')
      .replace(
        /github\.com\/example-user\/[^/]+/g,
        'github.com/example-user/example-repo',
      )
  }
  if (
    'latest_comment_url' in redacted &&
    redacted.latest_comment_url === null
  ) {
    // Keep null values as null to preserve API structure
  } else if (
    'latest_comment_url' in redacted &&
    typeof redacted.latest_comment_url === 'string'
  ) {
    redacted.latest_comment_url = redacted.latest_comment_url
      .replace(
        /api\.github\.com\/repos\/[^/]+\/[^/]+/g,
        'api.github.com/repos/example-user/example-repo',
      )
      .replace(
        /api\.github\.com\/example-user\/[^/]+\/[^/]+/g,
        'api.github.com/repos/example-user/example-repo',
      )
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
    if (field in redacted && typeof redacted[field] === 'string') {
      redacted[field] = redacted[field]
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
    }
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
 * Create recording layer with security redactions
 */
const createRecordingLayer = (token: string) => {
  const config = HttpRecorderConfig.make({
    path: RECORDINGS_PATH,
    excludedHeaders: [
      'authorization',
      'x-github-token',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'x-ratelimit-used',
      'etag',
      'last-modified',
      'server',
      'x-github-request-id',
      'x-github-media-type',
    ],
    redaction: createGitHubRedactionEffect,
  })

  const recorder = HttpRecorder.layer(config)

  const githubLayer = GitHub.layer({
    token: Config.succeed(Redacted.make(token)),
  })

  // The key insight: provide the recorder first so its HTTP client is used
  return Layer.provide(githubLayer, Layer.mergeAll(recorder, NodeContext.layer))
}

/**
 * Record NotificationsService methods
 */
const recordNotificationsMethods = Effect.gen(function* () {
  const notifications = yield* GitHubNotifications
  const results: Array<{
    method: string
    params: string
    status: string
    error: string | null
  }> = []

  yield* Console.log('📝 Recording NotificationsService methods...')

  // 1. List notifications for authenticated user
  yield* Console.log('  → listForAuthenticatedUser (default params)')
  const listResult1 = yield* notifications.listForAuthenticatedUser().pipe(
    Effect.map(() => ({
      method: 'listForAuthenticatedUser',
      params: 'default',
      status: 'success',
      error: null,
    })),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.log(`    ❌ Error: ${error}`)
        return {
          method: 'listForAuthenticatedUser',
          params: 'default',
          status: 'failed',
          error: String(error),
        }
      }),
    ),
  )
  results.push(listResult1)

  // 2. List with pagination
  yield* Console.log('  → listForAuthenticatedUser (with pagination)')
  const listResult2 = yield* notifications
    .listForAuthenticatedUser({ perPage: 5, page: 1 })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'paginated',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'paginated',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult2)

  // 3. List all notifications including read
  yield* Console.log('  → listForAuthenticatedUser (all notifications)')
  const listResult3 = yield* notifications
    .listForAuthenticatedUser({ all: true, perPage: 3 })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'all',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'all',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult3)

  // 4. List notifications with specific parameters for empty list test
  yield* Console.log('  → listForAuthenticatedUser (empty list test params)')
  const listResult4 = yield* notifications
    .listForAuthenticatedUser({ all: false, perPage: 100 })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'empty-test',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'empty-test',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult4)

  // 5. Get thread (will likely fail with 404, but that's OK for recording)
  yield* Console.log('  → getThread (sample thread ID)')
  const threadResult = yield* notifications.getThread('17507535488').pipe(
    Effect.map(() => ({
      method: 'getThread',
      params: 'sample-id',
      status: 'success',
      error: null,
    })),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.log(`    ❌ Error: ${error}`)
        return {
          method: 'getThread',
          params: 'sample-id',
          status: 'failed (expected)',
          error: String(error),
        }
      }),
    ),
  )
  results.push(threadResult)

  // 6. Mark notification as read
  yield* Console.log('  → markAsRead')
  const markAsReadResult = yield* notifications.markAsRead('17507535488').pipe(
    Effect.map(() => ({
      method: 'markAsRead',
      params: 'sample-id',
      status: 'success',
      error: null,
    })),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.log(`    ❌ Error: ${error}`)
        return {
          method: 'markAsRead',
          params: 'sample-id',
          status: 'failed (expected)',
          error: String(error),
        }
      }),
    ),
  )
  results.push(markAsReadResult)

  // 7. Mark all notifications as read (will likely fail with 404, but that's OK for recording)
  yield* Console.log('  → markAllAsRead')
  const markAllAsReadResult = yield* notifications.markAllAsRead().pipe(
    Effect.map(() => ({
      method: 'markAllAsRead',
      params: 'default',
      status: 'success',
      error: null,
    })),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.log(`    ❌ Error: ${error}`)
        return {
          method: 'markAllAsRead',
          params: 'default',
          status: 'failed (expected)',
          error: String(error),
        }
      }),
    ),
  )
  results.push(markAllAsReadResult)

  // 8. Mark thread as read
  yield* Console.log('  → markThreadAsRead')
  const markThreadAsReadResult = yield* notifications
    .markThreadAsRead('17507535488')
    .pipe(
      Effect.map(() => ({
        method: 'markThreadAsRead',
        params: 'sample-id',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'markThreadAsRead',
            params: 'sample-id',
            status: 'failed (expected)',
            error: String(error),
          }
        }),
      ),
    )
  results.push(markThreadAsReadResult)

  return results
})

/**
 * Record RepositoriesService methods
 */
const recordRepositoriesMethods = Effect.gen(function* () {
  const repositories = yield* GitHubRepositories
  const results: Array<{
    method: string
    params: string
    status: string
    error: string | null
  }> = []

  yield* Console.log('\n📝 Recording RepositoriesService methods...')

  // 1. List repositories for authenticated user
  yield* Console.log('  → listForAuthenticatedUser (default params)')
  const authListResult1 = yield* repositories.listForAuthenticatedUser().pipe(
    Effect.map(() => ({
      method: 'listForAuthenticatedUser',
      params: 'default',
      status: 'success',
      error: null,
    })),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Console.log(`    ❌ Error: ${error}`)
        return {
          method: 'listForAuthenticatedUser',
          params: 'default',
          status: 'failed',
          error: String(error),
        }
      }),
    ),
  )
  results.push(authListResult1)

  // 2. List with filters
  yield* Console.log('  → listForAuthenticatedUser (filtered)')
  const authListResult2 = yield* repositories
    .listForAuthenticatedUser({
      type: 'owner',
      sort: 'updated',
      direction: 'desc',
      perPage: 5,
    })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'filtered',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'filtered',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(authListResult2)

  // 3. Get specific repository
  yield* Console.log(
    `  → get (${TEST_DATA.repository.owner}/${TEST_DATA.repository.name})`,
  )
  const getResult = yield* repositories
    .get(TEST_DATA.repository.owner, TEST_DATA.repository.name)
    .pipe(
      Effect.map(() => ({
        method: 'get',
        params: 'effect-ts/effect',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'get',
            params: 'effect-ts/effect',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(getResult)

  // 4. Get non-existent repository (for error recording)
  yield* Console.log('  → get (non-existent repo)')
  const getNonExistentResult = yield* repositories
    .get('non-existent-owner-12345', 'non-existent-repo-67890')
    .pipe(
      Effect.map(() => ({
        method: 'get',
        params: 'non-existent',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'get',
            params: 'non-existent',
            status: 'failed (expected)',
            error: String(error),
          }
        }),
      ),
    )
  results.push(getNonExistentResult)

  // 5. List repositories for a user
  yield* Console.log(`  → listForUser (${TEST_DATA.user.username})`)
  const userListResult = yield* repositories
    .listForUser(TEST_DATA.user.username, { perPage: 5, sort: 'updated' })
    .pipe(
      Effect.map(() => ({
        method: 'listForUser',
        params: TEST_DATA.user.username,
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForUser',
            params: TEST_DATA.user.username,
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(userListResult)

  // 6. List repositories for an organization
  yield* Console.log(`  → listForOrg (${TEST_DATA.organization.name})`)
  const orgListResult = yield* repositories
    .listForOrg(TEST_DATA.organization.name, { perPage: 5, type: 'public' })
    .pipe(
      Effect.map(() => ({
        method: 'listForOrg',
        params: TEST_DATA.organization.name,
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForOrg',
            params: TEST_DATA.organization.name,
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(orgListResult)

  // 7. Additional repository recordings for missing test cases
  yield* Console.log('  → listForAuthenticatedUser (public type filter)')
  const authListResult3 = yield* repositories
    .listForAuthenticatedUser({ type: 'public', perPage: 10 })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'public-filter',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'public-filter',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(authListResult3)

  // 8. Member type filter
  yield* Console.log('  → listForAuthenticatedUser (member type filter)')
  const authListResult4 = yield* repositories
    .listForAuthenticatedUser({ type: 'member', perPage: 5 })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'member-filter',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'member-filter',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(authListResult4)

  // 9. Member type filter with larger page size for empty results test
  yield* Console.log('  → listForAuthenticatedUser (member type empty test)')
  const authListResult5 = yield* repositories
    .listForAuthenticatedUser({ type: 'member', perPage: 100 })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'member-empty',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'member-empty',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(authListResult5)

  // 10. User repos with type filter
  yield* Console.log(
    `  → listForUser (${TEST_DATA.user.username} with owner type)`,
  )
  const userListResult2 = yield* repositories
    .listForUser(TEST_DATA.user.username, { type: 'owner', perPage: 10 })
    .pipe(
      Effect.map(() => ({
        method: 'listForUser',
        params: `${TEST_DATA.user.username}-owner`,
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForUser',
            params: `${TEST_DATA.user.username}-owner`,
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(userListResult2)

  // 11. Org repos with sort options
  yield* Console.log(
    `  → listForOrg (${TEST_DATA.organization.name} with sort)`,
  )
  const orgListResult2 = yield* repositories
    .listForOrg(TEST_DATA.organization.name, {
      sort: 'created',
      direction: 'asc',
      perPage: 5,
    })
    .pipe(
      Effect.map(() => ({
        method: 'listForOrg',
        params: `${TEST_DATA.organization.name}-sorted`,
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForOrg',
            params: `${TEST_DATA.organization.name}-sorted`,
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(orgListResult2)

  // 12. Small page size for complex structure test
  yield* Console.log(
    '  → listForAuthenticatedUser (small page for complex test)',
  )
  const authListResult6 = yield* repositories
    .listForAuthenticatedUser({ perPage: 2 })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'complex-test',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'complex-test',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(authListResult6)

  // 13. Complex options encoding test
  yield* Console.log('  → listForAuthenticatedUser (complex options encoding)')
  const authListResult7 = yield* repositories
    .listForAuthenticatedUser({
      type: 'owner',
      sort: 'updated',
      direction: 'desc',
      perPage: 5,
      page: 2,
    })
    .pipe(
      Effect.map(() => ({
        method: 'listForAuthenticatedUser',
        params: 'options-encoding',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForAuthenticatedUser',
            params: 'options-encoding',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(authListResult7)

  return results
})

/**
 * Clean recordings directory
 */
const cleanRecordings = Effect.gen(function* () {
  yield* Console.log(`🧹 Cleaning recordings directory: ${RECORDINGS_PATH}`)

  const fs = yield* FileSystem.FileSystem

  const exists = yield* fs.exists(RECORDINGS_PATH)
  if (exists) {
    yield* fs.remove(RECORDINGS_PATH, { recursive: true })
  }
  yield* fs.makeDirectory(RECORDINGS_PATH, { recursive: true })

  yield* Console.log('✅ Recordings directory cleaned')
})

/**
 * Main recording program
 */
const recordProgram = (config: {
  token: string
  services: ReadonlyArray<string>
  clean: boolean
}) =>
  Effect.gen(function* () {
    yield* Console.log('🎬 GitHub SDK Recording Script')
    yield* Console.log(`📁 Recordings will be saved to: ${RECORDINGS_PATH}`)

    // Ensure recordings directory exists
    const fs = yield* FileSystem.FileSystem
    const recordingsExists = yield* fs.exists(RECORDINGS_PATH)
    if (!recordingsExists) {
      yield* fs.makeDirectory(RECORDINGS_PATH, { recursive: true })
      yield* Console.log(`📁 Created recordings directory: ${RECORDINGS_PATH}`)
    }

    // Clean if requested
    if (config.clean) {
      yield* cleanRecordings
    }

    // Create recording layer with the provided token
    yield* Console.log('🔧 Setting up HTTP recording layer...')
    const layer = createRecordingLayer(config.token)

    // Filter services to record
    const shouldRecordNotifications =
      config.services.length === 0 || config.services.includes('notifications')
    const shouldRecordRepositories =
      config.services.length === 0 || config.services.includes('repositories')

    const allResults = []

    // Record services
    if (shouldRecordNotifications) {
      const notificationResults = yield* recordNotificationsMethods.pipe(
        Effect.provide(layer),
      )
      allResults.push(...notificationResults)
    }

    if (shouldRecordRepositories) {
      const repositoryResults = yield* recordRepositoriesMethods.pipe(
        Effect.provide(layer),
      )
      allResults.push(...repositoryResults)
    }

    // Summary
    yield* Console.log('\n📊 Recording Summary:')
    yield* Console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const successful = allResults.filter((r) => r.status === 'success').length
    const failed = allResults.filter((r) => r.status.includes('failed')).length

    yield* Console.log(`✅ Successful recordings: ${successful}`)
    yield* Console.log(`❌ Failed recordings: ${failed}`)

    yield* Console.log('\nDetailed results:')
    for (const result of allResults) {
      const icon = result.status === 'success' ? '✅' : '❌'
      yield* Console.log(
        `  ${icon} ${result.method}(${result.params}): ${result.status}`,
      )
      if (result.error) {
        yield* Console.log(`    └─ Error: ${result.error}`)
      }
    }

    yield* Console.log('\n✨ Recording generation complete!')
    yield* Console.log(`📁 Check the recordings in: ${RECORDINGS_PATH}`)

    // Verify recordings were created
    const recordingFiles = yield* fs
      .readDirectory(RECORDINGS_PATH)
      .pipe(Effect.catchAll(() => Effect.succeed([])))

    if (recordingFiles.length > 0) {
      yield* Console.log(`📄 Found ${recordingFiles.length} recording file(s):`)
      for (const file of recordingFiles.slice(0, 5)) {
        // Show first 5 files
        yield* Console.log(`  - ${file}`)
      }
      if (recordingFiles.length > 5) {
        yield* Console.log(`  ... and ${recordingFiles.length - 5} more`)
      }
    } else {
      yield* Console.log(
        '⚠️  No recording files were created. Check the layer configuration.',
      )
    }
  })

// CLI Definition
const token = Options.text('token').pipe(
  Options.withDescription('GitHub personal access token'),
  Options.withAlias('t'),
)

const services = Options.choice('services', [
  'notifications',
  'repositories',
]).pipe(
  Options.repeated,
  Options.withDescription('Services to record (default: all)'),
  Options.withAlias('s'),
  Options.optional,
)

const clean = Options.boolean('clean').pipe(
  Options.withDescription('Clean recordings directory before recording'),
  Options.withAlias('c'),
  Options.withDefault(false),
)

export const recordCommand = Command.make(
  'record',
  { token, services, clean },
  ({ token, services, clean }) =>
    recordProgram({
      token,
      services: Option.getOrElse(services, () => [] as ReadonlyArray<string>),
      clean,
    }),
).pipe(
  Command.withDescription('Generate HTTP recordings for GitHub SDK services'),
)
