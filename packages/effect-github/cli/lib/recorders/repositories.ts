/**
 * Recording methods for RepositoriesService
 */

import { Console, Effect } from 'effect'
import { GitHubRepositories } from '../../../src/Services/GitHubRepositories.js'
import { TEST_DATA } from '../config.js'
import type { RecordingResult } from '../types.js'

/**
 * Record RepositoriesService methods
 */
export const recordRepositoriesMethods = Effect.gen(function* () {
  const repositories = yield* GitHubRepositories
  const results: RecordingResult[] = []

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
        params: `${TEST_DATA.repository.owner}/${TEST_DATA.repository.name}`,
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'get',
            params: `${TEST_DATA.repository.owner}/${TEST_DATA.repository.name}`,
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

  // Additional test cases for comprehensive coverage
  const additionalResults = yield* recordAdditionalRepositoryCases(repositories)
  results.push(...additionalResults)

  return results
})

/**
 * Record additional repository test cases for comprehensive coverage
 */
const recordAdditionalRepositoryCases = (repositories: GitHubRepositories) =>
  Effect.gen(function* () {
    const results: RecordingResult[] = []

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