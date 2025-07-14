/**
 * Record command - generates HTTP recordings for all GitHub SDK service methods
 *
 * This command exercises each method in the GitHub SDK services while
 * the http-recorder captures the HTTP interactions for later replay.
 *
 * The implementation has been refactored into modular components:
 * - lib/redaction.ts - GitHub-specific data redaction logic
 * - lib/recorders/ - Service-specific recording methods
 * - lib/recording-layer.ts - Recording layer creation
 * - lib/recording-program.ts - Main recording program logic
 * - lib/cli.ts - CLI command definition
 */

export { recordCommand } from '../lib/cli.js'