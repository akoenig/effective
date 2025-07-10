GitHub RESTful API abstractions. The services within this directory are the services that the user of the lobrary will use.

## Tests

- Use `@effect/vitest`
- When testing the services within the directory, always use the `HttpReplayer` layer from `@akoenig/http-recorder` in order to use the recordings from `../../tests/recordings`