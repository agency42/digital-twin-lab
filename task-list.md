# Digital Twin Lab Task List

## Project Vision & End-State Goals

The Digital Twin Lab aims to create a platform that can accurately model and simulate user digital identities across different platforms and contexts, with the following key capabilities:

1. **Multi-Source Persona Generation**
   * Support both individual and brand identity modeling
   * Ingest content from personal websites, social accounts, and other sources
   * Generate comprehensive personality models from diverse inputs

2. **Cross-Platform Content Analysis**
   * Categorize content by medium (blogs, Twitter, LinkedIn, website copy, etc.)
   * Analyze how users represent themselves differently across channels
   * Incorporate platform-specific patterns into personality models

3. **Dynamic Content Generation**
   * Create a post generator that produces platform-appropriate content
   * Maintain authentic voice and style matching the persona
   * Support customization through input prompts and contexts

4. **Continuous Refinement Loop**
   * Add generated content back to the content library
   * Use feedback to improve persona models
   * Create self-improving digital twins

5. **Advanced Assessment Tools**
   * Implement chat-based assessment comparing user and AI responses
   * Provide visual comparison between human and AI-generated answers
   * Allow direct feedback on AI performance to improve models
   * Feed assessment results back into persona generation

## Current Sprint: Codebase Optimization & Cleanup

1. **Refactor Monolithic Files**
   * ✅ Break up `server.ts` into separate route files:
     * ✅ Create `chatRoutes.ts` for `/api/chat` endpoints
     * ✅ Create `scrapeRoutes.ts` for `/api/scrape` endpoints
     * ✅ Create `uploadRoutes.ts` for `/api/upload` endpoint
   * 🔲 Split large frontend modules:
     * 🔲 Refactor `userModule.ts` (1091 lines) into smaller functional components
     * 🔲 Refactor `contentModule.ts` (861 lines) into smaller functional components
     * 🔲 Refactor `assessmentModule.ts` (763 lines) into smaller functional components

2. **Performance Optimizations**
   * ✅ Enhance static asset caching:
     * ✅ Implement proper cache headers for CSS/JS files (set to 1 day/86400 seconds)
   * 🔲 Optimize frontend asset loading:
     * 🔲 Review and optimize JS module dependencies
     * 🔲 Implement code splitting if applicable

3. **Cleanup Redundant/Old Files**
   * ✅ Clean up duplicate TypeScript/JavaScript files in public/js directories
   * ✅ Remove unused dependencies in package.json (proper-lockfile)
   * ✅ Create cleanup script for maintenance (cleanup.sh)
   * ✅ Fix build process to properly handle frontend files
   * ✅ Add npm script for easy cleanup (npm run cleanup)
   * ✅ Remove redundant JSON files after SQLite migration (assets.json, users.json)
   * ✅ Remove empty directories from project
   * ✅ Implement port auto-selection to prevent conflicts
   * ✅ Create audit script to identify unnecessary files

4. **Documentation Improvements**
   * ✅ Create project structure tree for easier navigation
   * ✅ Add cursor rule file with project structure (.cursor/rules/project-structure.mdc)
   * 🔲 Update README.md with current tech stack and architecture
   * 🔲 Add developer onboarding guide

## Next Phase: Feature Development & Enhancement

5. **Content Source Management**
   * 🔲 Enhance asset metadata model to include source medium/platform
   * 🔲 Update database schema for categorizing content by source
   * 🔲 Extend asset upload UI to allow specifying content source
   * 🔲 Create filters to view content by platform/medium

6. **Advanced Web Scraping & Content Ingestion**
   * 🔲 Enhance website scraper to better preserve content structure
   * 🔲 Implement selective scraping for specific content types
   * 🔲 Add support for scraping social media platforms
   * 🔲 Create content preview and validation before ingestion

7. **Personality Model Enhancement**
   * 🔲 Update personality JSON structure to include platform-specific traits
   * 🔲 Add cross-platform analysis to persona generation
   * 🔲 Implement source-specific persona variations
   * 🔲 Create visualization for cross-platform personality differences

8. **Content Generation System**
   * 🔲 Design and implement post generator UI tab
   * 🔲 Create backend for platform-specific content generation
   * 🔲 Develop prompted content generation system
   * 🔲 Add generated content to library with proper categorization

9. **Chat-Based Assessment Module**
   * 🔲 Implement parallel AI response generation during chat
   * 🔲 Create visual comparison interface for responses
   * 🔲 Add feedback collection system for AI performance
   * 🔲 Integrate assessment feedback into persona refinement

10. **Feedback Loop Integration**
    * 🔲 Design system for incorporating generated content into persona models
    * 🔲 Create feedback categorization for improving specific traits
    * 🔲 Implement analytics to track persona improvement over time

## P0: Database Migration & Core Stabilization (Top Priority)

1.  **Integrate SQLite Database**
    *   🔲 Add `sqlite3` dependency.
    *   ✅ Create database initialization script (`src/lib/database.js` or similar).
    *   ✅ Define initial schema (tables for users, assets, personas, oauth_state, etc.).
    *   ✅ Implement basic DB connection pool/utility functions.

2.  **Migrate Core Services to SQLite**
    *   ✅ Refactor `UserDataService` to use SQLite instead of `users.json` and `fileUtils`.
    *   ✅ Refactor `AssetProcessor` & asset handling logic:
        *   Store asset metadata (UUID, path, type, user association) in SQLite instead of `assets.json`.
        *   Ensure file uploads correctly write files and update the database record.
    *   ✅ Refactor `PersonalityProfileService` / `AbstractionApproach` to store/retrieve persona data (SoulScript JSON) from SQLite.
    *   ✅ Refactor `OAuthService` to potentially store tokens/state linked to users in the database instead of relying solely on cookies/temp files if applicable.

3. **Refactor Asset Serving & Path Resolution** (Supersedes old Task #2)
    *   ✅ Update asset request endpoint (`/api/assets/:assetId` or similar) to fetch metadata (including file path/key) from the database.
    *   ✅ Simplify or remove the complex asset-serving middleware in `server.js` (lines 87-171).

4.  **Remove Custom File Locking** (Supersedes old Task #3 & #5)
    *   ✅ Remove usage of `withLock` and related logic from `fileUtils.js` for database-managed entities.
    *   ✅ Deprecate or remove the stale lock detection/cleanup mechanisms.

5.  **Address Lock-Related Issues via DB** (Addresses core issue of old Task #4 sub-point)
    *   ✅ Verify that migrating `UserDataService` and `AbstractionApproach` interactions resolves the lock contention during personality generation/saving.

6.  **Stabilization Testing**
    *   ✅ Test core user flows after migration: User creation/selection, File upload/display/delete, Personality generation/saving, LinkedIn connect/disconnect.

## Priority 1: Critical Post-Migration Issues

7.  ✅ **Review & Finalize LinkedIn OAuth Flow** (Was Task #1)
    *   ✅ Consolidate OAuth endpoints (keep `/api/oauth/linkedin/callback`).
    *   ✅ Replace in-memory state with cookies.
    *   ✅ Remove duplicate frontend code.
    *   ✅ Simplify frontend callback logic.
    *   ✅ Fix profile asset display.
    *   ✅ Fix disconnection endpoint.
    *   ✅ Add JSON formatting for preview.
    *   ✅ **Verify:** Ensure OAuth flow works correctly with user data now stored in SQLite. Check token storage/handling if refactored in P0.

8.  **Fix Security Issues** (Was Task #8 in P2)
    *   ✅ Remove logging of sensitive information (tokens, profile data) if any remain.
    *   ✅ Implement proper input validation for all API endpoints.
    *   🔲 Add Content Security Policy headers.

## Priority 2: Personality/Persona Model Refinement

9.  **Implement Enhanced Persona Model**
    *   🔲 Update database schema to support both individual and brand personas
    *   🔲 Extend persona JSON structure for platform-specific representation
    *   🔲 Add source categorization to the persona generation process
    *   🔲 Implement cross-channel analysis into persona generation

10. **Persona Data Workflow Improvements**
    *   ✅ Update personality generation module to create the base personality JSON.
    *   ✅ Implement versioning for different contexts (chat, assessment) of the same base personality.
    *   ✅ Store module-specific variations in the database with relationships to the base persona.
    *   ✅ Add schema for assessment results tied to user and persona version.

11. **Chat Module System Prompt Integration**
    *   🔲 Make system prompt an editable version of the personality prompt.
    *   🔲 Enable chat-specific saving of system prompt variations.
    *   🔲 Add functionality to reset the chat when system prompt is changed.
    *   🔲 Implement "Reset to Original" option to revert to base personality.

12. **Assessment Module Integration**
    *   ✅ Create assessment-specific version of system prompt.
    *   ✅ Add TIPI assessment questions and result storage.
    *   ✅ Implement simulation mode that compares user results with AI-generated responses.
    *   ✅ Store alignment analysis in database linked to user/persona.

13. **Content Ingestion Flow**
    *   🔲 Build enhanced website scraping functionality with content type detection.
    *   🔲 Add content categorization by medium/platform during ingestion.
    *   🔲 Implement selective scraping for targeted content types.
    *   🔲 Add support for social media platform integration.

## Priority 3: High-Impact User Experience

14. **Post Generator Module**
    *   🔲 Design and implement post generator UI tab.
    *   🔲 Create backend for content generation based on persona.
    *   🔲 Implement platform-specific styling for generated content.
    *   🔲 Add ability to save generated content back to content library.

15. **Chat-Based Assessment System**
    *   🔲 Develop parallel AI response system during user chats.
    *   🔲 Create visual comparison interface for responses.
    *   🔲 Add commentary/feedback system for AI performance.
    *   🔲 Integrate feedback into persona refinement process.

16. **Feedback Loop Implementation**
    *   🔲 Build system for incorporating generated content and feedback into persona refinement.
    *   🔲 Create analytics for tracking persona development over time.
    *   🔲 Add visualization for persona evolution based on feedback.

## Legacy Tasks (Moved to separate priorities above)

17. **Simplify Navigation State Management** (Was Task #6)
    *   🔲 Consolidate tab enabling/disabling logic.
    *   🔲 Create a clear, deterministic flow for tab state changes.
    *   🔲 Remove redundant enablement code.

18. **Improve Frontend State Management** (Was Task #7)
    *   ✅ Create a consistent approach (e.g., centralize in `utils.js` state, use `localStorage` *or* `sessionStorage` consistently).
    *   🔲 Implement better synchronization between client state and UI.
    *   🔲 Add state validation/cleanup (e.g., on user change).

19. **Optimize LinkedIn Status Checking** (Was Task #9)
    *   ✅ Reduce API calls for status checking.
    *   🔲 Create a single source of truth for connection status (potentially using DB-backed session).
    *   🔲 Implement caching for connection status.

## Build Process Tasks (Ongoing)

20. **Setup Development Environment** (Was Task #14)
    *   🔲 Add linting configuration (ESLint).
    *   🔲 Configure Prettier for code formatting.
    *   🔲 Set up Git hooks for pre-commit checks.

21. **CI/CD Setup** (Was Task #15)
    *   🔲 Create basic GitHub Actions workflow.
    *   🔲 Add automated testing to the workflow.
    *   🔲 Set up deployment process.

22. **Monitoring and Logging** (Was Task #16)
    *   🔲 Implement structured logging (as part of Error Handling).
    *   🔲 Add error tracking (e.g., Sentry).
    *   🔲 Set up performance monitoring.