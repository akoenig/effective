# Effective

This repository contains several packages built for the [Effect](https://effect.website/) ecosystem.

## Overview

Effect is a powerful TypeScript library designed for building robust, maintainable enterprise-grade applications. This monorepo houses various packages that extend Effect's capabilities for different use cases.

## Packages

### Core Packages

| Package | Description | Status |
|---------|-------------|--------|
| [@akoenig/effect-http-recorder](./packages/http-recorder) | HTTP request recording and replay utilities for testing | ✅ Stable |
| @akoenig/effect-github | GitHub API SDK built with Effect | 🚧 In Development |

## Development

This monorepo uses [pnpm](https://pnpm.io/) as the package manager. To get started with development:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Versioning and Releases

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management and publishing:

```bash
# Add a changeset when making changes
pnpm changeset

# Check what will be released
pnpm changeset:status

# Bump versions and update changelogs
pnpm changeset:version

# Publish packages
pnpm changeset:publish
```

Each package in this monorepo is independently versioned and can be published separately. See the individual package READMEs for specific development instructions.

### CI/CD

This repository uses GitHub Actions for continuous integration and automated releases:

- **CI Workflow**: Runs tests, linting, type checking, and builds on every PR and push to main
- **Release Workflow**: Automatically creates release PRs and publishes packages when changesets are merged

See [`.github/SETUP.md`](./.github/SETUP.md) for repository configuration requirements.

## Contributing

Contributions are welcome! Please read the individual package documentation for specific contribution guidelines.

## License

All packages in this monorepo are licensed under the MIT License.