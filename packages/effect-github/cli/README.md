# GitHub SDK Development CLI

This directory contains the internal development CLI for the GitHub SDK package, built with `@effect/cli` and `@effect/platform`. The CLI follows Effect's principles by using platform-agnostic abstractions instead of Node.js built-ins, making it type-safe, composable, and testable.

## Architecture

The CLI is built following Effect's principles:

- **Platform Agnostic**: Uses `@effect/platform` abstractions instead of Node.js built-ins
- **Type Safe**: All operations are properly typed with Effect's type system
- **Composable**: Commands are built using Effect's composable patterns
- **Error Handled**: Proper error handling with Effect's error management
- **Testable**: All operations can be mocked and tested using Effect's testing utilities

### Key Effect Modules Used

- `@effect/cli` - Command-line interface framework
- `@effect/platform/Command` - Process execution
- `@effect/platform/FileSystem` - File system operations
- `@effect/platform-node` - Node.js runtime integration

## Installation

Make sure you have the required dependencies installed:

```bash
pnpm install
```

## Usage

The CLI can be accessed through the main entry point or through npm scripts:

```bash
# Direct usage
pnpm cli --help

# Or using specific scripts
pnpm cli:record --help
pnpm cli:clean --help
pnpm cli:test --help
```

## Available Commands

### Record Command

Generates HTTP recordings for all GitHub SDK service methods using the `@akoenig/effect-http-recorder` package.

```bash
# Basic usage - record all services
pnpm cli:record --token=your-github-token

# Record specific services only
pnpm cli record --token=your-github-token --services=repositories
pnpm cli record -t your-token -s notifications -s repositories

# Clean recordings before recording
pnpm cli:record --token=your-github-token --clean

# View help
pnpm cli record --help
```

**Options:**
- `--token, -t` (required): GitHub personal access token
- `--services, -s` (optional): Services to record. Can be specified multiple times. Options: `notifications`, `repositories`. Default: all services
- `--clean, -c` (optional): Clean the recordings directory before recording. Default: false

### Clean Command

Removes build artifacts, recordings, and dependencies.

```bash
# Clean build artifacts (default)
pnpm cli:clean

# Clean everything
pnpm cli clean --all

# Clean specific items
pnpm cli clean --build --recordings
pnpm cli clean -b -r

# Clean node_modules
pnpm cli clean --node-modules
```

**Options:**
- `--all, -a`: Clean everything (build, recordings, node_modules)
- `--build, -b`: Clean build artifacts (dist, .tsbuildinfo)
- `--recordings, -r`: Clean recordings directory
- `--node-modules, -n`: Clean node_modules directory

### Test Command

Runs tests with recorded or live API responses.

```bash
# Run tests in replay mode (default - uses recordings)
pnpm cli:test

# Run tests in record mode (makes real API calls)
pnpm cli:test:record --token=your-github-token

# Explicit mode specification
pnpm cli test --mode=replay
pnpm cli test --mode=record --token=your-token
```

**Options:**
- `--mode, -m`: Test mode (`record` or `replay`). Default: `replay`
- `--token, -t`: GitHub token (required for record mode)
- `--watch, -w`: Run tests in watch mode

## Prerequisites

### For Recording and Record Tests

You need a valid GitHub personal access token with appropriate permissions:
- `repo` scope (for repository access)
- `notifications` scope (for notification access)

### Security & Privacy

The recording system includes several security measures:

1. **Header Exclusion**: Sensitive headers are automatically excluded:
   - `authorization`
   - `x-github-token` 
   - `cookie`
   - `set-cookie`
   - `x-api-key`

2. **Response Redaction**: The script redacts sensitive data:
   - Email addresses are replaced with `redacted@example.com`
   - Private repository URLs are anonymized

3. **Safe Operations**: Only read operations are performed. State-modifying operations like `markAsRead` are skipped.

## What Gets Recorded

The record command captures HTTP interactions for the following service methods:

**NotificationsService:**
- `listForAuthenticatedUser` - Various parameter combinations
- `getThread` - Sample thread ID (expected to fail with 404)

**RepositoriesService:**
- `listForAuthenticatedUser` - Default and filtered
- `get` - Both existing and non-existent repositories  
- `listForUser` - Public user repositories
- `listForOrg` - Organization repositories

## Output

Recordings are saved to: `./recordings/github-sdk/`

Each recording is a JSON file containing:
- Request details (method, URL, headers, body)
- Response details (status, headers, body)
- Metadata (timestamp, transaction ID)

## Development Workflow

1. **Generate recordings** (one-time setup or when API changes):
   ```bash
   pnpm cli:record --token=your-token --clean
   ```

2. **Run tests in replay mode** (daily development):
   ```bash
   pnpm cli:test
   ```

3. **Clean up when needed**:
   ```bash
   pnpm cli:clean --all
   ```

## Troubleshooting

1. **Authentication Errors**: Ensure your GitHub token is valid and has the required scopes
2. **Rate Limiting**: If you hit rate limits, wait and try again later
3. **Missing Recordings**: Check the console output for failed recordings and investigate
4. **Test Failures**: Ensure recordings exist by running the record command first

## Extending the CLI

To add new commands:

1. Create a new file in `./commands/` (e.g., `./commands/new-command.ts`)
2. Export a command using `Command.make`
3. Import and add it to the subcommands in `./main.ts`
4. Add corresponding npm scripts in `package.json`

Example:

```typescript
// commands/example.ts
import { Command } from '@effect/cli'
import { Console, Effect } from 'effect'

export const exampleCommand = Command.make(
  'example',
  {},
  () => Console.log('Hello from example command!')
).pipe(
  Command.withDescription('An example command')
)
```