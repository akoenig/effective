import { Schema } from "effect";

/**
 * GitHub user schema with camelCase properties
 * Note: Some fields are optional as they may not be present in all API contexts
 * (e.g., repository owner vs. full user profile)
 */
export const GitHubUser = Schema.Struct({
	id: Schema.Number,
	login: Schema.String,
	avatarUrl: Schema.propertySignature(Schema.String).pipe(
		Schema.fromKey("avatar_url"),
	),
	htmlUrl: Schema.propertySignature(Schema.String).pipe(
		Schema.fromKey("html_url"),
	),
	type: Schema.String,
	name: Schema.optional(Schema.String),
	email: Schema.optional(Schema.String),
	bio: Schema.optional(Schema.String),
	location: Schema.optional(Schema.String),
	company: Schema.optional(Schema.String),
	blog: Schema.optional(Schema.String),
	twitterUsername: Schema.optional(Schema.String).pipe(
		Schema.fromKey("twitter_username"),
	),
	publicRepos: Schema.optional(Schema.Number).pipe(
		Schema.fromKey("public_repos"),
	),
	publicGists: Schema.optional(Schema.Number).pipe(
		Schema.fromKey("public_gists"),
	),
	followers: Schema.optional(Schema.Number),
	following: Schema.optional(Schema.Number),
	createdAt: Schema.optional(Schema.String).pipe(Schema.fromKey("created_at")),
	updatedAt: Schema.optional(Schema.String).pipe(Schema.fromKey("updated_at")),
});

export type GitHubUser = Schema.Schema.Type<typeof GitHubUser>;
