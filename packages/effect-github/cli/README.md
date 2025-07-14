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

Generates HTTP recordings for all GitHub SDK service methods using the `@akoenig/effect-http-recorder` package. The implementation uses a modular architecture with separate modules for redaction, service recorders, and recording orchestration.

```bash
# Basic usage - record all services with redaction (default)
pnpm cli:record --token=your-github-token

# Record specific services only
pnpm cli record --token=your-github-token --services=repositories
pnpm cli record -t your-token -s notifications -s repositories -s issues

# Clean recordings before recording
pnpm cli:record --token=your-github-token --clean

# Disable data redaction (exposes real data - use with caution!)
pnpm cli:record --token=your-github-token --no-redaction

# Combine options
pnpm cli record -t your-token -s issues -c -n

# View help
pnpm cli record --help
```

**Options:**
- `--token, -t` (required): GitHub personal access token
- `--services, -s` (optional): Select which service recorders to run. Can be specified multiple times. Options: `notifications`, `repositories`, `issues`. If omitted, all recorders will be active.
- `--clean, -c` (optional): Clean the recordings directory before recording. Default: `false`
- `--no-redaction, -n` (optional): Disable data redaction in recordings. Default: `false` (redaction enabled)

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

The recording system includes comprehensive security measures that can be controlled via CLI flags:

**Default Security (Redaction Enabled):**

1. **Header Exclusion**: Sensitive headers are automatically excluded from recordings:
   - `authorization`, `x-github-token`, `cookie`, `set-cookie`, `x-api-key`
   - Rate limiting headers, ETags, and other metadata headers

2. **Response Redaction**: Sensitive data is automatically redacted:
   - IDs replaced with placeholder values (`12345`, `redacted_id`)
   - Timestamps normalized to `2023-01-01T00:00:00Z`
   - Email addresses → `user@example.com`
   - Real usernames/organizations → `example-user`/`example-org`
   - Repository names → `example-user/example-repo`
   - URLs and templates sanitized
   - Personal information (names, locations, bios) anonymized

3. **Flexible Security Controls**:
   - **Default**: Full redaction for safe sharing and testing
   - **Opt-out**: Use `--no-redaction` to disable redaction when real data is needed for debugging
   - **Warning**: Clear console warnings when redaction is disabled

4. **Safe Operations**: All recorded operations are read-only. No state modifications are performed on your GitHub account.

## What Gets Recorded

The record command captures HTTP interactions for comprehensive test coverage across all GitHub SDK services:

**GitHubNotifications:**
- `listForAuthenticatedUser` - Default, paginated, filtered, and empty list scenarios
- `getThread` - Sample thread ID (expected 404 for error testing)
- `markAsRead`, `markAllAsRead`, `markThreadAsRead` - Expected failures for read-only testing

**GitHubRepositories:**
- `listForAuthenticatedUser` - Default, filtered by type/sort, pagination scenarios
- `get` - Both existing (`akoenig/effective`) and non-existent repositories for error testing
- `listForUser` - Public user repositories with various filters
- `listForOrg` - Organization repositories with sorting options

**GitHubIssues (NEW):**
- `listForRepository` - Default, closed issues, label filtering, error scenarios
- `get` - Specific issues and non-existent issues for 404 testing
- `create` - Test issue creation (uses `akoenig/effective` repository)
- `update` - Issue modifications on created test issues
- `listComments`, `createComment` - Comment operations
- `addLabels`, `removeLabel` - Label management
- All operations include comprehensive error testing

**Repository Used for Testing:**
- Primary: `akoenig/effective` (for actual operations)
- Error testing: Non-existent repositories and issues for 404/422 responses

## Output

Recordings are saved to: `./tests/recordings/`

Each recording is a JSON file containing:
- Request details (method, URL, headers, body)
- Response details (status, headers, body) 
- Metadata (timestamp, transaction ID)
- Redacted sensitive data (when redaction is enabled)

**Console Output:**
The CLI provides detailed feedback during recording:
```
🎬 GitHub SDK Recording Script
📁 Recordings will be saved to: ./tests/recordings
🔧 Setting up HTTP recording layer...
🔒 Data redaction enabled (use --no-redaction to disable)
🎯 Recording selected services: issues, repositories

📝 Recording IssuesService methods...
  → listForRepository (akoenig/effective)
  → get (issue #1)
  → create (test issue)
  ...

📊 Recording Summary:
✅ Successful recordings: 42
❌ Failed recordings: 3
```

## Development Workflow

1. **Generate recordings** (one-time setup or when API changes):
   ```bash
   # Record all services with redaction (safe for sharing)
   pnpm cli:record --token=your-token --clean
   
   # Record specific services only
   pnpm cli:record --token=your-token --services issues --clean
   
   # Record with real data for debugging (use caution!)
   pnpm cli:record --token=your-token --no-redaction --clean
   ```

2. **Run tests in replay mode** (daily development):
   ```bash
   pnpm cli:test
   ```

3. **Clean up when needed**:
   ```bash
   pnpm cli:clean --all
   ```

## Modular Architecture

The CLI has been refactored into a modular architecture for better maintainability:

```
cli/
├── commands/
│   └── record.ts           # Main command export (15 lines)
└── lib/
    ├── types.ts           # Shared TypeScript types
    ├── config.ts          # Configuration constants  
    ├── redaction.ts       # GitHub data redaction logic
    ├── recording-layer.ts # HTTP recording layer setup
    ├── recording-program.ts # Main program orchestration
    ├── cli.ts            # CLI command definition
    └── recorders/
        ├── mod.ts         # Barrel exports
        ├── notifications.ts # Notifications recording
        ├── repositories.ts  # Repositories recording  
        └── issues.ts       # Issues recording
```

**Benefits:**
- **Separation of Concerns**: Each module has a single responsibility
- **Maintainability**: Easy to find and modify specific functionality
- **Testability**: Individual modules can be tested in isolation
- **Reusability**: Components can be reused in other CLI commands

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