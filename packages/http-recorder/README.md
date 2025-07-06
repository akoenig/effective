# Effect HTTP Recorder

HTTP client recording and replay capabilities for Effect applications.

## Features

- **Record & Replay**: Capture HTTP interactions during development and replay them in tests
- **Drop-in Integration**: Works seamlessly with Effect's HttpClient without modifying your existing code
- **Automatic Redaction**: Built-in security features to exclude sensitive headers and data
- **Custom Redaction**: Configure custom redaction logic for sanitizing request/response data
- **File-based Storage**: Stores recordings as JSON files for easy inspection and version control
- **Layer-based Architecture**: Provides reusable Effect layers for recording and replaying

## Use Cases

- **Testing**: Record real API interactions and replay them in unit/integration tests
- **Development**: Work offline by replaying previously recorded API responses
- **Debugging**: Capture and analyze HTTP traffic for troubleshooting

## Recording HTTP Interactions

```typescript
import { HttpRecorder } from "@akoenig/effect-http-recorder";
import { HttpClient } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";

// Configure the recorder
const recorder = HttpRecorder.layer({
  path: "./recordings",
  excludedHeaders: ["authorization", "x-api-key"]
});

// Your existing Effect code - no changes needed!
const program = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient;

  return yield* http.get("https://api.example.com/data");
});

// Enable recording by providing the recorder layer
const recordingApp = program.pipe(
  Effect.provide(
    Layer.provideMerge(
      recorder,
      Layer.mergeAll(
        NodeHttpClient.layer,
        NodeContext.layer
      )
    )
  )
);
```

## Replaying Recorded Interactions

```typescript
import { HttpReplayer } from "@akoenig/effect-http-recorder";
import { HttpClient } from "@effect/platform";
import { Effect } from "effect";

// Configure the replayer
const replayer = HttpReplayer.layer({ path: "./recordings" });

// Same program - no code changes required!
const program = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient;

  return yield* http.get("https://api.example.com/data");
});

// Enable replay mode by providing the replayer layer
const replayingApp = program.pipe(
  Effect.provide(
    Layer.provideMerge(
      replayer,
      Layer.mergeAll(
        NodeHttpClient.layer,
        NodeContext.layer
      )
    )
  )
);
```

## Installation

```bash
pnpm add @akoenig/effect-http-recorder
```

## License

MIT, [André König](https://andrekoenig.com)