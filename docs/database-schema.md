# Database Schema

Digital Twin Lab uses SQLite for data storage. This document outlines the database schema, including tables, columns, relationships, and purpose.

## Table: users

Stores user account information.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key, UUID format |
| name | TEXT | User's display name |
| email | TEXT | User's email address |
| created_at | TIMESTAMP | When the user account was created |

## Table: assets

Stores content assets uploaded by users, such as text files from various platforms.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key, UUID format |
| user_id | TEXT | Foreign key to users.id |
| content_type | TEXT | Type of content (e.g., "text/plain") |
| mime_type | TEXT | MIME type of the file |
| file_name | TEXT | Original filename |
| file_path | TEXT | Path to the stored file in the uploads directory |
| source_platform | TEXT | Source platform (e.g., "twitter", "linkedin") |
| source_medium | TEXT | Type of content on the platform (e.g., "tweet", "post") |
| content | TEXT | Text content of the asset |
| created_at | TIMESTAMP | When the asset was uploaded |

Indexes:
- `idx_assets_user_id`: Improves queries that filter by user

## Table: character_cards

Stores generated character cards based on user content.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key, UUID format |
| user_id | TEXT | Foreign key to users.id |
| character_data | TEXT | JSON string containing character card attributes |
| created_at | TIMESTAMP | When the character card was created |

The `character_data` JSON structure typically includes:
```json
{
  "persona": "string",
  "writing_style": "string",
  "interests": ["string", "string"],
  "tone": "string",
  "knowledge_areas": ["string", "string"]
}
```

Indexes:
- `idx_character_cards_user_id`: Improves queries that filter by user

## Table: generated_content

Stores content that has been generated from character cards.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key, UUID format |
| user_id | TEXT | Foreign key to users.id |
| card_id | TEXT | Foreign key to character_cards.id |
| platform | TEXT | Target platform (e.g., "twitter", "linkedin") |
| content_type | TEXT | Type of content (e.g., "tweet", "post") |
| content | TEXT | Generated content text |
| created_at | TIMESTAMP | When the content was generated |

Indexes:
- `idx_generated_content_user_id`: Improves queries that filter by user
- `idx_generated_content_card_id`: Improves queries that filter by character card

## Table: conversations

Stores conversation sessions with digital twins.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key, UUID format |
| user_id | TEXT | Foreign key to users.id |
| card_id | TEXT | Foreign key to character_cards.id |
| created_at | TIMESTAMP | When the conversation was started |

Indexes:
- `idx_conversations_user_id`: Improves queries that filter by user
- `idx_conversations_card_id`: Improves queries that filter by character card

## Table: messages

Stores individual messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key, UUID format |
| conversation_id | TEXT | Foreign key to conversations.id |
| sender | TEXT | Either "user" or "assistant" |
| message | TEXT | Message content |
| created_at | TIMESTAMP | When the message was sent |

Indexes:
- `idx_messages_conversation_id`: Improves queries that filter by conversation

## Relationships

1. A user can have many assets (one-to-many)
2. A user can have many character cards (one-to-many)
3. A character card belongs to one user (many-to-one)
4. A user can have many generated content pieces (one-to-many)
5. A character card can have many generated content pieces (one-to-many)
6. A user can have many conversations (one-to-many)
7. A character card can be used in many conversations (one-to-many)
8. A conversation can have many messages (one-to-many)

## Database Initialization

The database is initialized at server startup. The schema creation scripts can be found in `src/server/db/schema.ts`. 