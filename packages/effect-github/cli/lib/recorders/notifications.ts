/**
 * Recording methods for NotificationsService
 */

import { Console, Effect } from 'effect'
import { GitHubNotifications } from '../../../src/Services/GitHubNotifications.js'
import type { RecordingResult } from '../types.js'

/**
 * Record NotificationsService methods
 */
export const recordNotificationsMethods = Effect.gen(function* () {
  const notifications = yield* GitHubNotifications
  const results: RecordingResult[] = []

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
