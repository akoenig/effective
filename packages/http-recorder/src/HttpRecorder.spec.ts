import type { HttpClientRequest } from "@effect/platform";
import { FileSystem, HttpClient, Path } from "@effect/platform";
import { NodeFileSystem, NodeHttpClient, NodePath } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { HttpRecorder } from "./HttpRecorder.js";

const TestLayer = Layer.mergeAll(
  NodeHttpClient.layerUndici,
  NodeFileSystem.layer,
  NodePath.layer,
);

describe("HttpRecorder", () => {
  const testRecordingsPath = "./test-recordings";

  beforeEach(async () => {
    // Clean up any existing test recordings
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(testRecordingsPath, { recursive: true }).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
        );
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  afterEach(async () => {
    // Clean up test recordings after each test
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.remove(testRecordingsPath, { recursive: true }).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
        );
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe("record mode", () => {
    it.effect("should record HTTP requests and responses", () =>
      Effect.gen(function* () {
        const config = {
          path: testRecordingsPath,
          mode: "record" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);
        const fs = yield* FileSystem.FileSystem;

        // Make a request to the test API
        const request = HttpClient.request.get(
          "https://jsonplaceholder.typicode.com/posts",
        );

        const response = yield* httpRecorder.execute(request);

        // Verify the response
        expect(response.status).toBe(200);
        const responseBody = yield* response.json;
        expect(Array.isArray(responseBody)).toBe(true);
        expect(responseBody.length).toBeGreaterThan(0);

        // Verify that a recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath);
        const jsonFiles = files.filter((file) => file.endsWith(".json"));
        expect(jsonFiles.length).toBe(1);

        // Verify the recording content
        const recordingFile = jsonFiles[0];
        const recordingPath = `${testRecordingsPath}/${recordingFile}`;
        const recordingContent = yield* fs.readFileString(recordingPath);
        const recording = JSON.parse(recordingContent);

        expect(recording).toMatchObject({
          id: expect.stringMatching(/^get__.*__\d+$/),
          request: {
            method: "GET",
            url: "https://jsonplaceholder.typicode.com/posts",
            headers: expect.any(Object),
          },
          response: {
            status: 200,
            headers: expect.any(Object),
            body: expect.any(Array),
          },
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        });

        // Verify sensitive headers are excluded
        const requestHeaders = recording.request.headers;
        const responseHeaders = recording.response.headers;
        
        expect(requestHeaders).not.toHaveProperty("authorization");
        expect(requestHeaders).not.toHaveProperty("cookie");
        expect(responseHeaders).not.toHaveProperty("set-cookie");
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should record POST requests with body", () =>
      Effect.gen(function* () {
        const config = {
          path: testRecordingsPath,
          mode: "record" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);
        const fs = yield* FileSystem.FileSystem;

        // Make a POST request with body
        const requestBody = {
          title: "Test Post",
          body: "This is a test post",
          userId: 1,
        };

        const request = HttpClient.request.post(
          "https://jsonplaceholder.typicode.com/posts",
        ).pipe(
          HttpClient.request.setHeader("Content-Type", "application/json"),
          HttpClient.request.jsonBody(requestBody),
        );

        const response = yield* httpRecorder.execute(request);

        // Verify the response
        expect(response.status).toBe(201);
        const responseBody = yield* response.json;
        expect(responseBody).toMatchObject({
          title: "Test Post",
          body: "This is a test post",
          userId: 1,
          id: expect.any(Number),
        });

        // Verify that a recording file was created
        const files = yield* fs.readDirectory(testRecordingsPath);
        const jsonFiles = files.filter((file) => file.endsWith(".json"));
        expect(jsonFiles.length).toBe(1);

        // Verify the recording content includes the request body
        const recordingFile = jsonFiles[0];
        const recordingPath = `${testRecordingsPath}/${recordingFile}`;
        const recordingContent = yield* fs.readFileString(recordingPath);
        const recording = JSON.parse(recordingContent);

        expect(recording.request.method).toBe("POST");
        expect(recording.request.body).toEqual(JSON.stringify(requestBody));
        expect(recording.response.status).toBe(201);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should exclude custom headers", () =>
      Effect.gen(function* () {
        const config = {
          path: testRecordingsPath,
          mode: "record" as const,
          excludedHeaders: ["x-custom-header", "x-secret"],
        };

        const httpRecorder = yield* HttpRecorder(config);
        const fs = yield* FileSystem.FileSystem;

        // Make a request with custom headers
        const request = HttpClient.request.get(
          "https://jsonplaceholder.typicode.com/posts",
        ).pipe(
          HttpClient.request.setHeader("x-custom-header", "should-be-excluded"),
          HttpClient.request.setHeader("x-secret", "very-secret"),
          HttpClient.request.setHeader("x-public", "should-be-included"),
        );

        yield* httpRecorder.execute(request);

        // Verify the recording content excludes custom headers
        const files = yield* fs.readDirectory(testRecordingsPath);
        const recordingFile = files.filter((file) => file.endsWith(".json"))[0];
        const recordingPath = `${testRecordingsPath}/${recordingFile}`;
        const recordingContent = yield* fs.readFileString(recordingPath);
        const recording = JSON.parse(recordingContent);

        const requestHeaders = recording.request.headers;
        expect(requestHeaders).not.toHaveProperty("x-custom-header");
        expect(requestHeaders).not.toHaveProperty("x-secret");
        expect(requestHeaders).toHaveProperty("x-public");
      }).pipe(Effect.provide(TestLayer)),
    );
  });
});