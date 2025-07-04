# Effect Packages Monorepo

This repository contains several packages built for the [Effect](https://effect.website/) ecosystem, providing powerful tools and utilities for functional programming in TypeScript.

## Overview

Effect is a powerful TypeScript library for building robust, maintainable applications with functional programming patterns. This monorepo houses various packages that extend Effect's capabilities for different use cases.

## Packages

### Core Packages

| Package | Description | Status |
|---------|-------------|--------|
| [@effect/http-recorder](./packages/http-recorder) | HTTP request recording and replay utilities for testing | ✅ Stable |
| @effect/github | GitHub API SDK built with Effect | 🚧 In Development |

### Examples

- [`github-sdk-example`](./examples/github-sdk-example) - Example usage of the GitHub SDK

## Getting Started

This monorepo uses [pnpm](https://pnpm.io/) as the package manager. To get started:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development

Each package in this monorepo is independently versioned and can be published separately. See the individual package READMEs for specific development instructions.

## Contributing

Contributions are welcome! Please read the individual package documentation for specific contribution guidelines.

## License

See individual package licenses for details.