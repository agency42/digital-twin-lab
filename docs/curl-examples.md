# API Testing with curl

This document provides examples of curl commands to test the different API endpoints of the Digital Twin Lab application.

## Prerequisites

- Make sure the server is running locally on port 3000
- Have curl installed on your system
- Replace `{userId}` with an actual user ID in all commands

## User Management

### Create a User

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "testuser@example.com"}'
```

### Get User Information

```bash
curl -X GET "http://localhost:3000/api/users/{userId}"
```

## Asset Management

### Upload a File

```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "userId={userId}" \
  -F "sourcePlatform=twitter" \
  -F "sourceMedium=tweet" \
  -F "file=@/path/to/your/file.txt"
```

### Get All Assets for a User

```bash
curl -X GET "http://localhost:3000/api/assets/{userId}"
```

### Get a Specific Asset

```bash
curl -X GET "http://localhost:3000/api/assets/{userId}/{assetId}"
```

### Delete an Asset

```bash
curl -X DELETE "http://localhost:3000/api/assets/{userId}/{assetId}"
```

## Character Card Management

### Generate a Character Card

```bash
curl -X POST "http://localhost:3000/api/cards" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{userId}",
    "name": "Professional Profile"
  }'
```

### Get All Cards for a User

```bash
curl -X GET "http://localhost:3000/api/cards/{userId}"
```

### Get a Specific Card

```bash
curl -X GET "http://localhost:3000/api/cards/{userId}/{cardId}"
```

### Delete a Card

```bash
curl -X DELETE "http://localhost:3000/api/cards/{userId}/{cardId}"
```

## Content Generation

### Generate Content

```bash
curl -X POST "http://localhost:3000/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{userId}",
    "cardId": "{cardId}",
    "platform": "twitter",
    "topic": "technology trends"
  }'
```

### Get All Generated Content for a User

```bash
curl -X GET "http://localhost:3000/api/generate/{userId}"
```

### Get Specific Generated Content

```bash
curl -X GET "http://localhost:3000/api/generate/{userId}/{contentId}"
```

## Conversation Management

### Create or Continue a Conversation

```bash
curl -X POST "http://localhost:3000/api/conversations" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{userId}",
    "cardId": "{cardId}", 
    "message": "Hello, how are you today?",
    "conversationId": null
  }'
```

To continue an existing conversation, replace `null` with the actual `conversationId`.

### Get All Conversations for a User

```bash
curl -X GET "http://localhost:3000/api/conversations/{userId}"
```

### Get a Specific Conversation with Messages

```bash
curl -X GET "http://localhost:3000/api/conversations/{userId}/{conversationId}"
```

## Testing Script

Here's a complete testing script that goes through the entire flow:

```bash
#!/bin/bash

# Create a user
USER_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "testuser@example.com"}')

USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created user with ID: $USER_ID"

# Upload a file
UPLOAD_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/upload" \
  -F "userId=$USER_ID" \
  -F "sourcePlatform=twitter" \
  -F "sourceMedium=tweet" \
  -F "file=@./test_data/tweet_examples.txt")

ASSET_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Uploaded file with asset ID: $ASSET_ID"

# Generate a character card
CARD_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/cards" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "name": "Professional Profile"
  }')

CARD_ID=$(echo $CARD_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Generated card with ID: $CARD_ID"

# Generate content
CONTENT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "cardId": "'$CARD_ID'",
    "platform": "twitter",
    "topic": "technology trends"
  }')

CONTENT_ID=$(echo $CONTENT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Generated content with ID: $CONTENT_ID"

# Start a conversation
CONV_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/conversations" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "cardId": "'$CARD_ID'", 
    "message": "Hello, how are you today?",
    "conversationId": null
  }')

CONV_ID=$(echo $CONV_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Started conversation with ID: $CONV_ID"

# Continue the conversation
curl -s -X POST "http://localhost:3000/api/conversations" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "cardId": "'$CARD_ID'", 
    "message": "Tell me more about your expertise",
    "conversationId": "'$CONV_ID'"
  }'

echo "Test complete!"
```

Save this as `test_api.sh`, make it executable with `chmod +x test_api.sh`, and run it when your server is running.

## Common Issues and Troubleshooting

- **401 Unauthorized**: Ensure you're providing the correct user ID.
- **404 Not Found**: Check if the resource ID (asset, card, etc.) is correct.
- **500 Internal Server Error**: 
  - Check the server logs for more details.
  - Ensure the database is initialized correctly.
  - Verify Claude API keys are set in environment variables.
- **Empty Response**: Make sure the server is running and the endpoint is correct. 