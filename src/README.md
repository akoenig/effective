# Effect-based GitHub SDK

A type-safe, Effect-based GitHub SDK that provides structured access to GitHub's REST API using Effect.js primitives.

## Features

- **Type Safety**: Full TypeScript support with Effect Schema validation
- **Effect Integration**: Built using Effect's service pattern and HTTP client
- **Composable Architecture**: Modular services that can be composed and extended
- **Error Handling**: Structured error handling using Effect's error types
- **Authentication**: Support for personal access tokens (GitHub App auth coming soon)
- **HTTP Client**: Leverages `@effect/platform` HTTP client with proper GitHub API conventions

## Architecture

The SDK is built using Effect's service pattern with the following components:

### Core Services

- **GitHubHttpClientService**: HTTP client wrapper with GitHub API conventions
- **GitHubAuthService**: Authentication service for API requests
- **RepositoriesService**: Repository-related API endpoints
- **NotificationsService**: Notification-related API endpoints

### Schemas

All API responses are validated using Effect Schema:

- **GitHubRepository**: Repository data structure
- **GitHubNotification**: Notification data structure
- **GitHubUser**: User data structure

## Usage

### Basic Setup

```typescript
import { Effect, Layer } from 'effect';
import { 
  RepositoriesService,
  NotificationsService,
  GitHubAuth,
  GitHubSDK,
} from './src/sdks/github/index.js';

const program = Effect.gen(function* () {
  // Get repositories service
  const reposService = yield* RepositoriesService;
  
  // List repositories for authenticated user
  const repositories = yield* reposService.listForAuthenticatedUser({
    type: 'owner',
    sort: 'updated',
    per_page: 10,
  });

  console.log(`Found ${repositories.data.length} repositories:`);
  for (const repo of repositories.data) {
    console.log(`- ${repo.fullName} (${repo.language ?? 'Unknown'})`);
  }

  return repositories;
}).pipe(
  Effect.provide(
    GitHubSDK.pipe(
      Layer.provide(
        GitHubAuth.layer({
          type: 'token',
          token: 'your_github_token_here',
        })
      )
    )
  )
);

Effect.runPromise(program);
```

### Repositories Service

```typescript
const reposService = yield* RepositoriesService;

// List repositories for authenticated user
const myRepos = yield* reposService.listForAuthenticatedUser({
  type: 'owner',
  sort: 'updated',
  per_page: 50,
});

// Get a specific repository
const repo = yield* reposService.get('owner', 'repo-name');

// List repositories for a user
const userRepos = yield* reposService.listForUser('username');

// List repositories for an organization
const orgRepos = yield* reposService.listForOrg('organization');
```

### Notifications Service

```typescript
const notificationsService = yield* NotificationsService;

// List notifications for authenticated user
const notifications = yield* notificationsService.listForAuthenticatedUser({
  participating: true,
  per_page: 20,
});

// Mark notification as read
yield* notificationsService.markAsRead('notification-id');

// Mark all notifications as read
yield* notificationsService.markAllAsRead();

// Get notification thread
const thread = yield* notificationsService.getThread('thread-id');
```

## Authentication

Currently supports Personal Access Tokens:

```typescript
GitHubAuth.layer({
  type: 'token',
  token: 'your_github_token_here',
})
```

GitHub App authentication is planned for future releases.

## Configuration

You can customize the HTTP client configuration:

```typescript
import { createGitHubSDK } from './src/sdks/github/index.js';

const customSDK = createGitHubSDK({
  baseUrl: 'https://api.github.com',
  userAgent: 'my-custom-app/1.0.0',
});
```

## Type Safety

All API responses are validated using Effect Schema:

```typescript
const repository = yield* reposService.get('owner', 'repo');

// TypeScript knows the exact shape of the repository object
console.log(repository.fullName);      // string
console.log(repository.stargazersCount); // number
console.log(repository.language);     // string | null
```

## Error Handling

The SDK provides structured error handling:

```typescript
const program = Effect.gen(function* () {
  const reposService = yield* RepositoriesService;
  return yield* reposService.get('owner', 'nonexistent-repo');
}).pipe(
  Effect.catchAll((error) => {
    console.error('GitHub API error:', error.message);
    return Effect.succeed(null);
  })
);
```

## Extending the SDK

Adding new services follows the same pattern:

```typescript
export class IssuesService extends Context.Tag('IssuesService')<
  IssuesService,
  {
    readonly list: (owner: string, repo: string) => Effect.Effect<Issue[], Error>;
  }
>() {
  static readonly Default = Layer.effect(
    this,
    Effect.gen(function* () {
      const httpClient = yield* GitHubHttpClientService;
      const auth = yield* GitHubAuthService;

      const list = (owner: string, repo: string) =>
        Effect.gen(function* () {
          const authHeaders = yield* auth.getAuthHeaders();
          return yield* httpClient.get(`/repos/${owner}/${repo}/issues`, {
            headers: authHeaders,
          });
        });

      return { list };
    })
  );
}
```

## Development

The SDK leverages Effect's powerful composition model, making it easy to:

- Add new endpoints
- Compose services
- Handle errors consistently
- Test individual components
- Add middleware and transformations

## Future Enhancements

- GitHub App authentication
- Webhook handling
- GraphQL API support
- Rate limiting and retry logic
- Caching layer
- Streaming responses for large datasets