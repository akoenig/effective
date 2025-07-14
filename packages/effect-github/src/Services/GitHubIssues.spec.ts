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
import { GitHubIssues } from './GitHubIssues.js'

describe('GitHubIssues', () => {
  const RECORDINGS_PATH = './tests/recordings'
  const TEST_TOKEN = 'test-token'
  const TEST_OWNER = 'akoenig'
  const TEST_REPO = 'effective'

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

  describe('listForRepository', () => {
    it.effect('should list repository issues without options', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues
        const result = yield* issues.listForRepository(TEST_OWNER, TEST_REPO)

        expect(result).toBeDefined()
        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)

          if (data.length > 0) {
            const issue = data[0]
            expect(issue.id).toBeTypeOf('number')
            expect(issue.number).toBeTypeOf('number')
            expect(issue.title).toBeTypeOf('string')
            expect(issue.state).toMatch(/^(open|closed)$/)
            expect(issue.createdAt).toBeInstanceOf(Date)
            expect(issue.updatedAt).toBeInstanceOf(Date)
          }
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should list repository issues with filters', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues
        const result = yield* issues.listForRepository(TEST_OWNER, TEST_REPO, {
          state: 'closed',
          sort: 'updated',
          direction: 'desc',
          perPage: 10,
        })

        expect(result).toBeDefined()
        expect(Option.isSome(result.data)).toBe(true)

        if (Option.isSome(result.data)) {
          const data = result.data.value
          expect(Array.isArray(data)).toBe(true)
          expect(data.length).toBeLessThanOrEqual(10)

          // Verify all issues are closed
          for (const issue of data) {
            expect(issue.state).toBe('closed')
          }
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should handle repository not found error', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues
        const result = yield* issues.listForRepository(
          'non-existent-owner-12345',
          'non-existent-repo-67890',
        )

        // This should not reach here as it should fail
        expect(result).toBeUndefined()
      }).pipe(
        Effect.catchAll((error) =>
          // biome-ignore lint/correctness/useYield: <explanation>
          Effect.gen(function* () {
            expect(error._tag).toBe('IssueError')
            expect(error.message).toContain('not found')
            expect(error.repository).toBe(
              'non-existent-owner-12345/non-existent-repo-67890',
            )
            expect(error.operation).toBe('list')
          }),
        ),
        Effect.provide(TestLayer),
      ),
    )
  })

  describe('get', () => {
    it.effect('should get a specific issue', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues

        // First get a list to find an issue number
        const listResult = yield* issues.listForRepository(
          TEST_OWNER,
          TEST_REPO,
          { perPage: 1 },
        )

        if (
          Option.isSome(listResult.data) &&
          listResult.data.value.length > 0
        ) {
          const issue = yield* issues.get(TEST_OWNER, TEST_REPO, 1)

          expect(issue.title).toBeTypeOf('string')
          expect(issue.state).toMatch(/^(open|closed)$/)
          expect(issue.createdAt).toBeInstanceOf(Date)
          expect(issue.updatedAt).toBeInstanceOf(Date)
        }
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should handle issue not found error', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues
        const result = yield* issues.get(TEST_OWNER, TEST_REPO, 999999999)

        // This should not reach here as it should fail
        expect(result).toBeUndefined()
      }).pipe(
        Effect.catchAll((error) =>
          // biome-ignore lint/correctness/useYield: <explanation>
          Effect.gen(function* () {
            expect(error._tag).toBe('IssueError')
            expect(error.message).toContain('not found')
            expect(error.issueNumber).toBe(999999999)
            expect(error.repository).toBe(`${TEST_OWNER}/${TEST_REPO}`)
            expect(error.operation).toBe('get')
          }),
        ),
        Effect.provide(TestLayer),
      ),
    )
  })

  describe('create', () => {
    it.effect('should create a new issue', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues
        const issueData = {
          title: 'Test Issue from Effect SDK',
          body: 'This is a test issue created by the Effect GitHub SDK',
          labels: ['bug'],
        }

        const issue = yield* issues.create(TEST_OWNER, TEST_REPO, issueData)

        expect(issue.id).toBeTypeOf('number')
        expect(issue.number).toBeTypeOf('number')
        expect(issue.title).toBe(issueData.title)
        expect(issue.body).toBe(issueData.body)
        expect(issue.state).toBe('open')
        expect(issue.createdAt).toBeInstanceOf(Date)
        expect(issue.updatedAt).toBeInstanceOf(Date)
        expect(issue.labels).toHaveLength(1)
        expect(issue.labels[0].name).toBe('bug')
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('update', () => {
    it.effect('should update an existing issue', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues

        // First create an issue to update
        const createData = {
          title: 'Test Issue for Update',
          body: 'Original body',
        }
        const createdIssue = yield* issues.create(
          TEST_OWNER,
          TEST_REPO,
          createData,
        )

        // Update the issue
        const updateData = {
          title: 'Updated Test Issue',
          body: 'Updated body content',
          state: 'closed' as const,
        }
        const updatedIssue = yield* issues.update(
          TEST_OWNER,
          TEST_REPO,
          createdIssue.number,
          updateData,
        )

        expect(updatedIssue.id).toBe(createdIssue.id)
        expect(updatedIssue.number).toBe(createdIssue.number)
        expect(updatedIssue.title).toBe(updateData.title)
        expect(updatedIssue.body).toBe(updateData.body)
        expect(updatedIssue.state).toBe('closed')
        expect(updatedIssue.updatedAt.getTime()).toBeGreaterThan(
          createdIssue.updatedAt.getTime(),
        )
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('listComments', () => {
    it.effect('should list issue comments', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues

        // Get an issue that likely has comments
        const listResult = yield* issues.listForRepository(
          TEST_OWNER,
          TEST_REPO,
          {
            sort: 'comments',
            direction: 'desc',
            perPage: 1,
          },
        )

        if (
          Option.isSome(listResult.data) &&
          listResult.data.value.length > 0
        ) {
          const result = yield* issues.listComments(TEST_OWNER, TEST_REPO, 75)

          expect(result).toBeDefined()
          expect(Option.isSome(result.data)).toBe(true)

          if (Option.isSome(result.data)) {
            const comments = result.data.value
            expect(Array.isArray(comments)).toBe(true)

            if (comments.length > 0) {
              const comment = comments[0]
              expect(comment.id).toBeTypeOf('number')
              expect(comment.body).toBeTypeOf('string')
              expect(comment.createdAt).toBeInstanceOf(Date)
              expect(comment.updatedAt).toBeInstanceOf(Date)
            }
          }
        }
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('createComment', () => {
    it.effect('should create a comment on an issue', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues

        // First create an issue to comment on
        const issueData = {
          title: 'Test Issue for Comments',
          body: 'Issue for testing comments',
        }
        const issue = yield* issues.create(TEST_OWNER, TEST_REPO, issueData)

        // Create a comment
        const commentData = {
          body: 'This is a test comment from the Effect SDK',
        }
        const comment = yield* issues.createComment(
          TEST_OWNER,
          TEST_REPO,
          issue.number,
          commentData,
        )

        expect(comment.id).toBeTypeOf('number')
        expect(comment.body).toBe(commentData.body)
        expect(comment.createdAt).toBeInstanceOf(Date)
        expect(comment.updatedAt).toBeInstanceOf(Date)
        expect(comment.issueUrl).toContain(`/issues/${issue.number}`)
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('addLabels', () => {
    it.effect('should add labels to an issue', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues

        // First create an issue
        const issueData = {
          title: 'Test Issue for Labels',
          body: 'Issue for testing labels',
        }
        const issue = yield* issues.create(TEST_OWNER, TEST_REPO, issueData)

        // Add labels
        yield* issues.addLabels(TEST_OWNER, TEST_REPO, issue.number, [
          'enhancement',
          'good first issue',
        ])

        // Verify labels were added by getting the issue
        const updatedIssue = yield* issues.get(
          TEST_OWNER,
          TEST_REPO,
          issue.number,
        )
        const labelNames = updatedIssue.labels.map((label) => label.name)
        expect(labelNames).toContain('enhancement')
        expect(labelNames).toContain('good first issue')
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('removeLabel', () => {
    it.effect('should remove a label from an issue', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues

        // First create an issue with labels
        const issueData = {
          title: 'Test Issue for Label Removal',
          body: 'Issue for testing label removal',
          labels: ['bug', 'enhancement'],
        }
        const issue = yield* issues.create(TEST_OWNER, TEST_REPO, issueData)

        // Remove one label
        yield* issues.removeLabel(TEST_OWNER, TEST_REPO, issue.number, 'bug')

        // Verify label was removed by getting the issue
        const updatedIssue = yield* issues.get(
          TEST_OWNER,
          TEST_REPO,
          issue.number,
        )
        const labelNames = updatedIssue.labels.map((label) => label.name)
        expect(labelNames).not.toContain('bug')
        expect(labelNames).toContain('enhancement')
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('addAssignees', () => {
    it.effect('should add assignees to an issue', () =>
      Effect.gen(function* () {
        const issues = yield* GitHubIssues

        // First create an issue
        const issueData = {
          title: 'Test Issue for Assignees',
          body: 'Issue for testing assignees',
        }
        const issue = yield* issues.create(TEST_OWNER, TEST_REPO, issueData)

        // Add assignees (using repository collaborators)
        yield* issues.addAssignees(TEST_OWNER, TEST_REPO, issue.number, [
          'gcanti',
        ])

        // Verify assignees were added by getting the issue
        const updatedIssue = yield* issues.get(
          TEST_OWNER,
          TEST_REPO,
          issue.number,
        )
        const assigneeLogins = updatedIssue.assignees.map(
          (assignee) => assignee.login,
        )
        expect(assigneeLogins).toContain('gcanti')
      }).pipe(Effect.provide(TestLayer)),
    )
  })
})
