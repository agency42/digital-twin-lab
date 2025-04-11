# Digital Twin Lab - Technical Documentation & Roadmap

This document provides comprehensive technical information about the Digital Twin Lab project - a platform for generating and experimenting with AI system prompts designed to simulate user personalities.

## Project Vision

The Digital Twin Lab is designed as a prompt engineering playground for iterative experimentation with AI-powered personality simulation using customizable system prompts. The core mission is to:

1. **Generate effective Character Cards** (JSON format) from diverse content sources (websites, social media, text) that capture a user's core identity.
2. **Enable context-specific customization** of System Prompts and Instruction Templates based on the Character Card.
3. **Persist these customizations** in a structured database (`character_cards`, `system_prompts`, `instruction_templates`).
4. **Provide tools for interacting** with the AI (chat, content generation) using the appropriate context-specific prompts.
5. **Facilitate continuous prompt refinement** based on user feedback and assessment results.
6. **Maintain complete transparency** about what prompts are sent to models at all times.

The ultimate goal is to empower users to craft and test prompts that allow AI models to interact and generate content authentically representing the user's voice, style, and platform-specific nuances, with full visibility into the prompting process.

## Prompt Engineering Playground

Digital Twin Lab's primary function is to serve as a playground for prompt engineering experimentation:

### Core Features

1. **Prompt Engineering Playground**
- Complete transparency in what is sent to the model
- No hidden prompts or instructions
- Designed for iterative experimentation with different prompt structures

2. **Structured Prompt Components**
- **Character Card (JSON):** Defines core identity (traits, voice, background). Generated from content.
- **System Prompt (Text):** Context-specific system message (e.g., for Chat, Post). Derived from Character Card, but editable.
- **Instruction Template (Text):** Context-specific task instructions.
- Stored separately in the database for modularity.

3. **Unified Interface**
- User Profile Management
- Content Collection/Scraping
- Character Card Generation
- Contextual Prompt Editing (System Prompt & Instructions)
- Interaction & Content Generation (Chat, Post)
- Evaluation & Testing

4. **Immediate Feedback Loop**
   - Make small changes to System Prompts or Instructions and immediately see effects in chat or generated content.
   - Compare outputs across different contexts.

5. **Controlled Experimentation**
   - Test different directives within Character Cards or System Prompts.
   - Experiment with different Instruction Templates for various tasks.
   - Adjust character attributes (via re-generating card) independently from context-specific prompts/instructions.

For complete documentation on the prompt structures and usage, see [PROMPTS.md](PROMPTS.md).

## Architecture Overview

The project is built with a modular architecture, separating frontend and backend concerns:

### Backend Structure (`src/server/`)
- `server.ts` - Express server setup and middleware.
- **Routes (`routes/`)**: API endpoints for different functional areas (`assetRoutes.ts`, `userRoutes.ts`, `promptRoutes.ts`, etc.).
- **Services (`services/`)**: Core business logic (`promptService.ts`, `abstractionApproach.ts`, `claude.ts` in `api/`, etc.).
- **Utilities (`lib/`)**: Database connection, helpers, etc.

### Frontend Structure (`src/client/ts/` and `public/`)
- `index.html` - Single page application UI container.
- **TypeScript Modules (`src/client/ts/modules/`)**: Modular frontend organization (`app.ts`, `promptModule.ts`, `contentMediumModule.ts`, `utils.ts`, etc.).
- **Compiled JS (`public/js/`)**: Output of TypeScript compilation.

### Digital Twin Representation (Database-Driven)

The system now relies on the database to manage prompt components:

1. **Character Card (JSON Format)**: Generated via Claude from user assets and stored in the `character_cards` table. The card marked `is_current = 1` is considered the active one.
2. **System Prompts (Text)**: Stored in the `system_prompts` table, linked to `user_id` and `type` ('chat' or 'post'). An `is_custom` flag tracks if it differs from the current character card.
3. **Instruction Templates (Text)**: Stored in the `instruction_templates` table, linked to `user_id` and `type` ('chat' or 'post').

When interacting or generating content:
- The frontend requests data for the specific context (`userId`, `type`) via `/api/prompts/:userId/generations-data`.
- The backend retrieves the current `character_card`, the specific `system_prompt` (respecting `is_custom`), and the specific `instruction_template`.
- The frontend displays these in the editors.
- For generation, the *current text* from the editors is sent to the relevant backend API (e.g., `/api/chat/generate`).
- The backend uses the provided text directly.

This ensures persisted customizations are used while maintaining transparency.

### Data Storage (SQLite Database)
- User data, asset metadata.
- `character_cards` table (stores JSON character cards).
- `system_prompts` table (stores context-specific system prompt text).
- `instruction_templates` table (stores context-specific instruction text).
- Assessment results, OAuth state, etc.

## Core User Journey

1. **User Setup:** Create profile, connect accounts, optionally take TIPI assessment.
2. **Content Collection:** Upload files, scrape websites/social media.
3. **Character Card Generation:** Select content in Content Library, generate Character Card JSON.
4. **Context Customization (Generations Tab):**
   - Select context ('chat' or 'post').
   - View/Edit System Prompt (initially matches card).
   - View/Edit Instruction Template.
   - Save changes (updates DB for that context).
   - Reset System Prompt (reverts DB entry to match current card).
5. **Interaction / Generation:**
   - Chat (uses 'chat' context prompts).
   - Generate Post (uses 'post' context prompts).
6. **Assessment Simulation:** Run assessment (likely uses dedicated 'assessment' context prompts, TBD).
7. **Continuous Improvement:** Refine Character Card (by regenerating) or context-specific prompts/instructions based on results.

## Prompt Engineering Implementation (Database-Driven)

### Character Cards
- Core identity (JSON) generated by Claude, stored in `character_cards`.

### System Prompts
- Context-specific system messages ('chat', 'post') stored in `system_prompts`.
- Defaults match the current character card (`is_custom=0`).
- User edits are saved, setting `is_custom=1`.
- Reset reverts to current character card data (`is_custom=0`).

### Instruction Templates
- Context-specific instructions ('chat', 'post') stored in `instruction_templates`.
- Defaults are predefined.
- User edits are saved.

### Prompt Combination & Transparency
- Frontend fetches the relevant System Prompt and Instruction Template text from the backend based on context.
- Frontend sends the *current editor text* to generation endpoints.
- Backend uses the received text directly.

### Implementation Task List (Updated)

1. **(Completed)** **Database Schema Refactor:** Implemented `character_cards`, `system_prompts`, `instruction_templates` tables.
2. **(Completed)** **Backend API Refactor:** Updated `promptService` and `promptRoutes` for new schema and endpoints.
3. **(Completed)** **Frontend Refactor:** Updated `promptModule` and `contentMediumModule` to fetch/save data via new API, manage UI state correctly.
4. **(Completed)** **Documentation Updates:** Updated `README.md`, `PROMPTS.md`, `task-list.md`, `CLAUDE.md`.
5. **Testing (Ongoing):** Verify data persistence, reset functionality, context switching, generation using correct prompts.

## Development Roadmap (Updated)

### Phase 1: Core Infrastructure & Stability (Completed)
- ✅ Basic setup, SQLite migration, TS typing, modular routes.

### Phase 2: Prompt-Centric Architecture Refactoring (Completed)
- ✅ Database schema redesign (`character_cards`, `system_prompts`, `instruction_templates`).
- ✅ Backend service/route updates (`promptService`, `promptRoutes`).
- ✅ Frontend module refactoring (`promptModule`, `contentMediumModule`).

### Phase 3: UI Enhancement & Integration (Completed)
- ✅ Unified Interactions page, medium tabs, dark mode, basic content generation.
- ✅ Save/Reset buttons for context-specific prompts/instructions.

### Phase 4: Feature Enhancements (Current Focus)
- 🔲 Enhance Content & Source Management (Metadata, UI Integration).
- 🔲 Refine Character Card Generation (`AbstractionApproach`, Claude instructions).
- 🔲 Enhance Content Generation System (using correct context prompts).
- 🔲 Enhance Chat & Assessment Features.

### Phase 5: Advanced Features & Polish (Future)
- 🔲 Multi-Character Card Management.
- 🔲 Advanced Feedback Loops.
- 🔲 Cross-Platform Analysis UI.

## Long-Term Vision

The ultimate vision for Digital Twin Lab is to create an end-to-end platform for:

1. **Multi-Source Digital Representation** - Creating twins that authentically represent users across different platforms
2. **Platform-Optimized Content Creation** - Generating content that maintains voice while adapting to platform norms
3. **Continuous Refinement Through Feedback** - Learning and improving from user assessments and interactions
4. **Cross-Platform Analysis** - Understanding how users adapt their voice and content across different contexts
5. **Personality Evolution Tracking** - Visualizing how digital twins improve and adapt over time

This platform will enable users to understand their own cross-platform communication patterns and extend their digital presence with authentic, platform-appropriate content that maintains their unique voice and style.

## Lesson Learned

The initial monolithic approach (4000+ line app.js) created significant technical debt. The refactoring to a modular architecture has improved organization but also revealed integration challenges. Key learnings:

1. Start with modular organization from the beginning
2. Implement proper state management early
3. Maintain clear boundaries between components
4. Establish consistent error handling patterns
5. Invest in comprehensive documentation

## Resources & Useful Commands

- `npm run dev-frontend` - Start development server (watches backend & frontend TS).
- `node scripts/reset.js` - Wipe and recreate database from `schema.sql`.
- `node scripts/migrate.js` - Apply `schema.sql` (idempotent).
- `npm run build` - Compile for production.
- `npm start` - Run production build.

## TypeScript Migration
- ✅ Backend and Frontend fully migrated to TypeScript.