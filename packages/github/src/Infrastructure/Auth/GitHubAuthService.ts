import { Context, Effect, Layer, Match, Redacted } from 'effect'
import type { AuthConfig } from '../../Domain/ValueObjects/AuthConfig.js'
import { AuthError } from '../../Domain/Errors/AuthError.js'

/**
 * GitHub authentication configuration service
 */
export class GitHubAuthConfigService extends Context.Tag('GitHubAuthConfig')<
  GitHubAuthConfigService,
  AuthConfig
>() {}

/**
 * GitHub authentication service that provides auth headers for API requests
 */
export class GitHubAuthService extends Effect.Service<GitHubAuthService>()(
  'GitHubAuth',
  {
    effect: Effect.gen(function* () {
      const config = yield* GitHubAuthConfigService

      const getAuthHeaders = (): Effect.Effect<
        Record<string, string>,
        AuthError
      > =>
        Match.value(config).pipe(
          Match.when({ type: 'token' }, (tokenConfig) => {
            if (!tokenConfig.token) {
              return Effect.fail(
                new AuthError({
                  message: 'GitHub token is required but not provided',
                  type: 'missing_token',
                }),
              )
            }

            return Effect.succeed({
              Authorization: `Bearer ${Redacted.value(tokenConfig.token)}`,
            })
          }),
          Match.when({ type: 'app' }, () =>
            // For GitHub App authentication, we would need to generate JWT tokens
            // For now, this is a simplified implementation
            Effect.fail(
              new AuthError({
                message: 'GitHub App authentication not yet implemented',
                type: 'app_not_implemented',
              }),
            ),
          ),
          Match.orElse(() =>
            Effect.fail(
              new AuthError({
                message: 'Invalid authentication configuration',
                type: 'invalid_config',
              }),
            ),
          ),
        )

      return {
        getAuthHeaders,
      }
    }),
  },
) {}

/**
 * Convenience layer factory for GitHub authentication
 */
export const GitHubAuth = {
  layer: (config: AuthConfig) =>
    Layer.mergeAll(
      Layer.succeed(GitHubAuthConfigService, config),
      GitHubAuthService.Default,
    ),
}
