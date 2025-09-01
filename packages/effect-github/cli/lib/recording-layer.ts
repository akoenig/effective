/**
 * Recording layer creation utilities
 */

import { HttpRecorder, HttpRecorderConfig } from '@akoenig/effect-http-recorder'
import { NodeContext } from '@effect/platform-node'
import { Config, Layer, Redacted } from 'effect'
import { GitHub } from '../../src/layer.js'
import { RECORDINGS_PATH } from './config.js'
import { createGitHubRedactionEffect } from './redaction.js'

/**
 * Create recording layer with optional security redactions
 */
export const createRecordingLayer = (
  token: string,
  redactionEnabled: boolean = true,
) => {
  const config = HttpRecorderConfig.make({
    path: RECORDINGS_PATH,
    excludedHeaders: redactionEnabled
      ? [
          'authorization',
          'x-github-token',
          'cookie',
          'set-cookie',
          'x-api-key',
          'x-ratelimit-remaining',
          'x-ratelimit-reset',
          'x-ratelimit-used',
          'etag',
          'last-modified',
          'server',
          'x-github-request-id',
          'x-github-media-type',
        ]
      : [],
    redaction: redactionEnabled ? createGitHubRedactionEffect : undefined,
  })

  const recorder = HttpRecorder.layer(config)

  const githubLayer = GitHub.layer({
    token: Config.succeed(Redacted.make(token)),
  })

  // The key insight: provide the recorder first so its HTTP client is used
  return Layer.provide(githubLayer, Layer.mergeAll(recorder, NodeContext.layer))
}
