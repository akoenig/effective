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

Each package in this monorepo is independently versioned and can be published separately. See the individual package READMEs for specific development instructions.

## Contributing

Contributions are welcome! Please read the individual package documentation for specific contribution guidelines.

## License

All packages in this monorepo are licensed under the MIT License.