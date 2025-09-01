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
      perPage: 10,
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

  // 3. List single issue for get test
  yield* Console.log('  → listForRepository (single issue)')
  const listResult3 = yield* issues
    .listForRepository(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      perPage: 1,
    })
    .pipe(
      Effect.map(() => ({
        method: 'listForRepository',
        params: 'single',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForRepository',
            params: 'single',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult3)

  // 4. List with comments sorting (needed by listComments test)
  yield* Console.log('  → listForRepository (sorted by comments)')
  const listResult4 = yield* issues
    .listForRepository(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      sort: 'comments',
      direction: 'desc',
      perPage: 1,
    })
    .pipe(
      Effect.map(() => ({
        method: 'listForRepository',
        params: 'sorted-comments',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listForRepository',
            params: 'sorted-comments',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listResult4)

  // 5. Get specific issue (will use issue #1 as expected by tests)
  yield* Console.log('  → get (issue #1)')
  const getResult = yield* issues
    .get(TEST_DATA.repository.owner, TEST_DATA.repository.name, 1)
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
      title: 'Test Issue from Effect SDK',
      body: 'This is a test issue created by the Effect GitHub SDK',
      labels: ['bug'],
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

  // 7. Create issue for update test
  yield* Console.log('  → create (update test issue)')
  const createUpdateIssueResult = yield* issues
    .create(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      title: 'Test Issue for Update',
      body: 'Original body',
    })
    .pipe(
      Effect.map(() => ({
        method: 'create',
        params: 'update-issue',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'create',
            params: 'update-issue',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(createUpdateIssueResult)

  // 8. Create issue for comments test
  yield* Console.log('  → create (comments test issue)')
  const createCommentsIssueResult = yield* issues
    .create(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      title: 'Test Issue for Comments',
      body: 'Issue for testing comments',
    })
    .pipe(
      Effect.map(() => ({
        method: 'create',
        params: 'comments-issue',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'create',
            params: 'comments-issue',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(createCommentsIssueResult)

  // 9. Create issue for labels test
  yield* Console.log('  → create (labels test issue)')
  const createLabelsIssueResult = yield* issues
    .create(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      title: 'Test Issue for Labels',
      body: 'Issue for testing labels',
    })
    .pipe(
      Effect.map(() => ({
        method: 'create',
        params: 'labels-issue',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'create',
            params: 'labels-issue',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(createLabelsIssueResult)

  // 10. Create issue for label removal test
  yield* Console.log('  → create (label removal test issue)')
  const createLabelRemovalIssueResult = yield* issues
    .create(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      title: 'Test Issue for Label Removal',
      body: 'Issue for testing label removal',
      labels: ['bug', 'enhancement'],
    })
    .pipe(
      Effect.map(() => ({
        method: 'create',
        params: 'label-removal-issue',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'create',
            params: 'label-removal-issue',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(createLabelRemovalIssueResult)

  // 11. Create issue for assignees test
  yield* Console.log('  → create (assignees test issue)')
  const createAssigneesIssueResult = yield* issues
    .create(TEST_DATA.repository.owner, TEST_DATA.repository.name, {
      title: 'Test Issue for Assignees',
      body: 'Issue for testing assignees',
    })
    .pipe(
      Effect.map(() => ({
        method: 'create',
        params: 'assignees-issue',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'create',
            params: 'assignees-issue',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(createAssigneesIssueResult)

  // Record additional operations on the created issue if creation was successful
  if (createResult.status === 'success') {
    const issueOperationResults = yield* recordIssueOperations(issues)
    results.push(...issueOperationResults)
  }

  // 13. Test error cases - non-existent repository
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

  // 14. List comments for issue #1 (needed by listComments test)
  yield* Console.log('  → listComments (issue #1)')
  const listCommentsIssue1Result = yield* issues
    .listComments(TEST_DATA.repository.owner, TEST_DATA.repository.name, 1)
    .pipe(
      Effect.map(() => ({
        method: 'listComments',
        params: 'issue-1',
        status: 'success',
        error: null,
      })),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.log(`    ❌ Error: ${error}`)
          return {
            method: 'listComments',
            params: 'issue-1',
            status: 'failed',
            error: String(error),
          }
        }),
      ),
    )
  results.push(listCommentsIssue1Result)

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
          title: 'Updated Test Issue',
          body: 'Updated body content',
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
          body: 'This is a test comment from the Effect SDK',
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
        ['enhancement', 'good first issue'],
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

    // 10a. Get issue to verify labels were added
    yield* Console.log('  → get (after adding labels)')
    const getAfterAddLabelsResult = yield* issues
      .get(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
      )
      .pipe(
        Effect.map(() => ({
          method: 'get',
          params: 'after-add-labels',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'get',
              params: 'after-add-labels',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(getAfterAddLabelsResult)

    // 11. Remove a label from the issue
    yield* Console.log('  → removeLabel (test issue)')
    const removeLabelResult = yield* issues
      .removeLabel(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
        'bug',
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

    // 11a. Get issue to verify label was removed
    yield* Console.log('  → get (after removing label)')
    const getAfterRemoveLabelResult = yield* issues
      .get(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
      )
      .pipe(
        Effect.map(() => ({
          method: 'get',
          params: 'after-remove-label',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'get',
              params: 'after-remove-label',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(getAfterRemoveLabelResult)

    // 12. Add assignees to the issue
    yield* Console.log('  → addAssignees (test issue)')
    const addAssigneesResult = yield* issues
      .addAssignees(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
        ['akoenig'],
      )
      .pipe(
        Effect.map(() => ({
          method: 'addAssignees',
          params: 'test-issue',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'addAssignees',
              params: 'test-issue',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(addAssigneesResult)

    // 12a. Get issue to verify assignees were added
    yield* Console.log('  → get (after adding assignees)')
    const getAfterAddAssigneesResult = yield* issues
      .get(
        TEST_DATA.repository.owner,
        TEST_DATA.repository.name,
        TEST_DATA.issue.number,
      )
      .pipe(
        Effect.map(() => ({
          method: 'get',
          params: 'after-add-assignees',
          status: 'success',
          error: null,
        })),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.log(`    ❌ Error: ${error}`)
            return {
              method: 'get',
              params: 'after-add-assignees',
              status: 'failed',
              error: String(error),
            }
          }),
        ),
      )
    results.push(getAfterAddAssigneesResult)

    return results
  })
