# Digital Twin Lab - Technical Documentation & Roadmap

This document provides comprehensive technical information about the Digital Twin Lab project - a platform for generating and experimenting with AI system prompts designed to simulate user personalities.

## Project Vision

The Digital Twin Lab is designed as a prompt engineering playground for iterative experimentation with AI-powered personality simulation using customizable system prompts. The core mission is to:

1. **Generate effective base system prompts** from diverse content sources (websites, social media, text) that capture a user's essence.
2. **Analyze user representation across different platforms** to inform potential prompt adaptations.
3. **Enable easy editing and management of prompt variations** for different contexts (e.g., chat vs. assessment vs. content generation).
4. **Provide tools for comparing** the outputs of different prompt versions.
5. **Facilitate continuous prompt refinement** based on user feedback and assessment results.
6. **Maintain complete transparency** about what prompts are sent to models at all times.

The ultimate goal is to empower users to craft and test system prompts that allow AI models to interact and generate content authentically representing the user's voice, style, and platform-specific nuances, with full visibility into the prompting process.

## Prompt Engineering Playground

Digital Twin Lab's primary function is to serve as a playground for prompt engineering experimentation:

### Core Features

1. **Prompt Engineering Playground**
- Complete transparency in what is sent to the model
- No hidden prompts or instructions
- Designed for iterative experimentation with different prompt structures

2. **Structured Prompt Templates**
- JSON-based templates allow for clean organization and separation of:
  - Character/Personality Cards (who the digital twin is)
  - Generation Instructions (how the digital twin should respond)
  - Together forming a complete Digital Twin representation

3. **Unified Interface**
- User Profile Management
- Content Collection/Scraping
- Digital Twin Generation
- Evaluation & Testing
- Multi-platform Previews (Twitter, LinkedIn, etc.)

4. **Immediate Feedback Loop**
   - Make small changes to prompts and immediately see effects
   - Compare outputs across different platforms
   - Save variations for different contexts to test effectiveness

5. **Controlled Experimentation**
   - Test different directive styles
   - Experiment with output format requirements
   - Adjust character attributes independently from generation instructions

For complete documentation on the prompt structures and usage, see [PROMPTS.md](PROMPTS.md).

## Architecture Overview

The project is built with a modular architecture, separating frontend and backend concerns:

### Backend Structure (`src/`)
- `server.ts` - Express server setup and middleware.
- **Routes** - API endpoints organized by domain:
  - `assetRoutes.ts` - Content management (uploads, metadata).
  - `userRoutes.ts` - User profile operations.
  - `promptRoutes.ts` - Base prompt generation and variation management (formerly `personalityRoutes.ts`).
  - `chatRoutes.ts` - Chat functionality using prompts.
  - `oauthRoutes.ts` - Social media integration (LinkedIn).
  - `scrapeRoutes.ts` - Website scraping for content ingestion.
  - `uploadRoutes.ts` - File upload handling.
  - `assessmentRoutes.ts` - Assessment functionality using prompts.
- **Services** - Business logic encapsulation:
  - `assetProcessor.ts` - Content handling, storage, metadata.
  - `promptService.ts` - Base prompt and variation CRUD operations (formerly `personalityProfileService.ts`).
  - `websiteScraper.ts` - Web content extraction.
  - `oauthService.ts` - Social authentication flows.
  - `userDataService.ts` - User profile management.
  - `abstractionApproach.ts` - Logic for generating base prompts from assets.
  - `aiService.ts` - AI service interaction (e.g., for assessment simulation).
  - `claude.ts` (in `api/`) - Handles communication with the Claude API for prompt generation and potentially other tasks.

### Frontend Structure (`public/`)
- `index.html` - Single page application UI container.
- **TypeScript Modules** (`public/js/modules/`) - Modular frontend organization:
  - `app.ts` - Main entry point and module initialization.
  - `userModule.ts` - User management & LinkedIn integration.
  - `contentModule.ts` - Asset collection and management.
  - `promptModule.ts` - Base prompt generation and display (formerly `personalityModule.ts`).
  - `contentMediumModule.ts` - Handle different content medium interactions (chat, blog, tweet, LinkedIn).
  - `chatModule.ts` - Digital twin chat interactions, allowing prompt editing.
  - `assessmentModule.ts` - Personality assessment simulation using prompts.
  - `navigationModule.ts` - Tab navigation between sections.
  - `utils.ts` - Shared utility functions and state management.

### Digital Twin Representation
The system uses a standardized approach to represent digital twins:

**Prompt Template (JSON Format)**: A structured JSON representation containing two main components:

1. **Character/Personality Card**:
   - Entity details (name, handle, form, occupation, gender, age)
   - Personality traits including Big Five factors
   - Voice style and communication patterns
   - Relationship handling approaches
   - Areas of expertise and background

2. **Generation Instructions**:
   - Directives for behavior (never break character, avoid narration)
   - Platform-specific adaptations (e.g., LinkedIn vs Twitter style)
   - Output formatting rules and guidelines
   - Default fallback instructions

This JSON template serves as the system prompt for the AI model. When using the digital twin in different contexts (chat, assessment, social media), the system automatically selects the appropriate instructions from the template.

Users can edit both the character card and generation instructions through the user interface, allowing for flexible customization of their digital twin.

### Data Storage (SQLite Database)
- User data including profile information.
- Asset metadata and references to asset files.
- `base_prompts` table storing the primary generated system prompt string for each user.
- `prompt_variations` table storing user modifications to the base prompt for specific modules (chat, assessment, etc.).
- Assessment results and alignment metrics (linked to prompts used).
- OAuth state information.
- Potentially: Content generation examples, interaction histories, feedback data.

## Core User Journey

1. **User Setup:** Create profile, connect accounts, optionally take TIPI assessment.
2. **Content Collection:** Upload files, scrape websites/social media.
3. **Base Prompt Generation:** Select content, generate an initial system prompt designed to capture the user's personality and voice.
4. **Prompt Management:** View the generated base prompt.
5. **Interactions:** Use the Interactions page to:
   - Chat with the digital twin in real-time
   - Configure how your digital twin communicates across different mediums (chat, blog, tweet, LinkedIn)
   - Generate sample content for selected mediums
   - View and edit system prompts for different contexts
   - View the full structured prompt including examples and parameters
6. **Assessment Simulation:** Run assessment simulations (e.g., TIPI) using the current prompt (base or variation) to compare AI responses to user's baseline. Edit the prompt for assessment context; save as 'assessment' variations.
7. **Continuous Improvement:** Refine the base prompt or variations based on interaction quality, assessment results, and generated content.

## Complete User Flow (Revised)

1. Create user.
2. Connect social accounts.
3. Upload content or scrape websites. Categorize content source.
4. Take TIPI assessment (baseline).
5. **Prompt Module:** Select content, generate base system prompt. View/manage the base prompt.
6. **Interactions Page:** 
   - Select a medium (Chat, Blog, Tweet, LinkedIn)
   - For Chat: Interact with AI using the current prompt. Edit prompt; saves as variation.
   - For other mediums: Configure medium-specific instructions, examples, and parameters.
   - Generate sample content for the selected medium.
   - View the full structured prompt including all parameters and examples.
7. **Assessment Module:** Run simulation using current prompt (defaults to base, loads variation if exists). Edit prompt; saves as 'assessment' variation. Compare results.
8. Refine prompts based on results and feedback.

## Prompt Engineering Implementation

### System Prompts
- The core of each digital twin is represented by a **prompt template** (JSON format) stored in the `base_prompts` table.
- This template contains both the character/personality card and generation instructions.
- The template is generated by Claude based on analysis of user assets, using the asset's metadata about source platform/medium to inform platform-specific adaptations.
- The template serves as the system prompt and follows a structured JSON format with distinct sections for character information (personality traits, voice characteristics) and generation instructions (platform adaptations, directives).
- Using JSON format ensures consistency and makes it easier to extract specific instructions for different contexts.

### Prompt Variations
- Users can edit both character cards and instruction sets within specific modules (Chat, Assessment, etc.).
- Variations are stored in the database linked to the base prompt, allowing for rapid experimentation.
- Variations can be saved for different platforms or contexts (e.g., a more professional LinkedIn version vs. a casual Twitter version).

### Prompt Transparency
- When generating content, the system displays exactly which instruction was extracted from the prompt template and used for generation.
- No additional prompts or instructions are added by the backend beyond what's in your template.
- This transparency is critical for effective prompt engineering.

### Flexible Instruction Paths
- The system supports multiple paths for defining generation instructions:
  - `platform_adaptations.[medium].generation_instructions`
  - `generation.platform_instructions.[medium]`
  - `[medium]_instructions`
  - `generation_instructions` or `generation.default_instruction`
  - `main_goal`
- This flexibility allows users to organize their prompt templates in the way that makes most sense for their use case.
- The system has a clear priority order for which instructions to use, ensuring predictable behavior.

### Interactions Page
- The Interactions page combines what was previously two separate pages (Content Medium and Digital Twin Chat)
- It features a medium selector with tabs for Chat, Blog, Tweet, and LinkedIn
- The UI uses dark mode styling with improved contrast for readability
- Chat is the default medium and offers real-time interaction with the digital twin
- Other mediums allow configuration of medium-specific instructions and parameters
- Users can view the full structured prompt for any medium, showing how parameters and examples are combined
- The page includes generate buttons to create sample content for each medium type

## Implementation Task List

### 1. Database Schema Updates
- [ ] Create a new `character_cards` table to store character information separately
- [ ] Create a new `generation_instructions` table to store instruction sets
- [ ] Add relationship fields to link character cards and instructions to prompt templates
- [ ] Update `base_prompts` table to reference these components
- [ ] Create migration script for existing data

### 2. Backend API Changes
- [ ] Update `/api/prompts/:userId/generate` endpoint to create separate components
- [ ] Update `/api/prompts/:userId/generate-character-card` to match new structure
- [ ] Modify `chatRoutes.ts` to handle the new structure for content generation
- [ ] Create new API endpoints for managing character cards and instructions separately
- [ ] Update prompt service to support the new component-based approach

### 3. Frontend Changes
- [ ] Create UI components for editing character card and instructions separately
- [ ] Update promptModule.js to handle separate character and instruction editing
- [ ] Modify chatModule.js to display which instruction set is being used
- [ ] Add interface for selecting/mixing different character cards with different instruction sets
- [ ] Update JSON viewer component to show the structured format

### 4. Data Migration
- [ ] Write script to convert existing flat JSON to the new structured format
- [ ] Separate character attributes from generation instructions in existing data
- [ ] Handle edge cases where the separation isn't clean
- [ ] Test migration on sample data before applying to production

### 5. Documentation Updates
- [ ] Update PROMPTS.md to include implementation details and examples
- [ ] Update README.md to reflect the new structure in user workflows
- [ ] Create developer documentation for the new component-based approach
- [ ] Document migration process for future reference

### 6. Testing
- [ ] Test character card generation with the new structure
- [ ] Test content generation across different platforms
- [ ] Verify backward compatibility with existing features
- [ ] Test mixing different character cards with different instruction sets

### Implementation Priority
1. Database schema and backend API changes (foundation)
2. Data migration script (preserve existing data)
3. Frontend UI updates (user experience)
4. Documentation and testing (ensure quality)

## Development Roadmap

### Phase 1: Core Infrastructure & Stability (Completed)
- ✅ Migrate to SQLite database storage
- ✅ Implement proper TypeScript typing
- ✅ Refactor monolithic server into modular routes
- ✅ Clean up codebase and eliminate redundancies
- ✅ Enhance asset caching and performance
- ✅ Implement port auto-selection to prevent conflicts

### Phase 2: Prompt-Centric Architecture Refactoring (Completed)
- ✅ Rename database tables and adjust schema for prompt-based approach
- ✅ Update backend services to generate/save prompt strings instead of JSON personality objects
- ✅ Refactor frontend to use prompt strings with module-specific variations
- ✅ Implement variation management and saving in chat and assessment modules
- ✅ Update UI to display and edit prompt text directly
- ✅ Clean up old personality-based code and references

### Phase 3: UI Enhancement & Integration (Completed)
- ✅ Combine Content Medium and Chat into unified Interactions page
- ✅ Improve UI contrast and readability with dark mode styling
- ✅ Implement medium selection tabs for different content types
- ✅ Add full structured prompt display functionality
- ✅ Add sample content generation for different mediums
- ✅ Enhance chat experience with terminal-like interface

### Phase 4: Content & Source Management (Next)
- 🔲 Enhance asset metadata model to include source medium/platform
- 🔲 Update database schema for categorizing content by source
- 🔲 Extend asset upload UI to allow specifying content source
- 🔲 Create filters to view content by platform/medium
- 🔲 Enhance website scraper to better preserve content structure
- 🔲 Implement selective scraping for specific content types
- 🔲 Add support for scraping social media platforms

### Phase 5: Prompt Generation Enhancement
- 🔲 Refine prompt generation in `AbstractionApproach`
- 🔲 Add source-specific prompt instructions
- 🔲 Improve Claude API instructions for better quality prompts
- 🔲 Create visualization for prompt variation effectiveness
- 🔲 Support both individual and brand prompt types

### Phase 6: Advanced Content Generation System
- 🔲 Enhance the medium-specific content generation functionality
- 🔲 Implement more robust backend for platform-specific content generation
- 🔲 Add generated content to library with proper categorization
- 🔲 Implement feedback collection for generated content
- 🔲 Create optimization loop for content quality improvement

### Phase 7: Advanced Assessment & Feedback Loop
- 🔲 Implement parallel AI response generation during chat
- 🔲 Create visual comparison interface for responses
- 🔲 Add feedback collection system for AI performance
- 🔲 Integrate assessment feedback into prompt refinement
- 🔲 Design system for incorporating generated content into prompt models
- 🔲 Implement analytics to track prompt improvement over time

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

- `npm run dev` - Start development server with auto-reload
- `/api/migrate-assets` - Standardize legacy asset directory structure
- Browser console logs show detailed path resolution for debugging
- Use React Developer Tools to inspect component hierarchy

## TypeScript Migration
- [x] **TypeScript Migration:** Convert the codebase from JavaScript to TypeScript.
-   [x] Setup `tsconfig.json`.
-   [x] Install necessary dependencies (`typescript`, `@types/node`).
-   [x] Convert frontend modules (`public/js/**`) to `.ts` and resolve compilation errors. (Completed)
-   [ ] Convert backend server (`src/**`, `server.ts`) to `.ts`.
-   [ ] Configure backend build/run process.