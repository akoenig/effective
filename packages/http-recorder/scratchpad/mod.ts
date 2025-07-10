import { HttpClient } from '@effect/platform'
import { NodeContext, NodeHttpClient } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { HttpRecorder, HttpReplayer } from '../dist/mod.js'

const _recorder = HttpRecorder.layer({
  path: './recordings',
})

const replayer = HttpReplayer.layer({
  path: './recordings',
})

const http = Layer.mergeAll(
  Layer.provideMerge(
    replayer,
    Layer.mergeAll(NodeHttpClient.layer, NodeContext.layer),
  ),
)

const program = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient
  const response = yield* http.get(
    'https://jsonplaceholder.typicode.com/posts/1',
  )

  const body = yield* response.json
  console.log(body)
}).pipe(Effect.provide(http))

Effect.runPromise(program)
