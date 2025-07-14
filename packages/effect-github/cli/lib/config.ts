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
    number: 1,
    title: 'Test Issue from Effect SDK',
    body: 'This is a test issue created by the Effect GitHub SDK HTTP recorder for testing purposes.',
    labels: ['bug', 'documentation', 'help wanted'],
  } as {
    number: number
    title: string
    body: string
    labels: string[]
  },
} as const
