# Digital Twin Lab Task List

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

9.  **Implement Single-Personality User Model**
    *   🔲 Update database schema to clarify that each user has one primary personality/persona.
    *   🔲 Modify API endpoints to maintain this one-to-one relationship.
    *   🔲 Ensure UI reflects this model (clear editing of a single personality per user).
    *   🔲 Add "reset to original" functionality for personality prompt edits.

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
    *   🔲 Build website scraping functionality with direct tie to personality generation.
    *   🔲 Add placeholders for future social media integration (LinkedIn, Twitter).
    *   🔲 Ensure scraped content is properly stored and associated with user for personality generation.

## Priority 3: High-Impact UX & Refinements

14. **Simplify Navigation State Management** (Was Task #6)
    *   🔲 Consolidate tab enabling/disabling logic.
    *   🔲 Create a clear, deterministic flow for tab state changes.
    *   🔲 Remove redundant enablement code.

15. **Improve Frontend State Management** (Was Task #7)
    *   ✅ Create a consistent approach (e.g., centralize in `utils.js` state, use `localStorage` *or* `sessionStorage` consistently).
    *   🔲 Implement better synchronization between client state and UI.
    *   🔲 Add state validation/cleanup (e.g., on user change).

16. **Optimize LinkedIn Status Checking** (Was Task #9)
    *   ✅ Reduce API calls for status checking.
    *   🔲 Create a single source of truth for connection status (potentially using DB-backed session).
    *   🔲 Implement caching for connection status.

## Priority 4: Code Improvements

17. **Performance Optimizations** (Was Task #9 in P3)
    *   ✅ *Enabled:* Indexed lookups for assets/users via SQLite.
    *   🔲 Add proper caching for static assets (CSS, JS).
    *   🔲 Optimize frontend asset loading if needed.

18. **Reduce Duplication** (Was Task #8 in P3)
    *   ✅ *Partially Addressed:* Common JSON file utilities removed by DB migration.
    *   🔲 Extract other common functions (e.g., directory management if still needed, frontend utils).
    *   🔲 Consolidate event handler registration patterns in frontend modules.

19. **Refactor Monolithic Files** (Was Task #10)
    *   🔲 Break up large `server.js` file into more route files (e.g., move standalone routes like `/api/chat`, `/api/scrape`).
    *   🔲 Split large frontend modules (`userModule.js`, `contentModule.js`) into smaller, focused components/hooks if needed (Consider post-stabilization).

## Priority 5: Future-Proofing & Polish

20. **Improve Error Handling** (Was Task #11)
    *   🔲 Add consistent server-side error logging (structured).
    *   🔲 Implement proper error recovery/fallback mechanisms.
    *   🔲 Create user-friendly error messages on the frontend.

21. **Implement Testing** (Was Task #12)
    *   🔲 Add unit tests for critical services (post-SQLite migration).
    *   🔲 Create integration tests for core flows (DB interactions, API routes).
    *   🔲 Add E2E tests for user journeys (OAuth, upload, chat, assessment).

22. **Documentation** (Was Task #13)
    *   🔲 Update `CLAUDE.md` to reflect the SQLite architecture.
    *   🔲 Document the database schema.
    *   🔲 Add API documentation for updated/new endpoints.
    *   🔲 Create developer setup guide.

## Build Process Tasks (Ongoing)

23. **Setup Development Environment** (Was Task #14)
    *   🔲 Add linting configuration (ESLint).
    *   🔲 Configure Prettier for code formatting.
    *   🔲 Set up Git hooks for pre-commit checks.

24. **CI/CD Setup** (Was Task #15)
    *   🔲 Create basic GitHub Actions workflow.
    *   🔲 Add automated testing to the workflow.
    *   🔲 Set up deployment process.

25. **Monitoring and Logging** (Was Task #16)
    *   🔲 Implement structured logging (as part of Error Handling).
    *   🔲 Add error tracking (e.g., Sentry).
    *   🔲 Set up performance monitoring.