/**
 * Recording methods for IssuesService
 */

import { Console, Effect } from 'effect'
import { GitHubIssues } from '../../../src/Services/GitHubIssues.js'
import { TEST_DATA } from '../config.js'
import type { RecordingResult } from '../types.js'

/**
 * Record IssuesService methods
 */
export const recordIssuesMethods = Effect.gen(function* () {
  const issues = yield* GitHubIssues
  const results: RecordingResult[] = []

  yield* Console.log('\n📝 Recording IssuesService methods...')

  // 1. List repository issues (default parameters)
  yield* Console.log(
    `  → listForRepository (${TEST_DATA.repository.owner}/${TEST_DATA.repository.name})`,
  )
  const listResult1 = yield* issues
    .listForRepository(TEST_DATA.repository.owner, TEST_DATA.repository.name)
    .pipe(
      Effect.map(() => ({
        method: 'listForRepository',
        params: 'default',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForRepository',
            params: 'default',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult1)

  // 2. List with filters (closed issues)
  yield* Console.log('  → listForRepository (closed issues)')
  const listResult2 = yield* issues
    .listForRepository(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      perPage: 5,
    })
    .pipe(
      Effect.map(() => ({
        method: 'listForRepository',
        params: 'closed',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForRepository',
            params: 'closed',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult2)

  // 3. List with label filter
  yield* Console.log('  → listForRepository (with labels)')
  const listResult3 = yield* issues
    .listForRepository(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      labels: 'bug,enhancement',
      perPage: 10,
    })
    .pipe(
      Effect.map(() => ({
        method: 'listForRepository',
        params: 'labeled',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForRepository',
            params: 'labeled',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult3)

  // 4. Get specific issue (will use issue #1 as example)
  yield* Console.log(`  → get (issue #${TEST_DATA.issue.number})`)
  const getResult = yield* issues
    .get(
      TEST_DATA.repository.owner,
      TEST_DATA.repository.name,
      TEST_DATA.issue.number,
    )
    .pipe(
      Effect.map(() => ({
        method: 'get',
        params: `issue-${TEST_DATA.issue.number}`,
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'get',
            params: `issue-${TEST_DATA.issue.number}`,
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(getResult)

  // 5. Get non-existent issue (for error recording)
  yield* Console.log('  → get (non-existent issue)')
  const getNonExistentResult = yield* issues
    .get(TEST_DATA.repository.owner, TEST_DATA.repository.name, 999999999)
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

  // 6. Create a test issue
  yield* Console.log('  → create (test issue)')
  const createResult = yield* issues
    .create(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      title: TEST_DATA.issue.title,
      body: TEST_DATA.issue.body,
      labels: TEST_DATA.issue.labels,
    })
    .pipe(
      Effect.map((createdIssue) => {
        // Store the created issue number for later use
        TEST_DATA.issue.number = createdIssue.number
        return {
          method: 'create',
          params: 'test-issue',
          status: 'success',
          error: null,
        }
      }),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'create',
            params: 'test-issue',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(createResult)

  // Record additional operations on the created issue if creation was successful
  if (createResult.status === 'success') {
    const issueOperationResults = yield* recordIssueOperations(issues)
    results.push(...issueOperationResults)
  }

  // 12. Test error cases - non-existent repository
  yield* Console.log('  → listForRepository (non-existent repo)')
  const listNonExistentRepoResult = yield* issues
    .listForRepository('non-existent-owner-12345', 'non-existent-repo-67890')
    .pipe(
      Effect.map(() => ({
        method: 'listForRepository',
        params: 'non-existent-repo',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForRepository',
            params: 'non-existent-repo',
            status: 'failed (expected)',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listNonExistentRepoResult)

  return results
})

/**
 * Record operations on a created issue
 */
const recordIssueOperations = (issues: GitHubIssues) =>
  Effect.gen(function* () {
    const results: RecordingResult[] = []

    // 7. Update the created issue
    yield* Console.log('  → update (test issue)')
    const updateResult = yield* issues
      .update(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
        {
          title: `${TEST_DATA.issue.title} - Updated`,
          body: `${TEST_DATA.issue.body}\n\nThis issue has been updated by the recorder.`,
          state: 'closed',
        },
      )
      .pipe(
        Effect.map(() => ({
          method: 'update',
          params: 'test-issue',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'update',
              params: 'test-issue',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(updateResult)

    // 8. List comments on the created issue
    yield* Console.log('  → listComments (test issue)')
    const listCommentsResult = yield* issues
      .listComments(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
      )
      .pipe(
        Effect.map(() => ({
          method: 'listComments',
          params: 'test-issue',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'listComments',
              params: 'test-issue',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(listCommentsResult)

    // 9. Create a comment on the issue
    yield* Console.log('  → createComment (test issue)')
    const createCommentResult = yield* issues
      .createComment(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
        {
          body: 'This is a test comment created by the Effect GitHub SDK HTTP recorder.',
        },
      )
      .pipe(
        Effect.map(() => ({
          method: 'createComment',
          params: 'test-issue',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'createComment',
              params: 'test-issue',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(createCommentResult)

    // 10. Add labels to the issue
    yield* Console.log('  → addLabels (test issue)')
    const addLabelsResult = yield* issues
      .addLabels(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
        ['good first issue'],
      )
      .pipe(
        Effect.map(() => ({
          method: 'addLabels',
          params: 'test-issue',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'addLabels',
              params: 'test-issue',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(addLabelsResult)

    // 11. Remove a label from the issue
    yield* Console.log('  → removeLabel (test issue)')
    const removeLabelResult = yield* issues
      .removeLabel(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
        'documentation',
      )
      .pipe(
        Effect.map(() => ({
          method: 'removeLabel',
          params: 'test-issue',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'removeLabel',
              params: 'test-issue',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(removeLabelResult)

    return results
  })