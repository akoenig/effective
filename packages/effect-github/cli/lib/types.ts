/**
 * Shared types for recording modules
 */

/**
 * Result of a recording operation
 */
export interface RecordingResult {
  method: string
  params: string
  status: string
  error: string | null
}

/**
 * Test data configuration for recording operations
 */
export interface TestData {
  readonly repository: {
    readonly owner: string
    readonly name: string
  }
  readonly user: {
    readonly username: string
  }
  readonly organization: {
    readonly name: string
  }
  readonly issue: {
    number: number
    readonly title: string
    readonly body: string
    readonly labels: readonly string[]
  }
}