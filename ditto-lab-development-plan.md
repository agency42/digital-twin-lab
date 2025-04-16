# Ditto Lab Development Plan: Simplification & V2 Preparation

## 1. Overview

Based on an analysis of Ditto Lab's current codebase and the Product Requirements Document (PRD), this plan outlines a comprehensive strategy to simplify our V1 implementation while preparing for V2 features. The plan focuses on reducing complexity, addressing technical debt, and creating a cleaner architecture that will support the conversational agent interface required for V2.

## 2. Current Codebase Analysis

### Key Issues

1. **Framework Mismatch**: React and Next.js are included in dependencies but not properly utilized. The frontend relies on vanilla JavaScript with direct DOM manipulation.

2. **Architectural Bloat**: The codebase contains multiple redundant modules with overlapping functionality.

3. **Backend Scalability Concerns**: Current database implementation will limit V2 growth.

4. **Security Gaps**: Lack of comprehensive JWT authentication and rate limiting.

5. **Tool-Calling Absence**: V2 requires tool-calling capabilities for self-modifying character JSON and post generation.

6. **Testing Coverage**: Limited test implementation despite Jest inclusion.

## 3. Simplification Strategy

### 3.1 Frontend Modernization

1. **Adopt React Fully**
   - Replace vanilla JS DOM manipulation with React components
   - Implement state management using React Context or Redux
   - Create modular, reusable UI components aligned with V2 conversational interface

2. **Remove Next.js**
   - Remove Next.js dependency as it's not being utilized
   - Simplify to a client-side React app with API calls to Express backend
   - Use Create React App or Vite for streamlined React setup

### 3.2 Backend Optimization

1. **Streamline API Endpoints**
   - Consolidate redundant routes in `routes/` directory
   - Standardize error handling and response formats
   - Implement middleware for common operations

2. **Database Improvements**
   - Migrate from SQLite to Supabase
   - Implement proper indexing and query optimization
   - Design database schema to support V2 scalability requirements

3. **Security Enhancements**
   - Implement JWT authentication
   - Add rate limiting for API endpoints
   - Fix Content Security Policy to remove `unsafe-inline`

### 3.3 Code Organization

1. **Module Consolidation**
   - Reduce the number of TypeScript modules by merging related functionality
   - Standardize interface patterns across modules
   - Remove duplicate code and utilities

2. **Clear Separation of Concerns**
   - Clearly separate UI components, application logic, and API calls
   - Implement proper model-view separation
   - Create dedicated service layer for AI interactions

## 4. Implementation Steps

### Step 1: Cleanup

1. **Dependency Audit**
   - Remove unused packages (especially Next.js)
   - Establish React frontend with proper project structure
   - Update to latest stable versions where appropriate

2. **Code Pruning**
   - Remove deprecated or unused routes, modules, and functions
   - Clean up commented-out code and TODOs
   - Standardize file and module organization

3. **Documentation Update**
   - Simplify to 4 essential documents: README, API Reference, Development Doc, and PRD
   - Create clear API documentation
   - Document the migration path from V1 to V2

### Step 2: Core Refactoring

1. **Frontend Modernization**
   - Implement React component structure
   - Convert DOM manipulation to React state-based rendering
   - Create shared UI component library

2. **Backend Optimization**
   - Consolidate API endpoints
   - Standardize authentication and error handling
   - Implement database optimizations with Supabase

3. **Testing Framework**
   - Implement Jest test suite
   - Add unit tests for core functionality
   - Create E2E tests for critical user flows

### Step 3: V2 Foundation

1. **Conversational Interface Prototype**
   - Develop chat-based UI aligned with V2 requirements
   - Implement streamed responses for chat module
   - Design flexible prompt construction system

2. **Tool-Calling Infrastructure**
   - Create tool-calling framework for self-modification
   - Implement secure validation for AI-generated tool calls
   - Build sandbox environment for testing AI tool usage

3. **Character Card Evolution**
   - Implement JSON schema validation
   - Create visual representation of character traits
   - Build foundation for personality trait modification

## 5. Technical Architecture Guidelines

### Frontend

- Single-page application with React
- Modular component architecture
- CSS-in-JS or styled-components for styling
- State management via Context API or Redux
- TypeScript for type safety

### Backend

- Express.js API layer
- Service-oriented architecture
- Unified error handling
- Rate limiting and authentication middleware
- Streaming support for chat interactions

### Database

- Supabase for data storage and authentication
- Clear schema documentation
- Type-safe database access layer

## 6. V2-Specific Considerations

### 6.1 Tool-Calling Framework

The foundation for V2's self-modifying AI requires a robust tool-calling system. The system should include:

- A registry of available tools with descriptions and parameter specifications
- Secure validation of tool call requests from AI
- Sandboxed execution environment to prevent unintended side effects
- Logging and monitoring of all tool executions
- Ability to add new tools without code changes

### 6.2 Character Card Evolution

V2 requires a more sophisticated character card structure including:

- Unique identifiers for each character
- Detailed personality traits with numerical values for visualization
- System prompt templates
- Example interactions for reference
- Content references to library items
- History tracking for evolution over time
- Version control for character modifications

### 6.3 Content Integration

V2 needs a more flexible content library that can include diverse media types:

- Text (articles, blog posts, emails, messages)
- Images (photos, graphics, charts)
- Web pages (scraped content, structured data)
- Social profiles (LinkedIn, Twitter, Instagram)
- Social posts (tweets, Instagram posts, Facebook updates)
- Dynamic tagging system for contextual retrieval
- Metadata for source attribution and timestamp information

## 7. Success Metrics

- Documentation simplified to 4 total docs: README, API Reference, Development Doc, PRD
- Complete elimination of vanilla JS frontend code
- Elimination of any unnecessary files
- Elimination of any unnecessary goals

## 8. Conclusion

This plan provides a roadmap for transforming the current Ditto Lab codebase into a streamlined, maintainable system that supports both V1 functionality and prepares for V2 features. By focusing on proper React usage with Express/Node backend, code organization, and architectural design, we can create a solid foundation for the conversational agent interface described in the PRD.

---

*Created for Ditto Lab by the development team*
