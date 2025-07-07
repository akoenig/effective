# Recording Http Client

- Renovate

# GitHub

- Nested values should be redacted
- Tests? How?
- Semantic errors instead of type attributes (see `domain/errors.ts`)
- Integrate other endpoints
- Refresh JSDocs
- Refactor exports (only export what is really required)
- GitHub actions npm publishing flow
- `findMatchingRecording` should use Effect Schema
- Refresh README (feature listing, e.g. automatic snake to camel case converstion, etc.)
- Only export necessary modules from the entrypoint `mod.ts`


- JSDoc for attributes in the response types (possible?)
- Integrate all the other GitHub endpoints
- Integrate Linear Notifications


```ts
const program = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient;

  yield* http.get("https://api.github.com/user")

}).pipe(Effect.provide(
  Layer.provideMerge(
    HttpRecorder.Default({
      path: "./recordings",
      mode: "record", // Change to "replay" to use recorded responses
      excludedHeaders: ["x-github-request-id"],
    }),
    NodeHttpClient.layer,
  )
))
```

Bad:

```ts
  const shouldSkipRedaction = Predicate.isUndefined(config.redactionFn);
  if (shouldSkipRedaction) {
```

Good:

```ts
  const shouldSkipRedaction = Predicate.isUndefined(config.redactionFn);

  if (shouldSkipRedaction) {
```