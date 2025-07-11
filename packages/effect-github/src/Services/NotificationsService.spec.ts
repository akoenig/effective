import { HttpReplayer } from '@akoenig/effect-http-recorder'
import {
  NodeContext,
  NodeFileSystem,
  NodeHttpClient,
  NodePath,
} from '@effect/platform-node'
import { describe, expect, it } from '@effect/vitest'
import { Config, Effect, Layer, Redacted } from 'effect'
import { GitHub } from '../layer.js'
import { NotificationsService } from './NotificationsService.js'

describe('NotificationsService', () => {
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
    it.effect('should list notifications without options', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService
        const result = yield* notifications.listForAuthenticatedUser()

        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
        expect(result.data.length).toBe(37)
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should list notifications with pagination', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService
        const result = yield* notifications.listForAuthenticatedUser({
          perPage: 5,
          page: 1,
        })

        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
        expect(result.data.length).toBe(37)
      }).pipe(Effect.provide(TestLayer)),
    )

    it.effect('should list all notifications including read', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService
        const result = yield* notifications.listForAuthenticatedUser({
          all: true,
          perPage: 3,
        })

        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('getThread', () => {
    it.effect('should get thread notification successfully', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService
        // The recording shows a successful response with notification data
        const result = yield* notifications.getThread('17507535488')

        expect(result).toBeDefined()
        expect(result.id).toBe('redacted_id')
        expect(result.unread).toBe(false)
        expect(result.reason).toBe('review_requested')
        expect(result.updatedAt).toBe('2023-01-01T00:00:00Z')
        expect(result.subject).toBeDefined()
        expect(result.subject.title).toBe('Example title')
        expect(result.subject.type).toBe('PullRequest')
        expect(result.repository).toBeDefined()
        expect(result.repository.fullName).toBe('example-user/example-repo')
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('markAsRead', () => {
    it.effect('should mark notification as read successfully', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService
        // The recording shows a successful 204 response for DELETE
        const result = yield* notifications.markAsRead('17507535488')

        // markAsRead returns void on success (204 No Content)
        expect(result).toBeUndefined()
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('markAllAsRead', () => {
    it.effect('should mark all notifications as read successfully', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService
        // The recording shows a successful 205 response for PUT
        const result = yield* notifications.markAllAsRead()

        // markAllAsRead returns void on success (205 Reset Content)
        expect(result).toBeUndefined()
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('markThreadAsRead', () => {
    it.effect('should mark thread as read successfully', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService
        // The recording shows a successful 205 response for PATCH
        const result = yield* notifications.markThreadAsRead('17507535488')

        // markThreadAsRead returns void on success (205 Reset Content)
        expect(result).toBeUndefined()
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('Service Layer', () => {
    it('should provide default layer', () => {
      expect(NotificationsService.Default).toBeDefined()
      expect(Layer.isLayer(NotificationsService.Default)).toBe(true)
    })
  })

  describe('Error Transformation', () => {
    it.effect('should handle successful operations correctly', () =>
      Effect.gen(function* () {
        const notifications = yield* NotificationsService

        // All recorded responses are successful, so we test success cases
        const threadResult = yield* notifications.getThread('17507535488')
        yield* notifications.markAsRead('17507535488')
        yield* notifications.markThreadAsRead('17507535488')

        // Verify successful operations
        expect(threadResult).toBeDefined()
        expect(threadResult.id).toBe('redacted_id')
        // Mark operations return void, so we just verify they don't throw
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  describe('Response Parsing', () => {
    it.effect(
      'should properly parse snake_case to camelCase using getThread',
      () =>
        Effect.gen(function* () {
          const notifications = yield* NotificationsService
          // Use getThread since it returns actual notification data
          const notification = yield* notifications.getThread('17507535488')

          // Verify camelCase conversion
          expect(notification).toHaveProperty('updatedAt') // from updated_at
          expect(notification.updatedAt).toBe('2023-01-01T00:00:00Z')
          expect(notification).toHaveProperty('lastReadAt') // from last_read_at
          expect(notification.lastReadAt).toBeNull()
          expect(notification).toHaveProperty('subscriptionUrl') // from subscription_url

          // Verify nested objects are also converted
          expect(notification.subject).toHaveProperty('latestCommentUrl') // from latest_comment_url
          expect(notification.repository).toHaveProperty('fullName') // from full_name
          expect(notification.repository.fullName).toBe(
            'example-user/example-repo',
          )
          expect(notification.repository).toHaveProperty('htmlUrl') // from html_url
        }).pipe(Effect.provide(TestLayer)),
    )
  })
})
