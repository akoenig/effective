import { GitHub, RepositoriesService } from "@akoenig/effect-github";
import { createRecordingHttpClientLayer } from "@akoenig/effect-http-recorder";
import { HttpClient } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";

/**
 * Example: Using the GitHub SDK with recording capabilities
 */
const program = Effect.gen(function* () {
	// Example 1: List repositories for authenticated user
	const repos = yield* RepositoriesService;

	const repositories = yield* repos.listForAuthenticatedUser({
		type: "owner",
		sort: "updated",
		perPage: 5,
		page: 1,
	});

	console.log(`Found ${repositories.data.length} repositories:`);
	for (const repo of repositories.data) {
		console.log(`- ${repo.name} (${repo.language ?? "Unknown"})`);
	}

	// Example 2: Direct HTTP client usage with recording
	const client = yield* HttpClient.HttpClient;
	const response = yield* client.get("https://api.github.com/rate_limit");
	const rateLimit = yield* response.json;

	console.log("\nRate limit info:", rateLimit);
});

// Example with recording enabled
const withRecording = Effect.provide(
	program,
	Layer.provideMerge(
		GitHub.layer({
			token: Config.redacted("GITHUB_TOKEN"),
		}),
		Layer.provideMerge(
			createRecordingHttpClientLayer({
				path: "./recordings",
				mode: "record", // Change to "replay" to use recorded responses
				excludedHeaders: ["x-github-request-id"],
			}),
			NodeHttpClient.layer,
		),
	),
);

// Example without recording (uncomment to use)
// const withoutRecording = Effect.provide(
// 	program,
// 	Layer.provideMerge(
// 		GitHub.layer({
// 			token: Config.redacted("GITHUB_TOKEN"),
// 		}),
// 		NodeHttpClient.layer,
// 	),
// );

// Run with recording by default
// To run without recording, change to: Effect.runPromise(withoutRecording)
Effect.runPromise(withRecording).catch(console.error);
