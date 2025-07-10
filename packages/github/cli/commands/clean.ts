/**
 * Clean command - removes build artifacts and recordings
 */

import { Command, Options } from '@effect/cli'
import { FileSystem } from '@effect/platform'
import { Console, Effect } from 'effect'

/**
 * Clean build artifacts
 */
const cleanBuild = Effect.gen(function* () {
  yield* Console.log('🧹 Cleaning build artifacts...')

  const fs = yield* FileSystem.FileSystem
  const pathsToClean = ['./dist', './.tsbuildinfo']

  for (const path of pathsToClean) {
    const exists = yield* fs.exists(path)
    if (exists) {
      yield* fs.remove(path, { recursive: true })
      yield* Console.log(`  ✅ Removed ${path}`)
    }
  }

  yield* Console.log('✨ Build artifacts cleaned')
})

/**
 * Clean recordings
 */
const cleanRecordings = Effect.gen(function* () {
  yield* Console.log('🧹 Cleaning recordings...')

  const fs = yield* FileSystem.FileSystem
  const recordingsPath = './recordings'

  const exists = yield* fs.exists(recordingsPath)
  if (exists) {
    yield* fs.remove(recordingsPath, { recursive: true })
    yield* Console.log(`  ✅ Removed ${recordingsPath}`)
  }

  yield* Console.log('✨ Recordings cleaned')
})

/**
 * Clean node_modules
 */
const cleanNodeModules = Effect.gen(function* () {
  yield* Console.log('🧹 Cleaning node_modules...')

  const fs = yield* FileSystem.FileSystem
  const nodeModulesPath = './node_modules'

  const exists = yield* fs.exists(nodeModulesPath)
  if (exists) {
    yield* fs.remove(nodeModulesPath, { recursive: true })
    yield* Console.log(`  ✅ Removed ${nodeModulesPath}`)
  }

  yield* Console.log('✨ node_modules cleaned')
})

// CLI Options
const all = Options.boolean('all').pipe(
  Options.withDescription('Clean everything (build, recordings, node_modules)'),
  Options.withAlias('a'),
  Options.withDefault(false),
)

const build = Options.boolean('build').pipe(
  Options.withDescription('Clean build artifacts'),
  Options.withAlias('b'),
  Options.withDefault(false),
)

const recordings = Options.boolean('recordings').pipe(
  Options.withDescription('Clean recordings'),
  Options.withAlias('r'),
  Options.withDefault(false),
)

const nodeModules = Options.boolean('node-modules').pipe(
  Options.withDescription('Clean node_modules'),
  Options.withAlias('n'),
  Options.withDefault(false),
)

export const cleanCommand = Command.make(
  'clean',
  { all, build, recordings, nodeModules },
  ({ all, build, recordings, nodeModules }) =>
    Effect.gen(function* () {
      // If no specific options are provided, clean build artifacts by default
      const shouldCleanBuild = all || build || (!recordings && !nodeModules)
      const shouldCleanRecordings = all || recordings
      const shouldCleanNodeModules = all || nodeModules

      if (shouldCleanBuild) {
        yield* cleanBuild
      }

      if (shouldCleanRecordings) {
        yield* cleanRecordings
      }

      if (shouldCleanNodeModules) {
        yield* cleanNodeModules
      }

      yield* Console.log('🎉 Cleaning complete!')
    }),
).pipe(
  Command.withDescription(
    'Clean build artifacts, recordings, and dependencies',
  ),
)
