/**
 * Build command - builds the TypeScript project
 */

import { Command as CliCommand } from '@effect/cli'
import { Command } from '@effect/platform'
import { Console, Effect } from 'effect'

/**
 * Build the TypeScript project using tsc -b
 */
const runBuild = Effect.gen(function* () {
  yield* Console.log('🔨 Building TypeScript project...')

  const command = Command.make('tsc', '-b').pipe(
    Command.stdout('inherit'),
    Command.stderr('inherit'),
  )

  const exitCode = yield* Command.exitCode(command)

  if (exitCode === 0) {
    yield* Console.log('✅ Build completed successfully')
  } else {
    yield* Effect.fail(new Error(`Build failed with exit code ${exitCode}`))
  }
})

export const buildCommand = CliCommand.make('build', {}, () => runBuild).pipe(
  CliCommand.withDescription('Build the TypeScript project using tsc -b'),
)