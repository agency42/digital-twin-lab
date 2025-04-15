# Digital Twin Lab Testing

This directory contains tests and test data for validating the Digital Twin Lab system's API endpoints and database-driven approach.

## Directory Structure

```
tests/
├── data/               # Test data files
│   ├── character_card.json      # Base character card template
│   └── test_character_card.json # Example character card with full personality profile
├── examples/          # Example content files
│   ├── linkedin_examples.txt    # Professional networking content examples
│   └── tweet_examples.txt       # Social media content examples
└── run_tests.sh       # Comprehensive API testing script
```

## Testing Approach

Our testing framework validates the entire API surface of Digital Twin Lab, with a focus on the database-driven approach. The tests ensure that:

1. **All API endpoints work correctly** - Every endpoint is tested individually 
2. **The database-driven architecture works** - Tests confirm that prompts are stored and retrieved from the database
3. **End-to-end workflows function properly** - Complete flows from user creation to content generation

## API Endpoints Tested

The test script validates the following API categories:

1. **User Management**
   - List all users (`GET /api/users`)
   - Create user (`POST /api/users`)
   - Get user (`GET /api/users/{userId}`)

2. **Asset Management**
   - Upload files (`POST /api/upload`)
   - Get all assets (`GET /api/assets/{userId}`)
   - Get asset content (`GET /api/assets/{userId}/{assetId}/content`)

3. **Character Card Management**
   - Generate character card (`POST /api/prompts/{userId}/generate-character-card`)
   - Get current character card (`GET /api/prompts/{userId}/current-character-card`)

4. **Content Generation**
   - Generate content (`POST /api/chat/{userId}/generate-content`)

5. **Conversation Management**
   - Get AI response (`POST /api/chat/{userId}/response`)

## Running Tests

To run the comprehensive API tests:

1. Ensure the Digital Twin Lab server is running:
   ```bash
   npm run dev
   ```

2. In a new terminal, run the test script:
   ```bash
   chmod +x tests/run_tests.sh
   ./tests/run_tests.sh
   ```

3. Review the test output. The script will:
   - Show detailed progress of each test
   - Report success/failure for each endpoint
   - Provide a summary of successful and failed tests
   - Exit with status code 0 if all tests pass, or 1 if any test fails

## Test Data

### Character Card Templates
- `character_card.json` - Base template showing required structure
- `test_character_card.json` - Complete example with personality traits, voice, etc.

### Content Examples
- `linkedin_examples.txt` - Professional posts for testing
- `tweet_examples.txt` - Social media content for testing

## Interpreting Test Results

The test script uses color coding:
- 🟢 Green: Successful tests
- 🔴 Red: Failed tests
- 🟡 Yellow: Section headers and important information

If a test fails, the script will:
1. Display the error response
2. Continue with remaining tests
3. Provide a summary of all failures at the end

## Troubleshooting Failed Tests

Common issues:
1. **Server not running** - Ensure the server is running on port 3000
2. **Database issues** - Reset the database with `node scripts/reset.js`
3. **API changes** - If endpoints change, update the test script accordingly
4. **Claude API key** - Ensure a valid API key is set in your `.env` file 

For detailed logs, check the server console output while running tests. 