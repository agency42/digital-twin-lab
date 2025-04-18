# API Reference

This document lists all backend API endpoints for Digital Twin Lab.

## Health

-   **GET** `/api/health`  
    Returns service status and timestamp.

## Users

| Endpoint                                 | Method | Description                                                 |
| ---------------------------------------- | ------ | ----------------------------------------------------------- |
| **GET** `/api/users`                     | GET    | List all user IDs.                                          |
| **POST** `/api/users`                    | POST   | Create a new user (body: `{ userId, bio? }`).               |
| **GET** `/api/users/:userId`             | GET    | Get comprehensive user data.                                |
| **PUT** `/api/users/:userId`             | PUT    | Update user bio or instructions.                            |
| **DELETE** `/api/users/:userId`          | DELETE | Delete a user and their assets.                             |
| **POST** `/api/users/:userId/assessment` | POST   | Store user assessment results (body: `{ userTipiScores }`). |

## Authentication (OAuth)

| Endpoint                                             | Method | Description                    |
| ---------------------------------------------------- | ------ | ------------------------------ |
| **GET** `/api/oauth/linkedin/authorize?userId=<id>`  | GET    | Redirect to LinkedIn for auth. |
| **GET** `/api/oauth/linkedin/callback?code=&state=`  | GET    | Handle LinkedIn callback.      |
| **GET** `/api/oauth/linkedin/disconnect?userId=<id>` | GET    | Disconnect LinkedIn for user.  |

## Assets & Uploads

| Endpoint                                       | Method | Description                                                                             |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| **POST** `/api/upload`                         | POST   | Upload files (form-data: `file`, metadata: `userId`, `sourcePlatform`, `sourceMedium`). |
| **GET** `/api/assets/:userId`                  | GET    | List all assets for a user.                                                             |
| **GET** `/api/assets/asset/:assetId`           | GET    | Get metadata for a single asset.                                                        |
| **GET** `/api/assets/:userId/:assetId/content` | GET    | Get full text content of an asset.                                                      |
| **GET** `/api/assets/:userId/:assetId/preview` | GET    | Get a short preview or image description.                                               |
| **DELETE** `/api/assets/:userId`               | DELETE | Delete all assets for a user.                                                           |
| **DELETE** `/api/assets/:userId/bulk`          | DELETE | Delete specific assets (body: `{ assetIds: string[] }`).                                |

## Scraping

| Endpoint                     | Method | Description                                       |
| ---------------------------- | ------ | ------------------------------------------------- |
| **POST** `/api/scrape`       | POST   | Start website scraping (body: `{ url, userId }`). |
| **GET** `/api/scrape/status` | GET    | Poll scraping progress/status.                    |

## Prompts & Character Cards

| Endpoint                                                  | Method | Description                                                                   |
| --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **POST** `/api/prompts/:userId/generate-character-card`   | POST   | Generate and save a new Character Card (body: `{ assetIds, customPrompt? }`). |
| **GET** `/api/prompts/:userId/current-character-card`     | GET    | Fetch the user's current Character Card.                                      |
| **GET** `/api/prompts/:userId/generations-data?type=<chat | post>` | GET                                                                           | Get UI data for Generations tab (card, system prompt, instructions). |
| **PUT** `/api/prompts/:userId/system-prompts/:type`       | PUT    | Update or save a system prompt (body: `{ promptText }`).                      |
| **GET** `/api/prompts/character-card-template`            | GET    | Load default Character Card template.                                         |
| **POST** `/api/prompts/character-card-template`           | POST   | Overwrite default Character Card template (body: JSON).                       |

## Chat & Content Generation

| Endpoint                                      | Method | Description                                                                           |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| **POST** `/api/chat`                          | POST   | Send chat message (body: `{ userId, userMessage, temperature?, stream? }`).           |
| **POST** `/api/chat/:userId/generate-content` | POST   | Generate one-off content (body: `{ contentType, mainGoal?, prompt?, temperature? }`). |

## Assessment

| Endpoint                                    | Method | Description                                                            |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| **GET** `/api/assessment/tipi-questions`    | GET    | Fetch TIPI questions for user assessment.                              |
| **POST** `/api/assessment/:userId/submit`   | POST   | Submit assessment answers (body: `{ answers }`).                       |
| **POST** `/api/assessment/:userId/simulate` | POST   | Trigger AI-simulated assessment (body: `{ personaId, temperature? }`). |
| **GET** `/api/assessment/results/:resultId` | GET    | Fetch a specific assessment result.                                    |

---
