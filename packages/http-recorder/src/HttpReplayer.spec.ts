import { FileSystem, HttpBody, HttpClient, Path } from '@effect/platform'
import {
  NodeContext,
  NodeFileSystem,
  NodeHttpClient,
  NodePath,
} from '@effect/platform-node'
import { afterAll, describe, expect, it } from '@effect/vitest'
import { Config, Effect, Layer } from 'effect'
import { HttpRecorder } from './HttpRecorder.js'
import { HttpReplayer } from './HttpReplayer.js'

const NodeLayer = Layer.mergeAll(
  NodeHttpClient.layer,
  NodeContext.layer,
  NodeFileSystem.layer,
  NodePath.layer,
)

const rootTestRecordingsPath = './test-recordings'
const getTestRecordingsPath = (testName: string) =>
  `${rootTestRecordingsPath}/${testName}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}`
const testUrl = 'https://jsonplaceholder.typicode.com/users/1/posts'

describe('HttpReplayer', () => {
  // Clean up the root test recordings directory after all tests
  afterAll(async () => {
    await Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const exists = yield* fs.exists(rootTestRecordingsPath)
      if (exists) {
        yield* fs.remove(rootTestRecordingsPath, { recursive: true })
      }
    }).pipe(Effect.provide(NodeFileSystem.layer), Effect.runPromise)
  })

  describe('Replay Mode', () => {
    it.effect('should replay recorded transactions', () => {
      const testRecordingsPath = getTestRecordingsPath('replay')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        // Clean up any existing test subdirectory
        yield* fs.exists(testRecordingsPath).pipe(
          Effect.flatMap((exists) =>
            exists ? fs.remove(testRecordingsPath) : Effect.succeed(undefined),
          ),
          Effect.catchAll(() => Effect.succeed(undefined)),
        )
        // Ensure test subdirectory exists
        yield* fs
          .makeDirectory(testRecordingsPath, { recursive: true })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)))
        // First, record a transaction
        const recordClient = yield* Effect.provide(
          HttpClient.HttpClient,
          Layer.provideMerge(
            HttpRecorder.layer({
              path: testRecordingsPath,
            }),
            NodeLayer,
          ),
        )
        const recordResponse = yield* recordClient.get(testUrl)
        expect(recordResponse.status).toBe(200)
        // Now replay the transaction
        const replayResponse = yield* client.get(testUrl)
        expect(replayResponse.status).toBe(200)
        // Verify the response matches the recorded one
        const replayBody = yield* replayResponse.json
        const recordBody = yield* recordResponse.json
        expect(replayBody).toEqual(recordBody)
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpReplayer.layer({ path: testRecordingsPath }),
            NodeLayer,
          ),
        ),
      )
    })

    it.effect('should fail when no matching recording is found', () => {
      const testRecordingsPath = getTestRecordingsPath('no-match')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        // Clean up any existing test subdirectory
        yield* fs.exists(testRecordingsPath).pipe(
          Effect.flatMap((exists) =>
            exists ? fs.remove(testRecordingsPath) : Effect.succeed(undefined),
          ),
          Effect.catchAll(() => Effect.succeed(undefined)),
        )
        // Ensure test subdirectory exists
        yield* fs
          .makeDirectory(testRecordingsPath, { recursive: true })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)))
        // Try to replay a request that wasn't recorded
        const result = yield* client
          .get('https://jsonplaceholder.typicode.com/users/999')
          .pipe(Effect.either)
        expect(result._tag).toBe('Left')
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpReplayer.layer({ path: testRecordingsPath }),
            NodeLayer,
          ),
        ),
      )
    })

    it.effect('should apply headers in replay mode', () => {
      const testRecordingsPath = getTestRecordingsPath('replay-headers')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        // Clean up any existing test subdirectory
        yield* fs.exists(testRecordingsPath).pipe(
          Effect.flatMap((exists) =>
            exists ? fs.remove(testRecordingsPath) : Effect.succeed(undefined),
          ),
          Effect.catchAll(() => Effect.succeed(undefined)),
        )
        // Ensure test subdirectory exists
        yield* fs
          .makeDirectory(testRecordingsPath, { recursive: true })
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)))
        // First, record a transaction with headers
        const recordClient = yield* Effect.provide(
          HttpClient.HttpClient,
          Layer.provideMerge(
            HttpRecorder.layerWithHeaders({
              path: testRecordingsPath,
              headers: {
                'x-test-header': Config.succeed('test-value'),
                'x-session-id': Config.succeed('session-123'),
              },
            }),
            NodeLayer,
          ),
        )
        const recordResponse = yield* recordClient.get(testUrl)
        expect(recordResponse.status).toBe(200)
        // Now replay the transaction - headers should match the recorded ones
        const replayResponse = yield* client.get(testUrl)
        expect(replayResponse.status).toBe(200)
        // Verify the response matches the recorded one
        const replayBody = yield* replayResponse.json
        const recordBody = yield* recordResponse.json
        expect(replayBody).toEqual(recordBody)
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpReplayer.layer({ path: testRecordingsPath }),
            NodeLayer,
          ),
        ),
      )
    })

    it.effect(
      'should handle empty responses (any status code with null/empty body)',
      () => {
        const testRecordingsPath = getTestRecordingsPath('empty-responses')
        return Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem
          const path = yield* Path.Path

          // Clean up any existing test subdirectory
          yield* fs.exists(testRecordingsPath).pipe(
            Effect.flatMap((exists) =>
              exists
                ? fs.remove(testRecordingsPath)
                : Effect.succeed(undefined),
            ),
            Effect.catchAll(() => Effect.succeed(undefined)),
          )
          // Ensure test subdirectory exists
          yield* fs
            .makeDirectory(testRecordingsPath, { recursive: true })
            .pipe(Effect.catchAll(() => Effect.succeed(undefined)))

          // Create mock recordings for various status codes with empty bodies
          const baseTimestamp = Date.now()

          const recordings = [
            {
              suffix: '204',
              method: 'DELETE',
              url: 'https://api.example.com/resource/204',
              status: 204,
              body: null,
              description: '204 No Content',
            },
            {
              suffix: '205',
              method: 'PUT',
              url: 'https://api.example.com/resource/205',
              status: 205,
              body: null,
              description: '205 Reset Content',
            },
            {
              suffix: '304',
              method: 'GET',
              url: 'https://api.example.com/resource/304',
              status: 304,
              body: null,
              description: '304 Not Modified',
            },
            {
              suffix: '200-empty',
              method: 'GET',
              url: 'https://api.example.com/resource/200-empty',
              status: 200,
              body: '', // Empty string body
              description: '200 OK with empty body',
            },
          ]

          // Create recording files for each scenario
          for (const [index, recording] of recordings.entries()) {
            const timestamp = baseTimestamp + index * 1000
            const recordingData = {
              id: `${timestamp}__${recording.method}_resource-${recording.suffix}`,
              request: {
                method: recording.method,
                url: recording.url,
                headers: {
                  accept: 'application/json',
                },
              },
              response: {
                status: recording.status,
                headers: {
                  'content-type': 'application/json',
                },
                body: recording.body,
              },
              timestamp: new Date(timestamp).toISOString(),
            }

            const recordingPath = path.join(
              testRecordingsPath,
              `${timestamp}__${recording.method}_resource-${recording.suffix}.json`,
            )
            yield* fs.writeFileString(
              recordingPath,
              JSON.stringify(recordingData, null, 2),
            )
          }

          // Now test replaying these empty responses
          const client = yield* HttpClient.HttpClient

          // Test 204 No Content response
          const response204 = yield* client.del(
            'https://api.example.com/resource/204',
          )
          expect(response204.status).toBe(204)

          // Test 205 Reset Content response
          const response205 = yield* client.put(
            'https://api.example.com/resource/205',
            {
              body: HttpBody.text('{}'),
              headers: {
                'content-type': 'application/json',
              },
            },
          )
          expect(response205.status).toBe(205)

          // Test 304 Not Modified response
          const response304 = yield* client.get(
            'https://api.example.com/resource/304',
          )
          expect(response304.status).toBe(304)

          // Test 200 OK with empty body
          const response200Empty = yield* client.get(
            'https://api.example.com/resource/200-empty',
          )
          expect(response200Empty.status).toBe(200)
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              HttpReplayer.layer({ path: testRecordingsPath }),
              NodeLayer,
            ),
          ),
        )
      },
    )
  })
})
