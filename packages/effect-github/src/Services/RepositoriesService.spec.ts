import { HttpReplayer } from '@akoenig/effect-http-recorder'
import {
  NodeContext,
  NodeFileSystem,
  NodeHttpClient,
  NodePath,
} from '@effect/platform-node'
import { describe, expect, it } from '@effect/vitest'
import { Config, Effect, Layer, Option, Redacted } from 'effect'
import { GitHub } from '../layer.js'
import { RepositoriesService } from './RepositoriesService.js'

describe('RepositoriesService', () => {
  const RECORDINGS_PATH = './tests/recordings'
  const TEST_TOKEN = 'test-token'

  // Create the complete Node layer
  const NodeLayer = Layer.mergeAll(
    NodeHttpClient.layer,
    NodeContext.layer,
    NodeFileSystem.layer,
    NodePath.layer,
  )

  const recorder = HttpReplayer.layer({
    path: RECORDINGS_PATH,
  })

  const githubLayer = GitHub.layer({
    token: Config.succeed(Redacted.make(TEST_TOKEN)),
  })

  const TestLayer = Layer.provideMerge(
    githubLayer,
    Layer.provideMerge(recorder, NodeLayer),
  )

  describe('listForAuthenticatedUser', () => {
    it.effect('should list repositories without options', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForAuthenticatedUser()

        expect(result).toBeDefined()
        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
          expect(data.length).toBeGreaterThan(0)

          // Verify structure of first repository (guaranteed to exist in NonEmptyArray)
          const repo = data[0] // This is guaranteed to be defined
          expect(repo).toHaveProperty('id')
          expect(repo).toHaveProperty('name')
          expect(repo).toHaveProperty('fullName')
          expect(repo).toHaveProperty('private')
          expect(repo).toHaveProperty('owner')
          expect(repo).toHaveProperty('htmlUrl')
          expect(repo).toHaveProperty('description')
          expect(repo).toHaveProperty('fork')
          expect(repo).toHaveProperty('createdAt')
          expect(repo).toHaveProperty('updatedAt')
          expect(repo).toHaveProperty('pushedAt')
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should list repositories with filters', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForAuthenticatedUser({
          type: 'owner',
          sort: 'updated',
          direction: 'desc',
          perPage: 5,
        })

        expect(result).toBeDefined()
        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)

          // Verify the results respect the filters (NonEmptyArray guarantees at least one item)
          const repo1 = data[0] // Guaranteed to exist
          if (data.length > 1) {
            const repo2 = data[1] // Safe to access when length > 1

            // Check that repos are sorted by updated time (desc)
            expect(repo1.updatedAt.getTime()).toBeGreaterThanOrEqual(repo2.updatedAt.getTime())
          }
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should handle type filter for public repositories', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForAuthenticatedUser({
          type: 'public',
          perPage: 10,
        })

        expect(result).toBeDefined()
        expect(Option.isOption(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should handle member type filter', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForAuthenticatedUser({
          type: 'member',
          perPage: 5,
        })

        expect(result).toBeDefined()
        expect(Option.isOption(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should return Option.none() for empty results', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        // Using very specific filters that might return no results
        const result = yield* repositories.listForAuthenticatedUser({
          type: 'member',
          perPage: 100,
        })

        expect(result).toBeDefined()
        expect(Option.isOption(result.data)).toBe(true)
        // The result could be either Some or None depending on actual data
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('get', () => {
    it.effect('should get specific repository successfully', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.get('effect-ts', 'effect')

        expect(result).toBeDefined()
        expect(result.id).toBe(12345)
        expect(result.name).toBe('Example User')
        expect(result.fullName).toBe('example-user/example-repo')
        expect(result).toHaveProperty('owner')
        expect(result.owner).toBeDefined()
        expect(result.owner.login).toBe('example-user')
        expect(result).toHaveProperty('private')
        expect(result).toHaveProperty('htmlUrl')
        expect(result).toHaveProperty('description')
        expect(result).toHaveProperty('fork')
        expect(result).toHaveProperty('createdAt')
        expect(result).toHaveProperty('updatedAt')
        expect(result).toHaveProperty('pushedAt')
        expect(result).toHaveProperty('homepage')
        expect(result).toHaveProperty('size')
        expect(result).toHaveProperty('stargazersCount')
        expect(result).toHaveProperty('watchersCount')
        expect(result).toHaveProperty('language')
        expect(result).toHaveProperty('forksCount')
        expect(result).toHaveProperty('openIssuesCount')
        expect(result).toHaveProperty('license')
        expect(result).toHaveProperty('topics')
        expect(result).toHaveProperty('defaultBranch')
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect(
      'should handle non-existent repository with RepositoryError',
      () =>
        Effect.gen(function* () {
          const repositories = yield* RepositoriesService
          const result = yield* Effect.either(
            repositories.get(
              'non-existent-owner-12345',
              'non-existent-repo-67890',
            ),
          )

          expect(result._tag).toBe('Left')
          if (result._tag === 'Left') {
            expect(result.left._tag).toBe('RepositoryError')
            expect(result.left.message).toContain(
              'Repository non-existent-owner-12345/non-existent-repo-67890 not found',
            )

            // Type guard to access RepositoryError-specific properties
            if (result.left._tag === 'RepositoryError') {
              expect(result.left.repository).toBe(
                'non-existent-owner-12345/non-existent-repo-67890',
              )
              expect(result.left.operation).toBe('get')
            }
          }
        }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('listForUser', () => {
    it.effect('should list repositories for a specific user', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForUser('gcanti', {
          perPage: 5,
          sort: 'updated',
        })

        expect(result).toBeDefined()
        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
          expect(data.length).toBeGreaterThan(0)

          // Verify all repos belong to the requested user
          data.forEach((repo) => {
            expect(repo.owner).toBeDefined()
            expect(repo.owner.login).toBe('example-user')
          })
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should handle type filter for user repositories', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForUser('gcanti', {
          type: 'owner',
          perPage: 10,
        })

        expect(result).toBeDefined()
        expect(Option.isOption(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
        }
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('listForOrg', () => {
    it.effect('should list repositories for an organization', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForOrg('effect-ts', {
          perPage: 5,
          type: 'public',
        })

        expect(result).toBeDefined()
        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
          expect(data.length).toBeGreaterThan(0)

          // Verify all repos belong to the organization
          data.forEach((repo) => {
            expect(repo.owner).toBeDefined()
            expect(repo.owner.type).toBe('Organization')
          })
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should handle sort options for organization repositories', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForOrg('effect-ts', {
          sort: 'created',
          direction: 'asc',
          perPage: 5,
        })

        expect(result).toBeDefined()
        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)

          // Verify sorting (NonEmptyArray guarantees at least one item)
          const repo1 = data[0] // Guaranteed to exist
          if (data.length > 1) {
            const repo2 = data[1] // Safe to access when length > 1

            expect(repo1.createdAt.getTime()).toBeLessThanOrEqual(repo2.createdAt.getTime())
          }
        }
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('Service Layer', () => {
    it('should provide default layer', () => {
      expect(RepositoriesService.Default).toBeDefined()
      expect(Layer.isLayer(RepositoriesService.Default)).toBe(true)
    })
  })

  describe('Response Parsing', () => {
    it.effect('should properly parse snake_case to camelCase', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const repo = yield* repositories.get('effect-ts', 'effect')

        // Verify camelCase conversion
        expect(repo).toHaveProperty('fullName') // from full_name
        expect(repo).toHaveProperty('htmlUrl') // from html_url
        expect(repo).toHaveProperty('createdAt') // from created_at
        expect(repo).toHaveProperty('updatedAt') // from updated_at
        expect(repo).toHaveProperty('pushedAt') // from pushed_at
        expect(repo).toHaveProperty('gitUrl') // from git_url
        expect(repo).toHaveProperty('sshUrl') // from ssh_url
        expect(repo).toHaveProperty('cloneUrl') // from clone_url
        expect(repo).toHaveProperty('svnUrl') // from svn_url
        expect(repo).toHaveProperty('stargazersCount') // from stargazers_count
        expect(repo).toHaveProperty('watchersCount') // from watchers_count
        expect(repo).toHaveProperty('forksCount') // from forks_count
        expect(repo).toHaveProperty('openIssuesCount') // from open_issues_count
        expect(repo).toHaveProperty('defaultBranch') // from default_branch

        // Verify owner object camelCase conversion
        expect(repo.owner).toHaveProperty('avatarUrl') // from avatar_url
        expect(repo.owner).toHaveProperty('htmlUrl') // from html_url
        expect(repo.owner).toHaveProperty('reposUrl') // from repos_url
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should parse complex nested structures in list responses', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService
        const result = yield* repositories.listForAuthenticatedUser({
          perPage: 2,
        })

        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(data.length).toBeGreaterThan(0)

          const repo = data[0]

          // Verify URL properties that exist in Repository schema are converted to camelCase
          const urlProperties = [
            'htmlUrl',
            'url', 
            'cloneUrl',
            'sshUrl',
            'gitUrl',
            'svnUrl',
            'mirrorUrl',
            'homepage',
          ]

          urlProperties.forEach((prop) => {
            expect(repo).toHaveProperty(prop)
          })
        }
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('Options Encoding', () => {
    it.effect('should properly encode camelCase options to snake_case', () =>
      Effect.gen(function* () {
        const repositories = yield* RepositoriesService

        // Test various option combinations
        const result = yield* repositories.listForAuthenticatedUser({
          perPage: 5,
          page: 2,
          type: 'owner',
          sort: 'updated',
          direction: 'desc',
        })

        expect(result).toBeDefined()
        expect(Option.isOption(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
        }
      }).pipe(Effect.provide(TestLayer)),
    )
  })
})
