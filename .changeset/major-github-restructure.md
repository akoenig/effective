---
"@akoenig/effect-github": major
---

Restructure GitHub SDK to follow Domain-Driven Design (DDD) architecture

BREAKING CHANGES:
- Reorganized domain models into separate files with DDD structure:
  - `Domain/Entities/` - Core business entities (Repository, User, Notification, etc.)
  - `Domain/ValueObjects/` - Value objects (AuthConfig, ListResponse, etc.)
  - `Domain/Errors/` - Domain-specific errors (AuthError, ApiError, etc.)
- Restructured infrastructure layer:
  - `Infrastructure/Auth/` - Authentication services
  - `Infrastructure/Http/` - HTTP client services
- Reorganized application services:
  - `Services/` - Application services (NotificationsService, RepositoriesService)
- Removed "GitHub" prefix from all domain model names for cleaner naming
- Updated all imports and exports to match new structure
- All domain models now comply with GitHub REST API v3 specification
- File naming convention changed to PascalCase

This restructure provides better separation of concerns, improved maintainability, and follows established DDD patterns. All existing functionality is preserved but requires import path updates and type name changes.