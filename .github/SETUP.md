# GitHub Repository Setup

This document outlines the required repository configuration for the CI/CD workflows.

## Required Repository Secrets

Automated publishing requires the following repository secrets to be configured:

### NPM_TOKEN

The NPM token can be configured as follows:
1. Navigate to [npmjs.com](https://www.npmjs.com/) and log in
2. Access Tokens can be found in account settings
3. A new **Automation** token with **Publish** permissions should be created
4. The token value should be copied
5. In the GitHub repository, navigate to Settings > Secrets and variables > Actions
6. A new repository secret named `NPM_TOKEN` should be created with the token value

### GITHUB_TOKEN

This token is automatically provided by GitHub Actions and requires no manual configuration.

## Repository Permissions

The release workflow requires the following permissions:
- `contents: write` - To create releases and tags
- `pull-requests: write` - To create release PRs
- `issues: read` - To read issue information
- `id-token: write` - For npm provenance

These permissions are configured in the workflow file and require no manual setup.

## Package Access

The npm packages should be configured for public access:
- Packages will be published as public by default (configured in `.changeset/config.json`)
- The npm account should have permission to publish under the `@akoenig` scope

## Workflow Overview

### CI Workflow (`ci.yml`)
- Runs on every push to `main` and all pull requests
- Performs: type checking, linting, formatting, building, and testing
- Validates changesets on pull requests

### Release Workflow (`release.yml`)
- Runs on pushes to `main` branch
- Creates release pull requests when changesets are present
- Automatically publishes packages when release PRs are merged
- Generates changelogs and GitHub releases