/**
 * Configuration for recording operations
 */

import type { TestData } from './types.js'

export const RECORDINGS_PATH = './tests/recordings'

export const TEST_DATA: TestData = {
  repository: {
    owner: 'akoenig',
    name: 'effective',
  },
  user: {
    username: 'gcanti',
  },
  organization: {
    name: 'effect-ts',
  },
  issue: {
    // Test issue data for recording
    number: 1, // Will be replaced with actual issue number during recording
    title: 'Test Issue from Effect SDK Recorder',
    body: 'This is a test issue created by the Effect GitHub SDK HTTP recorder for testing purposes.',
    labels: ['documentation', 'help wanted'],
  } as {
    number: number
    title: string
    body: string
    labels: string[]
  },
} as const