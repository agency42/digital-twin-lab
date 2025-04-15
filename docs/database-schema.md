# Database Schema

Digital Twin Lab uses SQLite for data storage. This document outlines the current database schema based on the `.schema` output.

**Note:** Some older or unused tables like `instruction_sets` and `prompt_templates` might still exist in the schema output but are likely superseded by the simpler `system_prompts` and `instruction_templates` tables.

## Table: `users`

Stores user account information.

| Column                    | Type      | Description                                                     |
|---------------------------|-----------|-----------------------------------------------------------------|
| `user_id`                 | TEXT      | Primary Key. User identifier (e.g., 'ken_v1')                   |
| `email`                   | TEXT      | User's email address (UNIQUE)                                   |
| `password_hash`           | TEXT      | Hashed password (if using password auth)                        |
| `bio`                     | TEXT      | Short user biography                                            |
| `linkedin_connected`      | INTEGER   | Flag (0/1) indicating if LinkedIn is connected                  |
| `linkedin_profile_asset_id` | TEXT      | Foreign key to `assets.id` for the LinkedIn profile data      |
| `base_prompt_id`          | TEXT      | Likely intended to link to a base prompt/card (usage unclear) |
| `assessment_data`         | TEXT      | JSON string for storing assessment results                    |
| `created_at`              | DATETIME  | Timestamp of creation                                           |
| `updated_at`              | DATETIME  | Timestamp of last update (updated by trigger)                   |

## Table: `assets`

Stores content assets uploaded or scraped by users.

| Column          | Type      | Description                                                   |
|-----------------|-----------|---------------------------------------------------------------|
| `id`            | TEXT      | Primary Key. UUID for the asset                               |
| `user_id`       | TEXT      | Foreign Key to `users.user_id` (ON DELETE CASCADE)            |
| `filename`      | TEXT      | Original filename of the uploaded asset                     |
| `file_path`     | TEXT      | Path to the stored file                                       |
| `file_type`     | TEXT      | General type ('text', 'image', etc.)                          |
| `source_url`    | TEXT      | Optional URL if the asset was scraped                         |
| `upload_time`   | DATETIME  | Timestamp of upload                                           |
| `content`       | TEXT      | Text content extracted from the asset (if applicable)         |
| `source_platform`| TEXT      | Platform origin (e.g., 'website', 'linkedin')               |
| `source_medium` | TEXT      | Medium type (e.g., 'article', 'post')                         |
| `mime_type`     | TEXT      | MIME type of the original file                                |
| `size_bytes`    | INTEGER   | Size of the file in bytes                                     |
| `metadata`      | TEXT      | Additional metadata (JSON string)                             |

## Table: `character_cards`

Stores generated character cards representing the digital twin.

| Column           | Type      | Description                                                     |
|------------------|-----------|-----------------------------------------------------------------|
| `id`             | TEXT      | Primary Key. UUID for the card                                  |
| `user_id`        | TEXT      | Foreign Key to `users.user_id` (ON DELETE CASCADE)            |
| `card_name`      | TEXT      | Optional name for the card                                      |
| `card_data`      | TEXT      | JSON string containing the detailed character card attributes   |
| `is_current`     | INTEGER   | Flag (0/1) indicating if this is the user's active card       |
| `created_at`     | DATETIME  | Timestamp of creation                                           |
| `updated_at`     | DATETIME  | Timestamp of last update (updated by trigger)                   |
| `based_on_assets`| TEXT      | JSON array (string) of `assets.id` used to generate this card |

## Table: `system_prompts`

Stores the base system prompt text used for different interaction types ('chat', 'post'), potentially customized by the user.

| Column         | Type      | Description                                                     |
|----------------|-----------|-----------------------------------------------------------------|
| `id`           | TEXT      | Primary Key. UUID                                               |
| `user_id`      | TEXT      | Foreign Key to `users.user_id` (ON DELETE CASCADE)            |
| `type`         | TEXT      | Interaction type ('chat' or 'post'). CHECK constraint ensures valid values. |
| `prompt_text`  | TEXT      | The actual system prompt text (often based on `character_cards.card_data`) |
| `is_custom`    | INTEGER   | Flag (0/1) indicating if user modified from default character card |
| `created_at`   | DATETIME  | Timestamp of creation                                           |
| `updated_at`   | DATETIME  | Timestamp of last update (updated by trigger)                   |

**Constraint:** `UNIQUE(user_id, type)` - Prevents multiple prompts of the same type for one user.

## Table: `instruction_templates`

Stores specific instructions, main goals, and examples for different interaction types ('chat', 'post').

| Column           | Type      | Description                                                     |
|------------------|-----------|-----------------------------------------------------------------|
| `id`             | TEXT      | Primary Key. UUID                                               |
| `user_id`        | TEXT      | Foreign Key to `users.user_id` (ON DELETE CASCADE)            |
| `type`           | TEXT      | Interaction type ('chat' or 'post'). CHECK constraint ensures valid values. |
| `instruction_text`| TEXT      | The main instruction text for the AI                            |
| `mainGoal`       | TEXT      | Specific goal/topic provided by the user for generation       |
| `examples`       | TEXT      | Example content provided by the user (stored as raw text/JSON) |
| `created_at`     | DATETIME  | Timestamp of creation                                           |
| `updated_at`     | DATETIME  | Timestamp of last update (updated by trigger)                   |

**Constraint:** `UNIQUE(user_id, type)` - Prevents multiple instruction sets of the same type for one user.

## Other Tables (Briefly Noted)

-   **`assessment_results`**: Stores results from user or AI personality assessments (e.g., TIPI).
-   **`alignment_metrics`**: Stores calculated alignment scores between user and AI assessments.
-   **`oauth_state`**: Used for managing OAuth flow state (e.g., for LinkedIn login).
-   **`instruction_sets` / `prompt_templates`**: Appear to be older tables, potentially superseded by `system_prompts` and `instruction_templates`.

## Triggers

-   Triggers exist on `users`, `character_cards`, `system_prompts`, and `instruction_templates` to automatically update the `updated_at` timestamp whenever a row is modified.

## Indexes

-   Indexes exist on `user_id` and `type` fields in relevant tables to improve query performance. 