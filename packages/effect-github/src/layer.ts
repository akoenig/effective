import { Config, Layer, type Redacted } from 'effect'
// Infrastructure
import {
  GitHubAuthConfigService,
  GitHubAuthService,
  GitHubHttpClientConfigService,
  GitHubHttpClientService,
} from './Infrastructure/index.js'
// Services
import { GitHubIssues, GitHubNotifications, GitHubRepositories } from './Services/index.js'

/**
 * Complete GitHub SDK layer that provides all services except auth
 * (auth should be provided separately)
 */
export const GitHubSDKWithoutAuth = Layer.mergeAll(
  GitHubHttpClientConfigService.Default,
  GitHubHttpClientService.Default,
  GitHubIssues.Default,
  GitHubRepositories.Default,
  GitHubNotifications.Default,
)

/**
 * Complete GitHub SDK layer that provides all services
 */
export const GitHubSDK = Layer.mergeAll(
  GitHubHttpClientConfigService.Default,
  GitHubHttpClientService.Default,
  GitHubAuthService.Default,
  GitHubIssues.Default,
  GitHubRepositories.Default,
  GitHubNotifications.Default,
)

/**
 * GitHub SDK layer factory with custom configuration
 */
export const createGitHubSDK = () =>
  Layer.mergeAll(
    // For Effect.Service with sync, we can't override the config easily
    // So we'll just use the default config for now
    GitHubHttpClientConfigService.Default,
    GitHubHttpClientService.Default,
    GitHubAuthService.Default,
    GitHubIssues.Default,
    GitHubRepositories.Default,
    GitHubNotifications.Default,
  )

/**
 * GitHub SDK namespace with convenient layer creation functions
 */
export const GitHub = {
  /**
   * Creates a complete GitHub SDK layer with all dependencies resolved
   *
   * @example
   * ```typescript
   * const layer = GitHub.layer({
   *   token: Config.redacted("GITHUB_TOKEN")
   * });
   *
   * const program = Effect.provide(myProgram, layer);
   * ```
   */
  layer: (config: { token: Config.Config<Redacted.Redacted<string>> }) => {
    // Create token layer from config - keep token redacted
    const TokenLayer = Layer.effect(
      GitHubAuthConfigService,
      Config.map(config.token, (token) => ({
        type: 'token' as const,
        token: token,
      })),
    )

    // 1. Configuration layer - provides all config services
    const ConfigLayer = Layer.mergeAll(
      GitHubHttpClientConfigService.Default,
      TokenLayer,
    )

    // 2. Core services layer - provides auth and http client with their dependencies
    const CoreServicesLayer = Layer.mergeAll(
      Layer.provide(GitHubAuthService.Default, ConfigLayer),
      Layer.provide(GitHubHttpClientService.Default, ConfigLayer),
    )

    // 3. API services layer - provides GitHub API services with their dependencies
    const APIServicesLayer = Layer.mergeAll(
      Layer.provide(GitHubIssues.Default, CoreServicesLayer),
      Layer.provide(GitHubRepositories.Default, CoreServicesLayer),
      Layer.provide(GitHubNotifications.Default, CoreServicesLayer),
    )

    // 4. Final layer that provides everything
    return Layer.mergeAll(ConfigLayer, CoreServicesLayer, APIServicesLayer)
  },
}
