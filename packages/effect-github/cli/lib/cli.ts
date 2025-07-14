/**
 * CLI command definition for the record command
 */

import { Command, Options } from '@effect/cli'
import { Option } from 'effect'
import { type RecordingConfig, recordProgram } from './recording-program.js'

// CLI Options
const token = Options.text('token').pipe(
  Options.withDescription('GitHub personal access token'),
  Options.withAlias('t'),
)

const services = Options.choice('services', [
  'notifications',
  'repositories',
  'issues',
]).pipe(
  Options.repeated,
  Options.withDescription(
    'Select which service recorders to run. Can be specified multiple times. If omitted, all recorders will be active.',
  ),
  Options.withAlias('s'),
  Options.optional,
)

const clean = Options.boolean('clean').pipe(
  Options.withDescription('Clean recordings directory before recording'),
  Options.withAlias('c'),
  Options.withDefault(false),
)

const noRedaction = Options.boolean('no-redaction').pipe(
  Options.withDescription(
    'Disable data redaction in recordings (default: redaction enabled)',
  ),
  Options.withAlias('n'),
  Options.withDefault(false),
)

/**
 * Record command definition
 */
export const recordCommand = Command.make(
  'record',
  { token, services, clean, noRedaction },
  ({ token, services, clean, noRedaction }) => {
    const config: RecordingConfig = {
      token,
      services: Option.getOrElse(services, () => [] as ReadonlyArray<string>),
      clean,
      redactionEnabled: !noRedaction,
    }
    return recordProgram(config)
  },
).pipe(
  Command.withDescription('Generate HTTP recordings for GitHub SDK services'),
)
