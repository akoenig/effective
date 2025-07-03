import { NodeHttpClient } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";
import { GitHub, RepositoriesService } from "../src/index.js";

/**
 * GitHub SDK usage example using the refactored Effect.Service architecture.
 */
const program = Effect.gen(function* () {
	// Example: List repositories for authenticated user
	const reposService = yield* RepositoriesService;

	const repositories = yield* reposService.listForAuthenticatedUser({
		type: "owner",
		sort: "updated",
		perPage: 1,
		page: 1,
	});

	console.log(`Found ${repositories.data.length} repositories:`);
	// Note: These properties need to be accessed from the actual response data
	// which would be typed according to our schemas
	for (const repo of repositories.data) {
		console.log(`- ${repo.name} (${repo.language ?? "Unknown"})`);
	}
});

// Single Effect.provide call
const runnable = Effect.provide(
	program,
	Layer.provideMerge(
		GitHub.layer({
			token: Config.redacted("GITHUB_TOKEN"),
		}),
		NodeHttpClient.layer,
	),
);

Effect.runPromise(runnable).then(console.log).catch(console.error);
