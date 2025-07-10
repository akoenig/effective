/**
 * Test command - runs the test suite
 */

import { Command as CliCommand } from '@effect/cli'
import { Command } from '@effect/platform'
import { Console, Effect } from 'effect'

/**
 * Run the test suite using vitest
 */
const runTests = Effect.gen(function* () {
  yield* Console.log('🧪 Running test suite...')
  
  const command = Command.make('vitest', 'run').pipe(
    Command.stdout('inherit'),
    Command.stderr('inherit')
  )
  
  const exitCode = yield* Command.exitCode(command)
  
  if (exitCode === 0) {
    yield* Console.log('✅ Tests completed successfully')
  } else {
    yield* Effect.fail(new Error(`Tests failed with exit code ${exitCode}`))
  }
})

export const testCommand = CliCommand.make(
  'test',
  {},
  () => runTests
).pipe(
  CliCommand.withDescription('Run the test suite')
)