# Digital Twin Lab Task List

## Project Vision & End-State Goals (Revised)

The Digital Twin Lab aims to create a platform for generating, managing, and experimenting with AI system prompts designed to simulate user digital identities across different platforms and contexts, with the following key capabilities:

1.  **Multi-Source Character Card Generation**
    *   Ingest content from personal websites, social accounts, and other sources.
    *   Generate effective **JSON character cards** from diverse inputs using AI.
    *   Incorporate platform-specific adaptations based on content source.

2.  **Character Card Management & Variation**
    *   Provide UI for viewing and managing the generated character cards.
    *   Allow users to edit character cards for specific contexts (chat, assessment, content generation).
    *   Save and manage these **character card variations** linked to the base character card.

3.  **Contextual AI Interaction**
    *   Utilize the appropriate character card (base or variation) when interacting with AI in different modules (chat, assessment).
    *   Support experimentation by easily switching or modifying character cards.

4.  **Dynamic Content Generation**
    *   Create a post generator that uses the selected character card variation to produce platform-appropriate content.
    *   Maintain authentic voice and style matching the character card's specifications.

5.  **Continuous Refinement Loop**
    *   Use feedback from chat interactions, assessment results, and generated content to refine both base character cards and variations.
    *   Create self-improving digital twin interactions through character card optimization.

6.  **Advanced Assessment Tools**
    *   Implement chat-based assessment comparing user and AI responses (driven by specific character cards).
    *   Provide visual comparison between human and AI-generated answers.
    *   Allow direct feedback on AI performance to improve specific character card variations.

## Current Sprint: Codebase Optimization & Prompt Refactoring

1.  **Refactor Monolithic Files** (Ongoing)
    *   ✅ Break up `server.ts` into separate route files.
    *   🔲 Split large frontend modules (`userModule.ts`, `contentModule.ts`, `assessmentModule.ts`).

2.  **Performance Optimizations** (Ongoing)
    *   ✅ Enhance static asset caching.
    *   🔲 Optimize frontend asset loading.

3.  **Cleanup Redundant/Old Files** (Ongoing)
    *   ✅ Various cleanup tasks completed.
    *   ✅ Create audit script.

4.  **Documentation Improvements**
    *   ✅ Create project structure tree.
    *   ✅ Add cursor rule file for project structure.
    *   ✅ Update documentation (CLAUDE.md, task-list.md) to reflect prompt-centric approach.
    *   ✅ Update README.md.
    *   ✅ Update documentation to reflect new Interactions page UI.
    *   🔲 Add developer onboarding guide.

5.  **Content Source Management** (Complete - pending UI integration)
    *   ✅ Enhance asset metadata model & DB schema.
    *   ✅ Update asset handling & scraping to store source info.
    *   ✅ Update file upload UI code (HTML elements needed).
    *   ✅ Update content library UI code (HTML elements needed).

6.  **Refactor to Prompt-Centric Architecture** (Completed)
    *   ✅ **Database:** Rename `personas`->`base_prompts`, `persona_variations`->`prompt_variations`, update columns/keys/indexes.
    *   ✅ **Backend Services:** Rename `PersonalityProfileService`->`PromptService`, update methods. Update `AbstractionApproach` to generate/save prompt strings. Update `ClaudeAPI` to generate prompt strings.
    *   ✅ **Backend Routes:** Rename `personalityRoutes.ts`->`promptRoutes.ts`, update handlers. Update imports in `server.ts`.
    *   ✅ **Backend File Renames:** Manually rename `personalityProfileService.ts` and `personalityRoutes.ts`.
    *   ✅ **Frontend Types:** Simplify `Profile` type to `Record<string, any>` or similar. Update `UserData` and `AppState` to use new prompt terminology (`basePrompt`, `promptVariations`).
    *   ✅ **Frontend Modules:** Rename `personalityModule.ts`->`promptModule.ts`. Refactor UI to display base prompt string (textarea) and remove JSON/card display. Update chat/assessment modules to load/save prompt variations using `PromptService`.
    *   ✅ **UI Enhancements:** Implement Character Card generation and editing. Update UI to clearly differentiate between text-based system prompts and structured JSON character cards.
    *   ✅ **Simplified Generation:** Consolidated on Character Card as the single digital twin representation method, removing the text-based system prompt generation option.
    *   ✅ **Character Card UI Simplification:** Simplified the character card generation UI by removing confusing "Custom Generation Instructions" that modified backend prompts in favor of a clearer, single-prompt approach.

7.  **Implement Unified Interactions Page** (Completed)
    *   ✅ **UI Integration:** Combine Content Medium and Chat features into a single Interactions page.
    *   ✅ **Medium Selector:** Add tabs for switching between different content mediums (Chat, Blog, Tweet, LinkedIn).
    *   ✅ **Dark Mode UI:** Enhance UI with improved contrast and readability.
    *   ✅ **Content Generation:** Add ability to generate sample content for each medium.
    *   ✅ **Full Prompt Display:** Add toggle to show the complete structured prompt.

## Next Phase: Feature Development & Enhancement

8.  **Advanced Web Scraping & Content Ingestion**
    *   Enhance scraper structure preservation & selective scraping.
    *   Add social media scraping.
    *   Content preview/validation.

9.  **Prompt Generation Enhancement**
    *   Refine prompt generation in `AbstractionApproach` (use source markers effectively).
    *   Improve Claude instructions in `ClaudeAPI` for better quality base prompts.
    *   Add UI features for managing/comparing prompt variations.

10. **Content Generation System**
    *   Extend current medium-specific generation capabilities.
    *   Implement more robust backend generation using selected prompt variation.
    *   Enhance library integration for generated content.

11. **Chat & Assessment Enhancements**
    *   Implement parallel AI response generation.
    *   Visual comparison interface.
    *   Feedback collection integration for prompt refinement.

## P0: Database Migration & Core Stabilization (Completed)
    *   ✅ All tasks related to initial SQLite migration and stabilization.

## Priority 1: Critical Post-Migration Issues (Completed)
    *   ✅ LinkedIn OAuth Flow review.
    *   ✅ Basic Security Fixes (Input validation).

## Priority 2: Prompt Refactoring & Integration (Completed)
    *   ✅ **See Task #6 above.**
    *   ✅ Task 11 (Chat Module Integration): Refactor to load/save variations, use base prompt, reset prompt variations on base prompt change.
    *   ✅ Task 12 (Assessment Module Integration): Refactor to load/save variations, use base prompt, link results to prompts.

## Priority 3: High-Impact User Experience
    *   ✅ Task 13: Unified Interactions UI (Content Medium + Chat combined).
    *   🔲 Task 14: Enhanced Post Generator (extending current generation capabilities).
    *   🔲 Task 15: Chat-Based Assessment System (using prompts).
    *   🔲 Task 16: Feedback Loop Implementation (for prompt refinement).

## Legacy Tasks (Addressed or Deprioritized)
    *   Tasks 17, 18, 19 related to Navigation/State/LinkedIn Status.

## Build Process Tasks (Ongoing)
    *   Tasks 20, 21, 22 for Dev Env, CI/CD, Monitoring.