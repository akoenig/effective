/**
 * Main recording program logic
 */

import { FileSystem } from '@effect/platform'
import { Console, Effect } from 'effect'
import { RECORDINGS_PATH } from './config.js'
import { createRecordingLayer } from './recording-layer.js'
import {
  recordIssuesMethods,
  recordNotificationsMethods,
  recordRepositoriesMethods,
} from './recorders/mod.js'
import type { RecordingResult } from './types.js'

/**
 * Configuration for the recording program
 */
export interface RecordingConfig {
  token: string
  services: ReadonlyArray<string>
  clean: boolean
  redactionEnabled: boolean
}

/**
 * Clean recordings directory
 */
const cleanRecordings = Effect.gen(function* () {
  yield* Console.log(`🧹 Cleaning recordings directory: ${RECORDINGS_PATH}`)

  const fs = yield* FileSystem.FileSystem

  const exists = yield* fs.exists(RECORDINGS_PATH)
  if (exists) {
    yield* fs.remove(RECORDINGS_PATH, { recursive: true })
  }
  yield* fs.makeDirectory(RECORDINGS_PATH, { recursive: true })

  yield* Console.log('✅ Recordings directory cleaned')
})

/**
 * Main recording program
 */
export const recordProgram = (config: RecordingConfig) =>
  Effect.gen(function* () {
    yield* Console.log('🎬 GitHub SDK Recording Script')
    yield* Console.log(`📁 Recordings will be saved to: ${RECORDINGS_PATH}`)

    // Ensure recordings directory exists
    const fs = yield* FileSystem.FileSystem
    const recordingsExists = yield* fs.exists(RECORDINGS_PATH)
    if (!recordingsExists) {
      yield* fs.makeDirectory(RECORDINGS_PATH, { recursive: true })
      yield* Console.log(`📁 Created recordings directory: ${RECORDINGS_PATH}`)
    }

    // Clean if requested
    if (config.clean) {
      yield* cleanRecordings
    }

    // Create recording layer with the provided token
    yield* Console.log('🔧 Setting up HTTP recording layer...')
    if (config.redactionEnabled) {
      yield* Console.log('🔒 Data redaction enabled (use --no-redaction to disable)')
    } else {
      yield* Console.log('⚠️  Data redaction disabled - recordings will contain real data!')
    }
    const layer = createRecordingLayer(config.token, config.redactionEnabled)

    // Filter services to record
    const shouldRecordNotifications =
      config.services.length === 0 || config.services.includes('notifications')
    const shouldRecordRepositories =
      config.services.length === 0 || config.services.includes('repositories')
    const shouldRecordIssues =
      config.services.length === 0 || config.services.includes('issues')

    // Show which recorders are active
    const activeRecorders: string[] = []
    if (shouldRecordNotifications) activeRecorders.push('notifications')
    if (shouldRecordRepositories) activeRecorders.push('repositories')
    if (shouldRecordIssues) activeRecorders.push('issues')
    
    if (config.services.length === 0) {
      yield* Console.log('🎯 Recording all services (default)')
    } else {
      yield* Console.log(`🎯 Recording selected services: ${activeRecorders.join(', ')}`)
    }

    const allResults: RecordingResult[] = []

    // Record services
    if (shouldRecordNotifications) {
      const notificationResults = yield* recordNotificationsMethods.pipe(
        Effect.provide(layer),
      )
      allResults.push(...notificationResults)
    }

    if (shouldRecordRepositories) {
      const repositoryResults = yield* recordRepositoriesMethods.pipe(
        Effect.provide(layer),
      )
      allResults.push(...repositoryResults)
    }

    if (shouldRecordIssues) {
      const issuesResults = yield* recordIssuesMethods.pipe(
        Effect.provide(layer),
      )
      allResults.push(...issuesResults)
    }

    // Generate summary
    yield* generateRecordingSummary(allResults, fs)
  })

/**
 * Generate recording summary and verify recordings were created
 */
const generateRecordingSummary = (
  allResults: RecordingResult[],
  fs: FileSystem.FileSystem,
) =>
  Effect.gen(function* () {
    // Summary
    yield* Console.log('\n📊 Recording Summary:')
    yield* Console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const successful = allResults.filter((r) => r.status === 'success').length
    const failed = allResults.filter((r) => r.status.includes('failed')).length

    yield* Console.log(`✅ Successful recordings: ${successful}`)
    yield* Console.log(`❌ Failed recordings: ${failed}`)

    yield* Console.log('\nDetailed results:')
    for (const result of allResults) {
      const icon = result.status === 'success' ? '✅' : '❌'
      yield* Console.log(
        `  ${icon} ${result.method}(${result.params}): ${result.status}`,
      )
      if (result.error) {
        yield* Console.log(`    └─ Error: ${result.error}`)
      }
    }

    yield* Console.log('\n✨ Recording generation complete!')
    yield* Console.log(`📁 Check the recordings in: ${RECORDINGS_PATH}`)

    // Verify recordings were created
    const recordingFiles = yield* fs
      .readDirectory(RECORDINGS_PATH)
      .pipe(Effect.catchAll(() => Effect.succeed([])))

    if (recordingFiles.length > 0) {
      yield* Console.log(`📄 Found ${recordingFiles.length} recording file(s):`)
      for (const file of recordingFiles.slice(0, 5)) {
        // Show first 5 files
        yield* Console.log(`  - ${file}`)
      }
      if (recordingFiles.length > 5) {
        yield* Console.log(`  ... and ${recordingFiles.length - 5} more`)
      }
    } else {
      yield* Console.log(
        '⚠️  No recording files were created. Check the layer configuration.',
      )
    }
  })