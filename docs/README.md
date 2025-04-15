# Digital Twin Lab Documentation

This directory contains the comprehensive documentation for the Digital Twin Lab project. Use this index to navigate to specific documentation topics.

## Core Documentation

- [API Reference](./api-reference.md) - Complete API documentation with endpoints and examples for integrating with the Digital Twin Lab
- [System Architecture](./system-architecture.md) - Comprehensive overview of the project's architecture, components, and data flows
- [Development Guide](./development-guide.md) - Developer onboarding, setup instructions, and development best practices
- [User Guide](./user-guide.md) - End-user instructions for using the Digital Twin Lab application

## Technical Details

- [Agent Data Structures](./agent-data-structures.md) - Definitions of data structures used for agents and prompts (NOTE: Likely outdated)
- [Database Schema](./database-schema.md) - Detailed database table structure and relationships

## Practical Guides

- [Documentation Guidelines](./documentation-guidelines.md) - Rules and best practices for maintaining project documentation
- [Curl Examples](./curl-examples.md) - Practical examples for interacting with the API using curl (NOTE: Likely outdated)

## External Links

- [README.md](../README.md) - Project introduction and general overview
- [CLAUDE.md](../CLAUDE.md) - Technical documentation specific to Claude implementation details
- [task-list.md](../task-list.md) - Current development tasks and priorities

## Deprecated Documentation

- `claude-integration.md` - Removed as service details are integrated elsewhere.
- `api-docs.md` → merged into `api-reference.md`
- `api-documentation.md` → merged into `api-reference.md`
- `architecture.md` → merged into `system-architecture.md`
- `dev-patterns.md` → merged into `development-guide.md`
- `project-structure.md` → parts moved to `system-architecture.md` and `development-guide.md`

## Database

The project uses SQLite for data storage. See the following files for database details:

- [database/schema.sql](../database/schema.sql) - Main database schema
- [database/prompt_templates.sql](../database/prompt_templates.sql) - SQL scripts for prompt templates

## Contributing

To update documentation:

1. Find the appropriate document in the `docs/` directory
2. Make your changes following the [Documentation Guidelines](./documentation-guidelines.md)
3. Ensure links between documents remain valid
4. Update this index if adding new documentation files 