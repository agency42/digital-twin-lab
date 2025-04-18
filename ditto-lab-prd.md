# Frontend Refactoring PRD

## 1. Overview
We’re consolidating the existing multi‑tab UI into a single “Playground” screen.  User setup and Content Library merge into one sidebar; the main canvas becomes a unified Chat/Post area.  Two primary modules live in the sidebar: Character Card and Instructions.  All other workflows fold into this screen.

## 2. Goals & Objectives
- **Single screen “Playground”** with collapsible sidebar + large Chat/Post area
- **Merge User Setup + Content Library** so bio, LinkedIn status, asset upload & scrape live together
- **Eliminate “base prompt” concept**—use Instructions pane exclusively for LLM prompt text
- **Character Card generation & editing** in one module
- **Clear, minimal UI**—no extra tabs or hidden flows

## 3. Scope
**In-scope**
- UI layout refactor (app.ts, modules/*)
- Sidebar: Profile + Content Library + Character Card + Instructions
- Main canvas: Chat vs Post toggle, input field, history pane
- State driven entirely by `state.currentUserData`
- API tweaks: Save bio as content asset; remove base‑prompt endpoints

**Out-of-scope**
- Deep redesign of component styling
- New authentication flows

## 4. UX / UI Requirements

```ascii
+--------------------------------------------------------------------------+
|                       Digital Twin Lab – Unified Playground              |
+-------------+------------------------------------------------------------+
| Sidebar     | Chat / Post                                              |
|  (collapsed)| [ Chat ]   [ Post ]                                      |
| ▶ Profile   | +------------------------------------------------------+ |
|    • Bio    | | Conversation or Generated Post history               | |
| ▶ Library   | | …                                                    | |
|    [Text│Img]| +------------------------------------------------------+ |
| ▶ CharCard  | Input: [_____________________________] [Send/Generate]  |
| ▶ Instructions |                                                      |
+-------------+------------------------------------------------------------+
```

- **Sidebar modules** (toggle ▶/▼):
  - **Profile**: shows user select, bio textarea, “Save Bio” → creates a text asset
  - **Library**: two tabs (Text | Images), list assets, upload & scrape controls
  - **Character Card**: “Generate” LLM call; JSON preview; “Save Card”
  - **Instructions**: prompt editor; “Save Instructions”

- **Main canvas**:
  - **Chat**: chat history + input + Send
  - **Post**: generated post preview + “Regenerate” + “Copy”

## 5. Functional Requirements
1. **On load**: GET `/api/users/:id` → populate `state.currentUserData`
2. **Profile**: PUT `/api/users/:id` updates bio & adds text asset
3. **Library**: upload & scrape add to assets, visible in tabs
4. **Character Card**:
   - POST `/api/charcard/:id/generate` → new JSON preview & save
   - PUT `/api/charcard/:id` → save edits
5. **Instructions**: PUT `/api/users/:id/instructions` → save free‑form prompt
6. **Chat**: POST `/api/chat/:id`
7. **Post**: POST `/api/post/:id`

## 6. Backend Considerations & API Changes
- Remove `/api/prompts/:id/...` endpoints
- Add `/api/users/:id/instructions`
- Enhance PUT `/api/users/:id` to accept bio → create text asset
- Ensure GET `/api/users/:id` returns `{ bio, assets: { text[], images[] }, characterCard, instructions }`

## 7. Cleanup Summary
All legacy code audited; nothing blocks this refactor:
- ✔ Removed base‑prompt migration & endpoints
- ✔ Merged assessment UI into Playground & deprecated old routes
- ✔ Pruned stale CSS/HTML templates
- ✔ Removed orphaned modules & unused imports

## 8. Success Metrics
- Playground loads <500 ms
- Sidebar modules toggle smoothly
- Bio save appears in Library
- Chat/Post both work in same panel
- Card generate & save functions
- Instructions edit & save functions

## 9. Milestones & Timeline
| Week | Deliverable                                  |
|------|-----------------------------------------------|
| 1    | UI skeleton & module docking (app.ts)         |
| 2    | Profile & Library modules + API integration   |
| 3    | CharCard & Instructions modules               |
| 4    | Chat/Post integration & e2e testing           |
| 5    | Polish, docs, remove legacy code, release     |

----
*Last updated: 2025-04-17*