# Digital Twin Lab Task List

## Project Vision & End-State Goals

The Digital Twin Lab aims to create a platform for generating, managing, and experimenting with AI system prompts designed to simulate user digital identities across different platforms and contexts, with the following key capabilities:

1.  **Multi-Source Character Card Generation**
    *   Ingest content from personal websites, social accounts, and other sources.
    *   Generate effective **JSON character cards** from diverse inputs using AI.
    *   Incorporate platform-specific adaptations based on content source.

2.  **Context-Specific Prompt Management**
    *   Provide UI for viewing the current character card.
    *   Allow users to customize **System Prompts** and **Instruction Templates** for specific contexts (Chat, Post generation) via the UI.
    *   Persist these customizations in the database (`system_prompts`, `instruction_templates`).
    *   Allow resetting context-specific System Prompts back to match the current Character Card.

3.  **Contextual AI Interaction**
    *   Utilize the appropriate customized (or default) System Prompt and Instruction Template when interacting with AI in different modules (chat, post generation).
    *   Support experimentation by easily modifying prompts and instructions per context.

4.  **Dynamic Content Generation**
    *   Create a post generator that uses the context-specific System Prompt and Instruction Template to produce platform-appropriate content.
    *   Maintain authentic voice and style matching the Character Card and System Prompt specifications.

5.  **Continuous Refinement Loop**
    *   Use feedback from chat interactions, assessment results, and generated content to refine Character Cards, System Prompts, and Instruction Templates.
    *   Create self-improving digital twin interactions through prompt optimization.

6.  **Advanced Assessment Tools**
    *   Implement chat-based assessment comparing user and AI responses (driven by specific System Prompts/Instructions).
    *   Provide visual comparison between human and AI-generated answers.
    *   Allow direct feedback on AI performance to improve context-specific prompts.

## Current Sprint: Architecture Refinement & Documentation

1.  **Refactor Monolithic Files** (Ongoing)
    *   ✅ Break up `server.ts` into separate route files.
    *   🔲 Split large frontend modules (`userModule.ts`, `contentModule.ts`, `assessmentModule.ts`).

2.  **Performance Optimizations** (Ongoing)
    *   ✅ Enhance static asset caching.
    *   🔲 Optimize frontend asset loading.

3.  **Cleanup Redundant/Old Files** (Ongoing)
    *   ✅ Various cleanup tasks completed.
    *   ✅ Create audit script.

4.  **Documentation Improvements** (Completed)
    *   ✅ Create project structure tree.
    *   ✅ Add cursor rule file for project structure.
    *   ✅ Update documentation (CLAUDE.md, task-list.md, PROMPTS.md, README.md) to reflect new architecture (Character Cards, System Prompts, Instruction Templates in DB).
    *   ✅ Update documentation to reflect new Interactions page UI.
    *   🔲 Add developer onboarding guide.

5.  **Content Source Management** (Completed - pending UI integration)
    *   ✅ Enhance asset metadata model & DB schema.
    *   ✅ Update asset handling & scraping to store source info.
    *   ✅ Update file upload UI code (HTML elements needed).
    *   ✅ Update content library UI code (HTML elements needed).

6.  **Refactor to Prompt-Centric Architecture** (Completed)
    *   ✅ **Database:** New schema with `character_cards`, `system_prompts`, `instruction_templates`.
    *   ✅ **Backend Services:** Updated `promptService.ts` for new tables and logic.
    *   ✅ **Backend Routes:** Updated `promptRoutes.ts` for new API endpoints.
    *   ✅ **Frontend Types:** Updated types for new data structures.
    *   ✅ **Frontend Modules:** Refactored `promptModule.ts` (Character Card focus) and `contentMediumModule.ts` (loads/saves context-specific data from DB).
    *   ✅ **UI Enhancements:** Simplified Generations tab UI. Added Save/Reset buttons for System Prompt and Instructions.

7.  **Implement Unified Interactions Page** (Completed)
    *   ✅ **UI Integration:** Combine Content Medium and Chat features.
    *   ✅ **Medium Selector:** Add tabs for switching mediums (chat/post).
    *   ✅ **Dark Mode UI:** Enhance UI readability.
    *   ✅ **Content Generation:** Add ability to generate sample content.
    *   ✅ **Full Prompt Display:** Add toggle (may need revision).

## Next Phase: Feature Enhancements

*   **(Deferred)** Backend Component Separation (Database schema is now stable with the 3 tables).

8.  **Advanced Web Scraping & Content Ingestion** (Next Priority)
    *   Enhance scraper structure preservation & selective scraping.
    *   Add social media scraping.
    *   Content preview/validation.

9.  **Prompt Generation Enhancement** (Next Priority)
    *   Refine character card generation in `AbstractionApproach`.
    *   Improve Claude instructions in `ClaudeAPI` for better quality character cards.
    *   (Optional) Add UI for managing multiple character cards per user.

10. **Content Generation System** (Next Priority)
    *   Extend current medium-specific generation capabilities.
    *   Ensure backend generation uses correct context-specific prompts/instructions.
    *   Enhance library integration for generated content.

11. **Chat & Assessment Enhancements**
    *   Implement parallel AI response generation.
    *   Visual comparison interface.
    *   Feedback collection integration for prompt refinement.

## Priority 3: High-Impact User Experience (Ongoing)
    *   ✅ Task 13: Unified Interactions UI (Completed).
    *   ✅ Task X: Refactored DB/API/Frontend for Prompt Architecture (Completed).
    *   🔲 Task 14: Enhanced Post Generator.
    *   🔲 Task 15: Chat-Based Assessment System.
    *   🔲 Task 16: Feedback Loop Implementation.

## P0: Database Migration & Core Stabilization (Completed)
    *   ✅ All tasks related to initial SQLite migration and stabilization.

## Priority 1: Critical Post-Migration Issues (Completed)
    *   ✅ LinkedIn OAuth Flow review.
    *   ✅ Basic Security Fixes (Input validation).

## Priority 2: Prompt Refactoring & Integration (Completed)
    *   ✅ **See Task #6 above.**

## Legacy Tasks (Addressed or Deprioritized)
    *   Tasks 17, 18, 19 related to Navigation/State/LinkedIn Status.

## Build Process Tasks (Ongoing)
    *   Tasks 20, 21, 22 for Dev Env, CI/CD, Monitoring.