# Digital Twin Lab Cleanup & Polishing Tasks

**Current focus: Backend cleanup**

---

## 1. Backend Code Cleanup

- [x] Remove unused imports, variables and dead code across routes & services
- [x] Remove deprecated/commented-out endpoint code and markers
- [x] Eliminate `TODO` comments or address them (e.g. concrete types in `any[]`)
- [x] Tighten loose types (`any`, `object`) to specific interfaces
- [x] Rerun TS lint (`noUnusedLocals`/`noUnusedParameters`) and fix remaining warnings
- [x] Validate all route handlers, ensure no unreachable code

## 2. Project Structure Audit

- [x] Identify & remove unnecessary files/folders (e.g. old temp/data dumps, unused configs)
  - [x] Remove committed database binary files (`/database/*.db`, backups)
  - [x] Remove `.cursor` directory from repo
- [x] Verify `package.json` dependencies & scripts align with actual usage
- [x] Ensure code formatting & lint configs (.eslintrc, prettier) reside in root

## 3. Frontend Cleanup (Next Phase)

- [x] Audit `src/client` modules for dead code, unused assets, commented-out blocks
  - [x] `src/client/ts/app.ts`: removed unused import `loadUserData`
  - [x] `src/client/ts/modules/assessmentModule.ts`: removed unused type imports & tightened types to fix lint
  - [x] `src/client/ts/modules/chatModule.ts`: removed unused vars & fixed loop/catch lint
  - [x] `src/client/ts/modules/contentMediumModule.ts`: removed unused interfaces, tightened types, fixed promises
  - [x] `src/client/ts/modules/contentModule.ts`: removed unused props, tightened types
  - [x] `src/client/ts/modules/promptModule.ts`
- [x] Remove unused UI components & tighten TS types
- [x] Rerun lint/build for frontend, fix any errors/warnings

## 4. Documentation & Tracking

- [x] Maintain this task list to track progress
- [x] Update `README.md` with cleanup summary and contributor guide
- [x] Optionally move this file into `docs/` when stable

---

*Last updated: 2025-04-17*
