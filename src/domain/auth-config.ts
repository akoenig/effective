import { Schema } from 'effect';

/**
 * GitHub authentication configuration schema
 */
export const GitHubAuthConfigSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal('token'),
    token: Schema.Redacted(Schema.String),
  }),
  Schema.Struct({
    type: Schema.Literal('app'),
    appId: Schema.String,
    privateKey: Schema.String,
    installationId: Schema.optional(Schema.String),
  })
);

export type GitHubAuthConfig = Schema.Schema.Type<
  typeof GitHubAuthConfigSchema
>;