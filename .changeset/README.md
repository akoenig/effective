# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing.

## Workflow

### Adding Changes
When you make changes that should trigger a release:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages should be bumped
2. Choose the type of version bump (patch/minor/major)
3. Provide a summary of changes

### Checking Status
To see what will be released:

```bash
pnpm changeset:status
```

### Releasing
To bump versions and update changelogs:

```bash
pnpm changeset:version
```

To publish packages:

```bash
pnpm changeset:publish
```

## Package Structure
- `@akoenig/effect-github` - GitHub SDK for Effect
- `@akoenig/effect-http-recorder` - HTTP recording utilities
- `github-sdk-example` - Example usage (private, ignored in releases)

## Configuration
- Access: `public` - packages will be published publicly
- Base branch: `main`
- Internal dependencies: bump as `patch` when dependencies change
