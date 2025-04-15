# System Architecture

This document outlines the overall architecture of the Digital Twin Lab system, including its components, data flows, technical decisions, and deployment considerations.

> **Note:** This document consolidates the information previously found in `architecture.md` and parts of `project-structure.md` for a complete architectural reference.

## Project Vision

Digital Twin Lab is designed as a **prompt engineering playground** for creating and evaluating AI-powered digital twins that can:

1. Generate comprehensive system prompts from diverse content sources (websites, social media, text)
2. Make all prompts transparent and editable through the frontend interface
3. Generate platform-appropriate content that maintains the authentic voice of the user
4. Store all templates and prompts in the database rather than hardcoded in the backend
5. Continuously improve through feedback loops incorporating user assessments
6. Provide advanced tools for comparing human and AI-generated responses

## Overview

Digital Twin Lab is a Next.js application that creates personalized digital twins based on user content from various platforms. The system uses Claude AI to analyze content, generate character cards, and power interactive conversations.

## Architecture Diagram

```
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│               │        │               │        │               │
│  Next.js      │◄─────►│  API Routes    │◄─────►│  Database      │
│  Frontend     │        │  (Server)     │        │  (SQLite)     │
│               │        │               │        │               │
└───────────────┘        └───────┬───────┘        └───────────────┘
                                 │
                                 ▼
                         ┌───────────────┐        ┌───────────────┐
                         │               │        │               │
                         │  Services     │◄─────►│  Claude API    │
                         │               │        │  (Anthropic)  │
                         │               │        │               │
                         └───────────────┘        └───────────────┘
```

## Components

### Frontend Layer

Built with Next.js and React, the frontend provides:

- User authentication and profile management
- File upload interface for content ingestion
- Digital twin character card display
- Interactive chat interface
- Content generation tools

Key technologies:
- React for UI components
- TailwindCSS for styling
- Next.js App Router for routing and page structure
- React Context for state management

### API Layer

Server-side API routes that handle:

- User authentication and session management
- File upload and content processing
- Character card generation
- Content generation
- Conversation management

### Service Layer

Core business logic implemented as service modules:

- `userService`: User management operations
- `assetProcessor`: File processing and storage
- `claudeService`: Interaction with Claude AI
- `characterCardService`: Character card generation and management
- `contentGenerationService`: Generated content creation and storage

### Database Layer

SQLite database with tables for:

- Users
- Assets (uploaded content)
- Character Cards
- Generated Content
- Conversations and Messages

### External Services

- Claude AI (Anthropic): Powers content analysis, character generation, and conversation functionality

## Data Flow

1. **Content Ingestion**:
   - User uploads content (tweets, LinkedIn posts, etc.)
   - Files are saved to disk and metadata is stored in the database
   - Content is processed and stored in a structured format

2. **Character Card Generation**:
   - Uploaded content is analyzed by Claude
   - Character traits, voice, and style are extracted
   - A character card is generated and stored in the database

3. **Content Generation**:
   - User requests content generation for a specific platform
   - The system retrieves the character card
   - Claude generates appropriate content based on the character card
   - Generated content is stored and presented to the user

4. **Interactive Conversations**:
   - User initiates a conversation with their digital twin
   - Messages are sent to Claude with the character card as context
   - Claude responds in the voice and style of the digital twin
   - Conversation history is stored in the database

## Detailed Directory Structure

```
├── .cursor/                        # Cursor editor configuration
│   └── rules/                      # Cursor rules for documentation
├── data/                           # User and application data
│   ├── assets/                     # User-uploaded files
│   ├── character_card_template.json # Template for character card generation
│   ├── scrape_result.json          # Results from website scraping
│   └── scrape_status.json          # Status of scrape operations
├── database/                       # SQLite database files
│   ├── digital_twin_lab.db         # Main SQLite database
│   ├── schema.sql                  # Database schema definition
│   └── prompt_templates.sql        # SQL script to add system prompt templates
├── dist/                           # Compiled output for production
│   ├── database/                   # Copied database schema
│   ├── public/                     # Copied static assets for production
│   └── server/                     # Compiled server code
├── docs/                           # Project documentation
├── public/                         # Frontend static files
│   ├── css/                        # CSS stylesheets
│   ├── img/                        # Image assets
│   ├── js/                         # Compiled JavaScript (output only)
│   └── index.html                  # Main HTML page
├── scripts/                        # Utility scripts
│   ├── clean-js.sh                 # Script to clean compiled JS files
│   ├── migrate_prompts.js          # User data migration for prompt system
│   ├── reset.js                    # Database reset script
│   └── setup-directories.sh        # Directory structure setup script
├── src/                            # Source code
│   ├── client/                     # Frontend source code
│   │   └── ts/                     # TypeScript source
│   │       ├── modules/            # Frontend modules
│   │       ├── app.ts              # Main application entry point
│   │       ├── types.ts            # TypeScript type definitions
│   │       └── utils.ts            # Shared utilities
│   └── server/                     # Backend source code
│       ├── api/                    # API client implementations
│       ├── lib/                    # Utility libraries
│       ├── routes/                 # Express route handlers
│       └── services/               # Business logic services
├── tests/                          # Test files and test data
└── uploads/                        # User uploaded content (not in repository)
```

## Key Frontend Modules

- **userModule.ts**: User management UI
- **contentModule.ts**: Content/asset management UI
- **promptModule.ts**: Character card generation and viewing UI
- **chatModule.ts**: Chat interface with generated digital twins
- **assessmentModule.ts**: Personality assessment features
- **navigationModule.ts**: Navigation between application features
- **contentMediumModule.ts**: Content medium instructions for different platforms

## Deployment Model

The application is deployed as a standalone Next.js application that includes both the frontend and backend components. The SQLite database is stored in the local filesystem.

## Security Considerations

- Authentication is handled through secure sessions
- File uploads are validated and sanitized
- API endpoints are protected with appropriate authentication checks
- Sensitive credentials (like the Claude API key) are stored in environment variables
- Content is isolated by user ID to prevent unauthorized access

## Performance Considerations

- Asynchronous processing for file uploads and character card generation
- Caching of character cards and frequently accessed data
- Pagination for API responses with large datasets
- Efficient prompt design to minimize token usage with Claude

## Future Architecture Considerations

- Migration to a more scalable database like PostgreSQL for multi-user deployments
- Separating the backend into microservices for improved scalability
- Adding a message queue for handling asynchronous processing
- Implementing real-time features with WebSockets 