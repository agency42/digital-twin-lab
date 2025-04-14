# Digital Twin Lab - Technical Documentation & Roadmap

This document provides comprehensive technical information about the Digital Twin Lab project - a platform for generating and experimenting with AI system prompts designed to simulate user personalities.

## Project Vision & Philosophy

The Digital Twin Lab is designed as a **true prompt engineering playground**. The core mission is to empower users to iteratively experiment with AI-powered personality simulation using fully transparent and customizable prompts. Key principles:

1.  **Transparency**: Every component of the prompt sent to the AI model (system message, user message, instructions, examples) must be visible and editable by the user through the frontend. There should be no hidden backend prompts.
2.  **Database-Driven**: All prompt templates, character cards, and user-specific customizations are stored in the database, making them persistent, manageable, and editable.
3.  **Modularity**: Prompt components (Character Card, Instructions, Examples, Main Goal) are treated as distinct but composable elements.
4.  **User Control**: Users have complete control over the generation process, from the base character definition to the specific instructions given for a task.

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

When generating content (e.g., a post):

1.  **System Message Construction**:
    *   Start with the relevant `System Prompt` text fetched from `system_prompts` for the user and context (e.g., `type='post'`).
    *   Append the relevant `Instruction Template` text from `instruction_templates`.
    *   Append any `Examples` provided by the user.
    *   This combined text becomes the `system` parameter in the Claude API call.
2.  **User Message Construction**:
    *   The `Main Goal` entered by the user becomes the `user` message parameter in the Claude API call.

This ensures the AI receives the full context (persona + instructions + examples) as the system message and the specific task as the user message, while keeping all parts transparent and editable.

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
- **Routes (`routes/`)**: API endpoints (`promptRoutes.ts`, `chatRoutes.ts`, etc.).
- **Services (`services/`)**: Business logic (`promptService.ts`, `abstractionApproach.ts`).
- **API Clients (`api/`)**: Simplified `claude.ts` for direct API communication.
- **Utilities (`lib/`)**: Database connection (`database.ts`), helpers.

### Frontend Structure (`src/client/ts/` and `public/`)
- `index.html`: Main UI container.
- **TypeScript Modules (`src/client/ts/modules/`)**: Frontend logic (`promptModule.ts`, `contentMediumModule.ts`, etc.).
- **Compiled JS (`public/js/`)**: Transpiled JavaScript.

### Digital Twin Representation (Database-Driven)
- All core prompt components (`character_cards`, `system_prompts`, `instruction_templates`) are stored in the SQLite database.
- System-level templates are in `system_prompts` with `user_id='system'`.

### Data Storage (SQLite Database)
- Key tables: `users`, `assets`, `character_cards`, `system_prompts`, `instruction_templates`. (See `database/schema.sql`).

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

## Data Migration Guide

Migrating from the previous hardcoded prompt system to the new database-driven template system requires careful steps:

**Challenges:**

*   Existing character cards were generated with potentially different implicit instructions.
*   Users may have customized prompts based on the old structure.
*   Features relying on the old `claude.ts` methods are currently broken.

**Required Steps:**

1.  **Backup Database**: Before running any migration, back up `database/digital_twin_lab.db`.
2.  **Run `prompt_templates.sql`**: Ensure system-level templates (`character_card_template`, `character_card_generation`) are in the `system_prompts` table (already done).
3.  **Create User Defaults**:
    *   Write a migration script (`scripts/migrate_prompts.js` or similar).
    *   For each existing user:
        *   Fetch their *current* character card from `character_cards`.
        *   If a card exists:
            *   Create default entries in `system_prompts` for `type='chat'` and `type='post'`, setting `prompt_text` to the character card's data and `is_custom=0`.
            *   Create default entries in `instruction_templates` for `type='chat'` and `type='post'` with predefined default instructions (e.g., "Engage in conversation." or "Generate content based on the main goal.").
        *   If no card exists, skip (defaults will be created when they generate their first card).
4.  **Review Existing `system_prompts` / `instruction_templates`**: If users already had entries (from partial past migrations), ensure they are compatible or update them. The `is_custom` flag should correctly reflect whether user edits exist.
5.  **Update Backend Code**: Modify all route handlers and services that previously called removed `claude.ts` methods (`generateSystemPrompt`, `generateCharacterCard`, `streamContent`, etc.) to:
    *   Fetch necessary prompts/templates from the database using `PromptService`.
    *   Construct the `system` and `user` messages appropriately.
    *   Call the simplified `claudeAPI.generateCompletion`.
6.  **Update Frontend Code**:
    *   Modify UI in the "Generations" tab to include separate fields for Examples and Main Goal.
    *   Update API calls (`generateContent`, chat) to send the structured data (systemPrompt, instructions, examples, mainGoal).
    *   Ensure the "Content Library" uses the updated `AbstractionApproach` for card generation.
7.  **Testing**:
    *   Test character card generation.
    *   Test content generation ('post') with default and custom prompts/instructions.
    *   Test chat functionality.
    *   Verify that resetting prompts works correctly.
    *   Test with both new users and existing users (after migration).

**Potential Issues During Migration:**

*   Parsing errors if old character card data is malformed.
*   Ensuring `is_custom` flags are set correctly based on whether user edits existed previously.
*   Handling users with no existing character card.

## Implementation Status

1.  ✅ **Database Schema**: Implemented `character_cards`, `system_prompts`, `instruction_templates` tables.
2.  ✅ **Claude API Simplification**: Removed hardcoded prompts, focusing solely on API communication.
3.  ✅ **Template Storage**: Added system-level templates to the database via `prompt_templates.sql`.
4.  ✅ **AbstractionApproach Update**: Now uses database templates instead of hardcoded ones.
5.  ❌ **Route Handlers**: Need to update all routes (`chatRoutes`, `promptRoutes`, etc.) to use the new simplified API and database lookups.
6.  ❌ **Frontend Components**: Need to update UI ("Generations" tab, potentially "Content Library") and API calls.
7.  ❌ **Data Migration**: Migration script (`scripts/migrate_prompts.js`) needs to be created and run for existing users.

## Development Roadmap (Updated)

### Phase 1-3: Setup, Refactoring, Basic UI (Completed)
- ✅ Core setup, DB schema, basic prompt editing UI.

### Phase 4: True Prompt Playground Implementation (Current Focus)
- ✅ Simplify Claude API, move templates to DB, update AbstractionApproach.
- 📝 **Documentation Update (This Task)**: Consolidate docs into CLAUDE.md.
- 🔲 **Data Migration**: Create and run script (`scripts/migrate_prompts.js`) for existing users.
- 🔲 **Route Handler Updates**: Update `chatRoutes`, `promptRoutes`, etc., to use simplified API and DB templates.
- 🔲 **Frontend Updates**: Enhance "Generations" UI (Examples, Main Goal), update API calls.
- 🔲 **Testing**: Thoroughly test migrated users and new workflows.
- 🔲 **Template Management UI (Optional Stretch)**: Add UI for editing system templates.

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

## Lessons Learned

1.  Start with modular organization.
2.  Implement proper state management early.
3.  Maintain clear boundaries.
4.  Establish consistent error handling.
5.  Invest in comprehensive documentation.
6.  **Keep prompts visible and editable (Core Playground Principle).**
7.  **Store templates in the database, not in code.**
8.  **Plan for data migration when making architectural changes.**

## Resources & Useful Commands

- `npm run dev-frontend` - Start development server (watches backend & frontend TS).
- `node scripts/reset.js` - Wipe and recreate database from `schema.sql`.
- `node scripts/migrate_prompts.js` - Migrate existing user data to the new prompt system.
- `npm run build` - Compile for production.
- `npm start` - Run production build.

## TypeScript Migration
- ✅ Backend and Frontend fully migrated to TypeScript.