import { FileSystem, HttpClientRequest, Path } from "@effect/platform";
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
        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/posts",
        );

        const response = yield* httpRecorder.execute(request);

        // Verify the response
        expect(response.status).toBe(200);
        const responseBody = yield* response.json;
        expect(Array.isArray(responseBody)).toBe(true);
        expect((responseBody as unknown[]).length).toBeGreaterThan(0);

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
          id: expect.stringMatching(/^\d+__GET__.*$/),
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

        const request = yield* HttpClientRequest.post(
          "https://jsonplaceholder.typicode.com/posts",
        ).pipe(
          HttpClientRequest.setHeader("Content-Type", "application/json"),
          HttpClientRequest.bodyJson(requestBody),
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
        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/posts",
        ).pipe(
          HttpClientRequest.setHeader("x-custom-header", "should-be-excluded"),
          HttpClientRequest.setHeader("x-secret", "very-secret"),
          HttpClientRequest.setHeader("x-public", "should-be-included"),
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

  describe("replay mode", () => {
    it.effect("should replay recorded requests", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        // First create a recording file
        const recordingData = {
          id: "1234567890__GET__posts",
          request: {
            method: "GET",
            url: "https://jsonplaceholder.typicode.com/posts",
            headers: { "accept": "application/json" },
          },
          response: {
            status: 200,
            headers: { "content-type": "application/json" },
            body: [{ id: 1, title: "Test Post", body: "Test body" }],
          },
          timestamp: "2023-01-01T00:00:00.000Z",
        };

        const recordingPath = path.join(testRecordingsPath, "1234567890__GET__posts.json");
        yield* fs.writeFileString(recordingPath, JSON.stringify(recordingData, null, 2));

        // Now test replay mode
        const config = {
          path: testRecordingsPath,
          mode: "replay" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);

        // Make the same request that was recorded
        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/posts",
        );

        const response = yield* httpRecorder.execute(request);

        // Verify the response matches the recording
        expect(response.status).toBe(200);
        const responseBody = yield* response.json;
        expect(responseBody).toEqual([{ id: 1, title: "Test Post", body: "Test body" }]);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should fail when no matching recording is found", () =>
      Effect.gen(function* () {
        const config = {
          path: testRecordingsPath,
          mode: "replay" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);

        // Make a request that hasn't been recorded
        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/posts/999",
        );

        const result = yield* Effect.either(httpRecorder.execute(request));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect((result.left as any)._tag).toBe("RequestError");
          expect((result.left as any).description).toBe("No matching recording found");
        }
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should replay POST requests with body matching", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        // Create a POST recording
        const recordingData = {
          id: "1234567890__POST__posts",
          request: {
            method: "POST",
            url: "https://jsonplaceholder.typicode.com/posts",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: "Test", body: "Test body" }),
          },
          response: {
            status: 201,
            headers: { "content-type": "application/json" },
            body: { id: 101, title: "Test", body: "Test body" },
          },
          timestamp: "2023-01-01T00:00:00.000Z",
        };

        const recordingPath = path.join(testRecordingsPath, "1234567890__POST__posts.json");
        yield* fs.writeFileString(recordingPath, JSON.stringify(recordingData, null, 2));

        // Test replay mode
        const config = {
          path: testRecordingsPath,
          mode: "replay" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);

        // Make the same POST request
        const request = yield* HttpClientRequest.post(
          "https://jsonplaceholder.typicode.com/posts",
        ).pipe(
          HttpClientRequest.setHeader("Content-Type", "application/json"),
          HttpClientRequest.bodyJson({ title: "Test", body: "Test body" }),
        );

        const response = yield* httpRecorder.execute(request);

        // Verify the response matches the recording
        expect(response.status).toBe(201);
        const responseBody = yield* response.json;
        expect(responseBody).toEqual({ id: 101, title: "Test", body: "Test body" });
      }).pipe(Effect.provide(TestLayer)),
    );
  });

  describe("error handling", () => {
    it.effect("should handle directory creation errors", () =>
      Effect.gen(function* () {
        const config = {
          path: "/invalid/path/that/cannot/be/created",
          mode: "record" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);

        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/posts",
        );

        // This should still work because we catch recording errors
        const response = yield* httpRecorder.execute(request);
        expect(response.status).toBe(200);
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should handle directory read errors in replay mode", () =>
      Effect.gen(function* () {
        const config = {
          path: "/nonexistent/path",
          mode: "replay" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);

        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/posts",
        );

        const result = yield* Effect.either(httpRecorder.execute(request));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect((result.left as any)._tag).toBe("RequestError");
          expect((result.left as any).description).toContain("Recording error");
        }
      }).pipe(Effect.provide(TestLayer)),
    );

    it.effect("should handle invalid JSON in recording files", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        // Create an invalid JSON file
        const invalidJsonPath = path.join(testRecordingsPath, "invalid.json");
        yield* fs.writeFileString(invalidJsonPath, "{ invalid json }");

        const config = {
          path: testRecordingsPath,
          mode: "replay" as const,
        };

        const httpRecorder = yield* HttpRecorder(config);

        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/posts",
        );

        const result = yield* Effect.either(httpRecorder.execute(request));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect((result.left as any)._tag).toBe("RequestError");
        }
      }).pipe(Effect.provide(TestLayer)),
    );
  });
});