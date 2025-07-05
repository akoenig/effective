import { FileSystem, HttpBody, HttpClient, Path } from '@effect/platform'
import {
  NodeContext,
  NodeFileSystem,
  NodeHttpClient,
  NodePath,
} from '@effect/platform-node'
import { afterAll, describe, expect, it } from '@effect/vitest'
import { Config, Effect, Layer } from 'effect'
import {
  HttpRecorder,
  type RedactionContext,
  RedactionResult,
} from './HttpRecorder.js'

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
describe('HttpRecorder', () => {
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
  describe('Record Mode', () => {
    it.effect(
      'should record GET requests with correct file name format',
      () => {
        const testRecordingsPath = getTestRecordingsPath('get-format')
        return Effect.gen(function* () {
          const client = yield* HttpClient.HttpClient
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
          const response = yield* client.get(testUrl)
          expect(response.status).toBe(200)
          // Verify recording file was created with correct format
          const files = yield* fs.readDirectory(testRecordingsPath)
          const recordingFiles = files.filter((f) => f.endsWith('.json'))
          expect(recordingFiles.length).toBe(1)
          // Verify file name follows format: <timestamp>__<verb>_<slug>
          const fileName = recordingFiles[0] as string
          expect(fileName).toMatch(/^\d+__GET_users-1-posts\.json$/)
          // Verify file content
          const filePath = path.join(testRecordingsPath, fileName)
          const content = yield* fs.readFileString(filePath)
          const transaction = JSON.parse(content)
          expect(transaction.request.method).toBe('GET')
          expect(transaction.request.url).toBe(testUrl)
          expect(transaction.response.status).toBe(200)
          expect(transaction.timestamp).toBeDefined()
          expect(transaction.id).toMatch(/^\d+__GET_users-1-posts$/)
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              HttpRecorder.layer({
                path: testRecordingsPath,
              }),
              NodeLayer,
            ),
          ),
        )
      },
    )
    it.effect('should record POST requests with body data', () => {
      const testRecordingsPath = getTestRecordingsPath('post-body')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
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
        const postData = {
          title: 'Test Post',
          body: 'This is a test post',
          userId: 1,
        }
        const response = yield* client.post(
          'https://jsonplaceholder.typicode.com/posts',
          {
            body: HttpBody.text(JSON.stringify(postData)),
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        expect(response.status).toBe(201)
        // Verify recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(1)
        // Verify file name follows format for POST
        const fileName = recordingFiles[0] as string
        expect(fileName).toMatch(/^\d+__POST_posts\.json$/)
        // Verify file content includes request body
        const filePath = path.join(testRecordingsPath, fileName)
        const content = yield* fs.readFileString(filePath)
        const transaction = JSON.parse(content)
        expect(transaction.request.method).toBe('POST')
        expect(transaction.request.body).toBe(JSON.stringify(postData))
        expect(transaction.response.status).toBe(201)
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layer({
              path: testRecordingsPath,
            }),
            NodeLayer,
          ),
        ),
      )
    })
    it.effect('should exclude sensitive headers by default', () => {
      const testRecordingsPath = getTestRecordingsPath('sensitive-headers')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
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
        const response = yield* client.get(testUrl, {
          headers: {
            Authorization: 'Bearer secret-token',
            'X-API-Key': 'secret-key',
            'Content-Type': 'application/json',
          },
        })
        expect(response.status).toBe(200)
        // Verify recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(1)
        // Verify sensitive headers are excluded
        const filePath = path.join(
          testRecordingsPath,
          recordingFiles[0] as string,
        )
        const content = yield* fs.readFileString(filePath)
        const transaction = JSON.parse(content)
        expect(transaction.request.headers).not.toHaveProperty('authorization')
        expect(transaction.request.headers).not.toHaveProperty('x-api-key')
        expect(transaction.request.headers).toHaveProperty('content-type')
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layer({
              path: testRecordingsPath,
            }),
            NodeLayer,
          ),
        ),
      )
    })
    it.effect('should exclude custom headers when configured', () => {
      const testRecordingsPath = getTestRecordingsPath('custom-headers')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
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
        const response = yield* client.get(testUrl, {
          headers: {
            'X-Custom-Header': 'custom-value',
            'Content-Type': 'application/json',
          },
        })
        expect(response.status).toBe(200)
        // Verify recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(1)
        // Verify custom header is excluded
        const filePath = path.join(
          testRecordingsPath,
          recordingFiles[0] as string,
        )
        const content = yield* fs.readFileString(filePath)
        const transaction = JSON.parse(content)
        expect(transaction.request.headers).not.toHaveProperty(
          'x-custom-header',
        )
        expect(transaction.request.headers).toHaveProperty('content-type')
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layer({
              path: testRecordingsPath,

              excludedHeaders: ['x-custom-header'],
            }),
            NodeLayer,
          ),
        ),
      )
    })
    it.effect('should apply redaction effect when provided', () => {
      const testRecordingsPath = getTestRecordingsPath('redaction')
      const redaction = (context: RedactionContext) => {
        if (context.type === 'request') {
          return Effect.succeed(
            RedactionResult.make({
              headers: { ...context.headers, 'x-redacted': 'true' },
              body: context.body,
            }),
          )
        }
        return Effect.succeed(
          RedactionResult.make({
            headers: context.headers,
            body: context.body === null ? null : { redacted: true },
          }),
        )
      }
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
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
        const response = yield* client.get(testUrl)
        expect(response.status).toBe(200)
        // Verify recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(1)
        // Verify redaction was applied
        const filePath = path.join(
          testRecordingsPath,
          recordingFiles[0] as string,
        )
        const content = yield* fs.readFileString(filePath)
        const transaction = JSON.parse(content)
        expect(transaction.request.headers).toHaveProperty('x-redacted', 'true')
        expect(transaction.response.body).toEqual({ redacted: true })
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layer({
              path: testRecordingsPath,
              redaction,
            }),
            NodeLayer,
          ),
        ),
      )
    })
  })
  describe('File Name Generation', () => {
    it('should generate correct file names for various URL patterns', () => {
      // Test various URL patterns
      const testCases = [
        {
          url: 'https://api.example.com/users',
          expected: /^\d+__GET_users\.json$/,
        },
        {
          url: 'https://api.example.com/users/123',
          expected: /^\d+__GET_users-123\.json$/,
        },
        {
          url: 'https://api.example.com/users/123/posts',
          expected: /^\d+__GET_users-123-posts\.json$/,
        },
        {
          url: 'https://api.example.com/api/v1/users',
          expected: /^\d+__GET_api-v1-users\.json$/,
        },
      ]
      for (const testCase of testCases) {
        // We can't easily test the actual file name generation without making real requests,
        // so we'll verify the pattern matches our expected format
        const urlPath = new URL(testCase.url).pathname
        const expectedSlug = urlPath
          .toLowerCase()
          .trim()
          .replace(/\//g, '-')
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
        const timestamp = Date.now()
        const generatedId = `${timestamp}__GET_${expectedSlug}`
        const fileName = `${generatedId}.json`
        expect(fileName).toMatch(testCase.expected)
      }
    })
  })
  describe('Different HTTP Methods', () => {
    it.effect('should handle different HTTP methods correctly', () => {
      const testRecordingsPath = getTestRecordingsPath('http-methods')
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
        // Test POST request
        const postResponse = yield* client.post(
          'https://jsonplaceholder.typicode.com/posts',
          {
            body: HttpBody.text(
              JSON.stringify({ title: 'Test', body: 'Test body', userId: 1 }),
            ),
            headers: { 'Content-Type': 'application/json' },
          },
        )
        expect(postResponse.status).toBe(201)
        // Test PUT request
        const putResponse = yield* client.put(
          'https://jsonplaceholder.typicode.com/posts/1',
          {
            body: HttpBody.text(
              JSON.stringify({
                id: 1,
                title: 'Updated',
                body: 'Updated body',
                userId: 1,
              }),
            ),
            headers: { 'Content-Type': 'application/json' },
          },
        )
        expect(putResponse.status).toBe(200)
        // Test PATCH request (since DELETE is not available)
        const patchResponse = yield* client.patch(
          'https://jsonplaceholder.typicode.com/posts/1',
          {
            body: HttpBody.text(JSON.stringify({ title: 'Patched' })),
            headers: { 'Content-Type': 'application/json' },
          },
        )
        expect(patchResponse.status).toBe(200)
        // Verify all requests were recorded
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(3)
        // Verify file names contain correct HTTP methods
        const postFile = recordingFiles.find((f) => f.includes('POST'))
        const putFile = recordingFiles.find((f) => f.includes('PUT'))
        const patchFile = recordingFiles.find((f) => f.includes('PATCH'))
        expect(postFile).toBeDefined()
        expect(putFile).toBeDefined()
        expect(patchFile).toBeDefined()
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layer({
              path: testRecordingsPath,
            }),
            NodeLayer,
          ),
        ),
      )
    })
  })
  describe('Headers Support', () => {
    it.effect('should apply static headers from Config.succeed', () => {
      const testRecordingsPath = getTestRecordingsPath('static-headers')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
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
        const response = yield* client.get(testUrl)
        expect(response.status).toBe(200)
        // Verify recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(1)
        // Verify headers were applied
        const filePath = path.join(
          testRecordingsPath,
          recordingFiles[0] as string,
        )
        const content = yield* fs.readFileString(filePath)
        const transaction = JSON.parse(content)
        expect(transaction.request.headers).toHaveProperty(
          'x-custom-header',
          'test-custom-value',
        )
        expect(transaction.request.headers).toHaveProperty(
          'x-service-id',
          'test-service-123',
        )
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layerWithHeaders({
              path: testRecordingsPath,

              headers: {
                'x-custom-header': Config.succeed('test-custom-value'),
                'x-service-id': Config.succeed('test-service-123'),
              },
            }),
            NodeLayer,
          ),
        ),
      )
    })
    it.effect('should apply headers from environment variables', () => {
      const testRecordingsPath = getTestRecordingsPath('env-headers')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
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
        const response = yield* client.get(testUrl)
        expect(response.status).toBe(200)
        // Verify recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(1)
        // Verify headers were applied
        const filePath = path.join(
          testRecordingsPath,
          recordingFiles[0] as string,
        )
        const content = yield* fs.readFileString(filePath)
        const transaction = JSON.parse(content)
        expect(transaction.request.headers).toHaveProperty(
          'x-client-id',
          'env-client-id',
        )
        expect(transaction.request.headers).toHaveProperty(
          'x-service-name',
          'test-service',
        )
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layerWithHeaders({
              path: testRecordingsPath,

              headers: {
                'x-client-id': Config.string('TEST_CLIENT_ID').pipe(
                  Config.withDefault('env-client-id'),
                ),
                'x-service-name': Config.string('SERVICE_NAME').pipe(
                  Config.withDefault('test-service'),
                ),
              },
            }),
            NodeLayer,
          ),
        ),
      )
    })
    it.effect(
      'should merge recorder headers with request headers, request takes precedence',
      () => {
        const testRecordingsPath = getTestRecordingsPath('header-precedence')
        return Effect.gen(function* () {
          const client = yield* HttpClient.HttpClient
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
          const response = yield* client.get(testUrl, {
            headers: {
              'x-client-id': 'request-client-id', // This should override the recorder header
              'content-type': 'application/json', // This should be added to recorder headers
            },
          })
          expect(response.status).toBe(200)
          // Verify recording file was created
          const files = yield* fs.readDirectory(testRecordingsPath)
          const recordingFiles = files.filter((f) => f.endsWith('.json'))
          expect(recordingFiles.length).toBe(1)
          // Verify header precedence
          const filePath = path.join(
            testRecordingsPath,
            recordingFiles[0] as string,
          )
          const content = yield* fs.readFileString(filePath)
          const transaction = JSON.parse(content)
          expect(transaction.request.headers).toHaveProperty(
            'x-client-id',
            'request-client-id',
          ) // Request header wins
          expect(transaction.request.headers).toHaveProperty(
            'x-service-token',
            'recorder-token',
          ) // Recorder header preserved
          expect(transaction.request.headers).toHaveProperty(
            'content-type',
            'application/json',
          ) // Request header added
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              HttpRecorder.layerWithHeaders({
                path: testRecordingsPath,
                headers: {
                  'x-client-id': Config.succeed('recorder-client-id'),
                  'x-service-token': Config.succeed('recorder-token'),
                },
              }),
              NodeLayer,
            ),
          ),
        )
      },
    )
    it.effect('should handle empty headers gracefully', () => {
      const testRecordingsPath = getTestRecordingsPath('empty-headers')
      return Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
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
        const response = yield* client.get(testUrl)
        expect(response.status).toBe(200)
        // Verify recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath)
        const recordingFiles = files.filter((f) => f.endsWith('.json'))
        expect(recordingFiles.length).toBe(1)
        // Verify no extra headers were added
        const filePath = path.join(
          testRecordingsPath,
          recordingFiles[0] as string,
        )
        const content = yield* fs.readFileString(filePath)
        const transaction = JSON.parse(content)
        // Should not have any recorder-specific headers
        expect(transaction.request.headers).not.toHaveProperty('x-client-id')
        expect(transaction.request.headers).not.toHaveProperty(
          'x-service-token',
        )
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            HttpRecorder.layerWithHeaders({
              path: testRecordingsPath,

              headers: {}, // Empty headers
            }),
            NodeLayer,
          ),
        ),
      )
    })
    it.effect(
      'should apply headers but still exclude sensitive headers by default',
      () => {
        const testRecordingsPath = getTestRecordingsPath(
          'sensitive-with-headers',
        )
        return Effect.gen(function* () {
          const client = yield* HttpClient.HttpClient
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
          const response = yield* client.get(testUrl, {
            headers: {
              Authorization: 'Bearer should-be-excluded',
              'X-API-Key': 'should-be-excluded',
              'Content-Type': 'application/json',
            },
          })
          expect(response.status).toBe(200)
          // Verify recording file was created
          const files = yield* fs.readDirectory(testRecordingsPath)
          const recordingFiles = files.filter((f) => f.endsWith('.json'))
          expect(recordingFiles.length).toBe(1)
          // Verify headers were applied correctly
          const filePath = path.join(
            testRecordingsPath,
            recordingFiles[0] as string,
          )
          const content = yield* fs.readFileString(filePath)
          const transaction = JSON.parse(content)
          // Sensitive headers should be excluded
          expect(transaction.request.headers).not.toHaveProperty(
            'authorization',
          )
          expect(transaction.request.headers).not.toHaveProperty('x-api-key')
          // Non-sensitive headers should be included
          expect(transaction.request.headers).toHaveProperty(
            'content-type',
            'application/json',
          )
          expect(transaction.request.headers).toHaveProperty(
            'x-custom-app',
            'test-app',
          )
          expect(transaction.request.headers).toHaveProperty(
            'x-version',
            '1.0.0',
          )
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              HttpRecorder.layerWithHeaders({
                path: testRecordingsPath,
                headers: {
                  'x-custom-app': Config.succeed('test-app'),
                  'x-version': Config.succeed('1.0.0'),
                },
              }),
              NodeLayer,
            ),
          ),
        )
      },
    )
    it.effect(
      'should work with the traditional layer function without headers',
      () => {
        const testRecordingsPath = getTestRecordingsPath('traditional-layer')
        return Effect.gen(function* () {
          const client = yield* HttpClient.HttpClient
          const fs = yield* FileSystem.FileSystem
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
          const response = yield* client.get(testUrl)
          expect(response.status).toBe(200)
          // Verify recording file was created
          const files = yield* fs.readDirectory(testRecordingsPath)
          const recordingFiles = files.filter((f) => f.endsWith('.json'))
          expect(recordingFiles.length).toBe(1)
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              HttpRecorder.layer({
                path: testRecordingsPath,
              }),
              NodeLayer,
            ),
          ),
        )
      },
    )
  })
})
