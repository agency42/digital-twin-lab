# Integration Plan

**Date:** 2025-04-17

## Overview

This document defines the steps and mappings needed to integrate our TypeScript frontend with the existing Express backend API.

## 1. Refer to API Reference

-   All endpoints are documented in `docs/api-reference.md`.

## 2. Module-to-Endpoint Mapping

-   **User Module** (`src/client/ts/modules/userModule.ts`)

    -   GET `/api/users/:id` ➔ loadUserData, loadUserList
    -   PUT `/api/users/:id` ➔ handleSaveBio
    -   POST `/api/users` ➔ handleCreateUser
    -   POST `/api/users/:userId/assessment` ➔ handleUserAssessmentSubmit

-   **Content Module** (`contentModule.ts`)

    -   POST `/api/upload` ➔ handleFileUpload
    -   POST `/api/scrape` + GET `/api/scrape/status` ➔ startScraping, pollScrapeStatus
    -   GET `/api/assets/:userId` ➔ loadContentAssets
    -   GET `/api/assets/:userId/:assetId/content` ➔ fetchAssetContent

-   **Prompt Module** (`promptModule.ts`)

    -   POST `/api/prompts/:userId/generate-character-card` ➔ generateCharacterCard
    -   GET `/api/prompts/:userId/current-character-card` ➔ displayCurrentCharacterCard
    -   PUT `/api/users/:userId/instructions` ➔ saveCustomGenerationPrompt (instructions)

-   **Chat Module** (`chatModule.ts`)

    -   POST `/api/chat` ➔ sendMessage (with body: `{ userId, userMessage, temperature?, stream? }`)

-   **Assessment Module** (`userModule.ts` using assessment functions)
    -   GET `/api/assessment/tipi-questions` ➔ loadTipiQuestions
    -   POST `/api/assessment/:userId/submit` ➔ handleUserAssessmentSubmit

## 3. Update & Test

1. Adjust `fetch` URLs and payloads in each function to match API paths and parameters.
2. Ensure `state.currentUserId` and other state keys align with route parameters.
3. Add or fix response handling to update UI on success/error.
4. Test each integration flow in the browser and review console/network logs.

## 4. UI-to-API Feature Mapping

Below is a direct mapping of visible frontend features to backend API endpoints:

### Sidebar

-   **Lab / Library Tabs**
    -   No direct API call; toggles between UI panels.

### Your Prompts Panel

#### Twin

-   **Dropdown (Twin1, etc.)**
    -   GET `/api/users` — Populates twin/user list
    -   GET `/api/users/:id` — Loads selected twin’s data (bio, etc.)
-   **Bio Textarea**
    -   GET `/api/users/:id` — Loads and displays the current bio
    -   PUT `/api/users/:id` — Updates bio for the selected twin
-   **Upload / URL Buttons**
    -   POST `/api/upload` — Upload new text/image asset
    -   POST `/api/scrape` — Scrape a URL and add content
-   **Save Bio Button**
    -   PUT `/api/users/:id` — Saves the bio

#### Character Card

-   **Generate Button**
    -   POST `/api/prompts/:userId/generate-character-card` — Generate new card
    -   GET `/api/prompts/:userId/current-character-card` — Load latest card

#### Instructions

-   **Textarea**
    -   PUT `/api/users/:userId/instructions` or PUT `/api/prompts/:userId/instruction-templates/:type` — Save instructions

#### Examples

-   **Add/Edit Example Interactions**
    -   PUT `/api/prompts/:userId/instruction-templates/:type/examples` — Save example interactions

### Main Canvas (Chat Area)

-   **Chat History / Input**
    -   GET `/api/chat/history/:userId` (if implemented) — Load chat history
    -   POST `/api/chat` — Send/receive chat messages

### Content Library (Library Tab)

-   **Asset List**
    -   GET `/api/assets/:userId` — List assets
-   **Asset Details**
    -   GET `/api/assets/:userId/:assetId/content` — Load full content
    -   GET `/api/assets/:userId/:assetId/preview` — Load preview/summary

### Other Features

-   **Assessment/Personality**
    -   GET `/api/assessment/tipi-questions` — Load questions
    -   POST `/api/assessment/:userId/submit` — Submit answers
    -   GET `/api/assessment/results/:resultId` — Load results

---

This mapping ensures each UI feature is directly powered by its backend endpoint. Update this as new features or endpoints are added.

## 5. Verification Criteria

-   User profile loads and saves correctly.
-   File uploads and scrapes populate the content library.
-   Character cards generate and display JSON properly.
-   Chat messages stream and display as expected.
-   Assessment questions load and submit scores correctly.
