#!/usr/bin/env tsx
/**
 * GitHub SDK Development CLI
 *
 * Internal development tools for the GitHub SDK package
 */

import { Command } from '@effect/cli'
import { HttpClient } from '@effect/platform'
import { NodeContext, NodeHttpClient, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { buildCommand } from './commands/build.js'
import { cleanCommand } from './commands/clean.js'
// Import subcommands
import { recordCommand } from './commands/record.js'
import { testCommand } from './commands/test.js'

// Main CLI command
const main = Command.make('github-sdk-cli', {}, () =>
  Effect.log(
    'GitHub SDK Development CLI. Use --help to see available commands.',
  ),
).pipe(
  Command.withDescription('Internal development CLI for GitHub SDK'),
  Command.withSubcommands([buildCommand, recordCommand, cleanCommand, testCommand]),
)

// Run the CLI
const cli = Command.run(main, {
  name: 'GitHub SDK Dev CLI',
  version: '1.0.0',
})

NodeRuntime.runMain(
  cli(process.argv).pipe(
    Effect.provide(Layer.mergeAll(NodeContext.layer, NodeHttpClient.layer)),
  ),
)
