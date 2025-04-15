# Digital Twin Lab - Technical Documentation & Roadmap

This document provides technical information specific to the Claude implementation in the Digital Twin Lab project. For comprehensive documentation, see the [docs directory](./docs/README.md).

## Claude Integration Overview

This document focuses on Claude-specific implementation details. For other documentation:

- [API Reference](./docs/api-reference.md) - Complete API documentation
- [System Architecture](./docs/system-architecture.md) - System design and components
- [Agent Data Structures](./docs/agent-data-structures.md) - Data structure definitions
- [Database Schema](./docs/database-schema.md) - Database tables and relationships
- [Documentation Guidelines](./docs/documentation-guidelines.md) - Guidelines for documentation
- [Development Guide](./docs/development-guide.md) - Development setup and processes

The remaining content of this document covers Claude-specific implementation details.

## Project Vision & Philosophy

The Digital Twin Lab is designed as a **true prompt engineering playground**. The core mission is to empower users to iteratively experiment with AI-powered personality simulation using fully transparent and customizable prompts. Key principles:

1.  **Transparency**: Every component of the prompt sent to the AI model (system message, user message, instructions, examples) must be visible and editable by the user through the frontend. There should be no hidden backend prompts.
2.  **Database-Driven**: All prompt templates, character cards, and user-specific customizations are stored in the database, making them persistent, manageable, and editable.
3.  **Modularity**: Prompt components (Character Card, Instructions, Examples, Main Goal) are treated as distinct but composable elements.
4.  **User Control**: Users have complete control over the generation process, from the base character definition to the specific instructions given for a task.
5.  **Clear Separation of Concerns**: Backend APIs should focus on database CRUD operations and Claude API interactions, while the frontend handles UI state and user interactions.

The ultimate goal is to provide a flexible and transparent environment for crafting, testing, and refining prompts that allow AI models to interact and generate content authentically representing the user's voice, style, and platform-specific nuances.

## Prompt Engineering Playground Features

Digital Twin Lab achieves its vision through these core features:

1.  **Complete Transparency**: No hidden prompts. What you see in the UI editors is what gets sent to the model (potentially combined with other visible components).
2.  **Iterative Experimentation**: Designed for users to make small changes to prompts and immediately see the impact on AI outputs.
3.  **Structured & Composable Prompts**: Uses distinct components that can be combined:
    *   **Character Card (JSON):** Defines core identity (traits, voice, background). Stored in `character_cards`.
    *   **System Prompt (Text):** Context-specific base system message (e.g., for Chat, Post), typically derived from the Character Card but editable. Stored in `system_prompts`.
    *   **Instruction Template (Text):** Context-specific task instructions (e.g., "Generate a tweet under 280 characters"). Stored in `instruction_templates`.
    *   **Examples:** Illustrative input/output pairs to guide the model, associated with instructions or contexts. (Storage TBD - likely within `instruction_sets` or `instruction_templates`).
    *   **Main Goal:** The primary user message defining the specific request for a generation task. Entered in the frontend.
4.  **Database-Driven Configuration**: All persistent prompt components (Character Cards, System Prompts, Instructions) are stored in the SQLite database.
5.  **Unified Interface**: Provides tools for content collection, character generation, prompt editing, interaction (chat/post), and evaluation within a single application.
6.  **Controlled Experimentation**: Allows testing different directives, instructions, and character attributes independently.

## API Architecture and Separation of Concerns

The Digital Twin Lab follows a clear separation of concerns in its API design:

### CRUD APIs (Database Operations):
1. **User Management**:
   - `GET /api/users` - List users
   - `POST /api/users` - Create new user
   - `GET /api/users/:userId` - Get specific user

2. **Asset Management**:
   - `GET /api/assets/:userId` - List user's assets
   - `POST /api/upload` - Upload file for a user
   - `GET /api/assets/:userId/:assetId/content` - Get asset content

3. **Character Card Management**:
   - `GET /api/prompts/:userId/current-character-card` - Get current character card
   - `POST /api/prompts/:userId/generate-character-card` - Generate new card (from assets)

4. **System Prompt Management**:
   - `GET /api/prompts/:userId/system-prompt/:type` - Get system prompt (chat or post)
   - `POST /api/prompts/:userId/system-prompt/:type` - Save system prompt
   - `DELETE /api/prompts/:userId/system-prompt/:type` - Reset to default

5. **Instruction Management**:
   - `GET /api/prompts/:userId/instructions/:type` - Get instructions (chat or post) 
   - `POST /api/prompts/:userId/instructions/:type` - Save instructions

### Claude Interaction APIs:
1. **Chat**:
   - `POST /api/chat/:userId/response` - Chat with digital twin (pulls system prompt and instructions from DB)
   
2. **Content Generation**:
   - `POST /api/chat/:userId/generate-content` - Generate content (pulls system prompt and instructions from DB)

The API structure avoids having LLM endpoints accept direct prompt inputs. Instead, the backend retrieves necessary prompts from the database based on the user ID.

For the complete API reference, see [API Reference](./docs/api-reference.md).

## Detailed Prompt Structure & Combination

Understanding how the prompt components are combined is crucial for effective use:

1.  **Character Card (`character_cards` table)**:
    *   The foundational JSON object defining the digital twin's personality, voice, etc.
    *   Generated based on user content and a *template* (see Template Management).
    *   Serves as the *default* System Prompt for various contexts.

2.  **System Prompt (`system_prompts` table)**:
    *   Stores the actual system message text used for a specific context (e.g., `type='chat'` or `type='post'`).
    *   Initially populated with the current Character Card data (`is_custom=0`).
    *   Users can edit this directly in the UI. Edits are saved to this table, setting `is_custom=1`.
    *   The "Reset" button reverts the text back to the current Character Card data (`is_custom=0`).

3.  **Instruction Template (`instruction_templates` table)**:
    *   Stores the specific instructions for a task within a context (e.g., the instructions for generating a 'post').
    *   Editable in the UI.

4.  **Examples**:
    *   Provide concrete examples to guide the AI.
    *   Currently handled via frontend input, but ideally stored associated with Instruction Templates or Sets.
    *   *Implementation Note:* Decide on database storage for examples.

5.  **Main Goal**:
    *   The specific, dynamic request from the user for a single generation (e.g., "Write a blog post about AI ethics").
    *   Entered directly in the frontend UI for generation tasks.

**How Components Combine for API Call:**

When generating content or chatting:

1. The backend retrieves the relevant components from the database:
   * System prompt for the appropriate context (chat/post)
   * Instruction template for the context

2. The frontend provides only the "main goal" or message content.

3. The backend constructs the complete prompt and calls Claude's API:
   * system = systemPrompt + instructionTemplate
   * user = mainGoal/message

This ensures the AI receives the full context while respecting the separation of concerns.

## Template Management

To maintain transparency and allow customization even for generation processes, key templates are stored in the database:

1.  **Storage**: Templates are stored in the `system_prompts` table with `user_id = 'system'`.
2.  **Types**:
    *   `character_card_template`: Defines the JSON *structure* for the Character Card. Used by the generation process and potentially editable via an admin UI.
    *   `character_card_generation`: The prompt *instructing* Claude on how to analyze content and fill the `character_card_template` structure. Also potentially editable.
3.  **Loading**: Services like `AbstractionApproach` load these templates from the database when needed (e.g., during character card generation). They fallback to file-based templates or defaults if database entries are missing.
4.  **Customization**: Storing these in the database allows future features where admins or even users (with permissions) could potentially edit the fundamental generation prompts themselves.

## Architecture Overview

The project uses a modular architecture:

### Backend Structure (`src/server/`)
- `server.ts`: Express server setup.
- **Routes (`routes/`)**: API endpoints (`promptRoutes.ts`, `chatRoutes.ts` etc.).
- **Services (`services/`)**: Business logic (`promptService.ts`, `abstractionApproach.ts`).
- **API Clients (`api/`)**: Simplified `claude.ts` for direct API communication (no prompt construction logic).
- **Utilities (`lib/`)**: Database connection (`database.ts`), helpers.

### Frontend Structure (`src/client/ts/` and `public/`)
- `index.html`: Main UI container.
- **TypeScript Modules (`src/client/ts/modules/`)**: Frontend logic (`promptModule.ts`, `contentMediumModule.ts` etc.).
- **Compiled JS (`public/js/`)**: Transpiled JavaScript.

### Digital Twin Representation (Database-Driven)
- All core prompt components (`character_cards`, `system_prompts`, `instruction_templates`) are stored in the SQLite database.
- System-level templates are in `system_prompts` with `user_id='system'`.

### Data Storage (SQLite Database)
- Key tables: `users`, `assets`, `character_cards`, `system_prompts`, `instruction_templates`. 
- See [Database Schema](./docs/database-schema.md) for the complete database structure.

## Core User Journey

1.  **Setup:** Create profile, connect accounts.
2.  **Content:** Upload/scrape content.
3.  **Character Card Generation:** Select content, generate base Character Card (uses DB templates).
4.  **Context Customization (Generations Tab):**
    *   Select context ('chat'/'post').
    *   Edit System Prompt (defaults to Character Card).
    *   Edit Instructions.
    *   Add Examples.
    *   Define Main Goal for generation.
    *   Save/Reset prompts.
5.  **Interaction/Generation:** Chat or generate content using the combined prompts for that context.
6.  **Refinement:** Iterate on Character Card or context prompts based on results.

## Implementation Status & Current Issues

1. ✅ **Database Schema**: Implemented `character_cards`, `system_prompts`, `instruction_templates` tables
2. ✅ **Claude API Simplification**: Removed many hardcoded prompts, focusing on API communication
3. ✅ **Template Storage**: Added system-level templates to the database
4. ✅ **AbstractionApproach Update**: Now uses database templates
5. ✅ **API Architecture Refactoring**: Implemented separation of concerns with PromptConstructionService
   - Created centralized service for building prompts from database
   - Updated chat and content generation endpoints to use database-first approach
   - Deprecated direct prompt input in favor of database lookups
6. ✅ **XML Removal**: Replaced XML formatting with Markdown
7. ✅ **Frontend/Backend Separation**: Fixed API endpoints to use database values instead of direct inputs
8. ✅ **API Documentation & Testing**: Updated API reference to match implementation and added comprehensive tests

## Development Roadmap

### Completed
- ✅ Core setup and DB schema
- ✅ Basic Claude API integration
- ✅ Database-driven template system
- ✅ Frontend UI updates for Examples and Main Goal
- ✅ API architecture refactoring
- ✅ Remove XML formatting
- ✅ Fix separation of concerns between frontend and backend
- ✅ API documentation and testing

### Current Focus
- 🔲 Unit testing for PromptConstructionService
- 🔲 Integration tests for refactored endpoints
- 🔲 Frontend update to use refactored endpoints
- 🔲 Cleanup deprecated methods in Claude API

### Future Enhancements
- 🔲 Multi-Character Card Management
- 🔲 Advanced Feedback Loops
- 🔲 Cross-Platform Analysis UI

See [task-list.md](task-list.md) for detailed development tasks.

## Long-Term Vision

The ultimate vision for Digital Twin Lab is to create an end-to-end platform for:

1. **Multi-Source Digital Representation** - Creating twins that authentically represent users across different platforms
2. **Platform-Optimized Content Creation** - Generating content that maintains voice while adapting to platform norms
3. **Continuous Refinement Through Feedback** - Learning and improving from user assessments and interactions
4. **Cross-Platform Analysis** - Understanding how users adapt their voice and content across different contexts
5. **Personality Evolution Tracking** - Visualizing how digital twins improve and adapt over time

This platform will enable users to understand their own cross-platform communication patterns and extend their digital presence with authentic, platform-appropriate content that maintains their unique voice and style.

## Lessons Learned

1.  Start with modular organization.
2.  Implement proper state management early.
3.  Maintain clear boundaries.
4.  Establish consistent error handling.
5.  Invest in comprehensive documentation.
6.  **Keep prompts visible and editable (Core Playground Principle).**
7.  **Store templates in the database, not in code.**
8.  **Plan for data migration when making architectural changes.**
9.  **Maintain strict separation of concerns between frontend and backend.**
10. **Use database for persistent storage, not API parameters.**

## Resources & Useful Commands

- `npm run dev-frontend` - Start development server (watches backend & frontend TS).
- `node scripts/reset.js` - Wipe and recreate database from `schema.sql`.
- `node scripts/migrate_prompts.js` - Migrate existing user data to the new prompt system.
- `npm run build` - Compile for production.
- `npm start` - Run production build.
- `./tests/run_tests.sh` - Run comprehensive API tests.