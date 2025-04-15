# Documentation Guidelines

This document outlines the guidelines for documentation in the Digital Twin Lab project.

## Documentation Files

- Documentation should be stored in the `docs/` directory as markdown (`.md`) files
- Documentation should be frequently updated to reflect the current state of the project
- Documentation should be regularly reviewed to ensure it's up to date
- Remove outdated or redundant documentation to prevent confusion

## Code Documentation

Use minimum viable documentation that allows a junior engineer to understand the code:

### Do's:

- Document function purpose and parameters at the top of functions
- Document the purpose of modules at the top of files
- Explain complex algorithms or non-obvious logic
- Document API endpoints with example requests/responses

### Don'ts:

- Add excessive documentation for simple, self-explanatory code
- Include generic comments like "This is the user model" or "Function goes here"
- Document obvious parameters or return values
- Write long documentation strings that could become outdated quickly

## API Documentation

The API documentation should:

- List all available endpoints
- Specify request parameters and their types
- Show example request bodies and responses
- Explain authentication requirements
- Describe error cases and status codes

## Database Documentation

The database schema should be documented with:

- Table structures and relationships
- Field types and constraints
- Indexing strategies
- Example queries for common operations

## Frontend Documentation

Frontend code should document:

- Component purposes and hierarchies
- State management
- User interaction patterns
- Data fetching and rendering strategies

## Markdown Format

Use consistent markdown formatting:

- Use `#` for top-level headings
- Use `##` for section headings
- Use `###` for subsection headings
- Use code blocks with language specification for code examples
- Use bullet points for lists
- Use tables for structured data 