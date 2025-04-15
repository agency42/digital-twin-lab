# API Reference

This document provides a comprehensive reference for all API endpoints in the Digital Twin Lab application. This is the consolidated API documentation that includes all endpoint details, request/response formats, and examples.

> **Note:** This document replaces and consolidates the information previously found in `api-docs.md` and `api-documentation.md`.

## Base URL

All endpoints are relative to the base URL:

```
http://localhost:3000/api
```

## Authentication

Currently, the API uses simple user ID-based authentication. The user ID is passed as a parameter in most endpoints.

## User Management

### List All Users

Retrieves all user IDs in the system.

**Endpoint:** `GET /users`

**Response: (200 OK)**
```json
[
  "string", "string", "string"
]
```

### Create User

Creates a new user in the system.

**Endpoint:** `POST /users`

**Request Body:**
```json
{
  "userId": "string"
}
```

**Response: (201 Created)**
```json
{
  "user_id": "string",
  "email": null,
  "password_hash": null,
  "bio": null,
  "linkedin_connected": 0,
  "linkedin_profile_asset_id": null,
  "base_prompt_id": null,
  "assessment_data": null,
  "created_at": "ISO datetime string",
  "updated_at": "ISO datetime string",
  "currentCharacterCard": null,
  "systemPrompts": [],
  "instructionTemplates": [],
  "assessments": {}
}
```

### Get User

Retrieves information about a specific user.

**Endpoint:** `GET /users/{userId}`

**Parameters:**
- `userId` (path): The ID of the user to retrieve

**Response: (200 OK)**
```json
{
  "user_id": "string",
  "email": null,
  "password_hash": null,
  "bio": null,
  "linkedin_connected": 0,
  "linkedin_profile_asset_id": null,
  "base_prompt_id": null,
  "assessment_data": null,
  "created_at": "ISO datetime string",
  "updated_at": "ISO datetime string",
  "currentCharacterCard": null,
  "systemPrompts": [],
  "instructionTemplates": [],
  "assessments": {}
}
```

## Asset Management

### Upload File

Uploads a file to be associated with a user.

**Endpoint:** `POST /upload`

**Request Body (multipart/form-data):**
- `userId` (form field): The ID of the user
- `sourcePlatform` (form field): The platform the asset is from (e.g., "twitter", "linkedin")
- `sourceMedium` (form field): The medium of the asset (e.g., "tweet", "post")
- `file` (file upload): The file to upload

**Response: (200 OK)**
```json
{
  "message": "Successfully processed 1 file(s).",
  "results": [
    {
      "id": "string",
      "user_id": "string",
      "filename": "string",
      "file_path": "string",
      "file_type": "string",
      "source_url": null,
      "upload_time": "ISO datetime string",
      "content": "string",
      "source_platform": "string",
      "source_medium": "string",
      "mime_type": "string",
      "size_bytes": 0,
      "metadata": "{}"
    }
  ]
}
```

### Get All Assets

Retrieves all assets associated with a user.

**Endpoint:** `GET /assets/{userId}`

**Parameters:**
- `userId` (path): The ID of the user

**Response: (200 OK)**
```json
[
  {
    "id": "string",
    "userId": "string",
    "contentType": "string",
    "mimetype": "string",
    "fileName": "string",
    "filePath": "string",
    "sourcePlatform": "string",
    "sourceMedium": "string",
    "createdAt": "ISO datetime string"
  }
]
```

### Get Asset Content

Retrieves the content of a specific asset.

**Endpoint:** `GET /assets/{userId}/{assetId}/content`

**Parameters:**
- `userId` (path): The ID of the user
- `assetId` (path): The ID of the asset

**Response: (200 OK)**
```
Raw content of the asset (e.g., text file contents, JSON data, etc.)
```

## Character Card Management

### Generate Character Card

Generates a character card based on user assets. 
Note: Each user has only one active character card, which is regenerated each time this endpoint is called.

**Endpoint:** `POST /prompts/{userId}/generate-character-card`

**Parameters:**
- `userId` (path): The ID of the user

**Request Body:**
```json
{
  "assetIds": ["string"],
  "customPrompt": "string (optional)"
}
```

**Response: (200 OK)**
```json
{
  "id": "string",
  "user_id": "string",
  "card_name": "string",
  "card_data": "JSON string",
  "is_current": 1,
  "created_at": "ISO datetime string",
  "updated_at": "ISO datetime string",
  "based_on_assets": "JSON string of asset IDs"
}
```

### Get Current Character Card

Retrieves the current character card for a user.

**Endpoint:** `GET /prompts/{userId}/current-character-card`

**Parameters:**
- `userId` (path): The ID of the user

**Response: (200 OK)**
```json
{
  "id": "string",
  "user_id": "string",
  "card_name": "string",
  "card_data": "JSON string",
  "is_current": 1,
  "created_at": "ISO datetime string",
  "updated_at": "ISO datetime string",
  "based_on_assets": "JSON string of asset IDs"
}
```

## Content Generation

### Generate Content

Generates content (like a social media post) based on the user's digital twin, using the stored 'post' system prompt and instructions.

**Endpoint:** `POST /chat/{userId}/generate-content`

**Path Parameters**

-   `userId`: The ID of the user for whom to generate content.

**Request Body**

```json
{
  "contentType": "string ('post' or 'chat')", // REQUIRED: Specifies the generation type.
  "mainGoal": "string",             // REQUIRED: The main topic or goal for the content.
  "temperature": "number (optional)"  // Optional: Generation temperature (0-1), default 0.7.
}
```

**Response (200 OK)**

```json
{
  "content": "string",             // The generated content.
  "contentType": "string",         // The contentType provided in the request ('post' or 'chat').
  "timestamp": "string (ISO 8601)" // Timestamp of the generation.
}
```

**Response (Error)**

-   `400 Bad Request`: Missing or invalid `userId`, `contentType`, or `mainGoal`.
-   `500 Internal Server Error`: Failed to generate content or retrieve prompts.

**Example Request Body**

```json
{
  "contentType": "post",
  "mainGoal": "Write a short update about the latest AI trends.",
  "temperature": 0.8
}
```

**Example Curl Request**

```bash
curl -X POST \
  http://localhost:3000/api/chat/{userId}/generate-content \
  -H 'Content-Type: application/json' \
  -d '{
    "contentType": "post",
    "mainGoal": "Discuss the impact of quantum computing on AI.",
    "temperature": 0.7
  }'
```

## Conversation

### Get Response

Engages in a conversation with the digital twin.

**Endpoint:** `POST /chat/{userId}/response`

**Parameters:**
- `userId` (path): The ID of the user

**Request Body:**
```json
{
  "message": "string"
}
```

**Response: (200 OK)**
```json
{
  "response": "string",
  "userId": "string",
  "timestamp": "ISO datetime string"
}
```

## Error Responses

All API endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Error description"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Complete Usage Examples

The following examples demonstrate key API calls for a complete workflow:

### 1. Create a User

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user_123"}'
```

### 2. Upload Content

```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "userId=test_user_123" \
  -F "sourcePlatform=twitter" \
  -F "sourceMedium=tweet" \
  -F "file=@./tests/examples/tweet_examples.txt"
```

### 3. Generate a Character Card

```bash
curl -X POST "http://localhost:3000/api/prompts/test_user_123/generate-character-card" \
  -H "Content-Type: application/json" \
  -d '{
    "assetIds": ["asset_id_here"]
  }'
```

### 4. Generate Content

```bash
curl -X POST "http://localhost:3000/api/chat/test_user_123/generate-content" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "post",
    "mainGoal": "Discuss the impact of quantum computing on AI.",
    "temperature": 0.7
  }'
```

### 5. Start a Conversation

```bash
curl -X POST "http://localhost:3000/api/chat/test_user_123/response" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about yourself"
  }'
``` 