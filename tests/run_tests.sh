#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Store test IDs
USER_ID=""
ASSET_ID=""
CARD_ID=""

# Base URL
BASE_URL="http://localhost:3000/api"

# Function to run tests
run_test() {
    DESCRIPTION=$1
    CMD=$2
    EXPECTED_STATUS=$3
    
    echo -e "\n${YELLOW}Testing: ${DESCRIPTION}${NC}"
    echo "Command: $CMD"
    
    # Run the command and get the status code
    HTTP_RESPONSE=$(eval "$CMD -w \"%{http_code}\" -o response.txt")
    
    # Increment the total test counter
    TOTAL=$((TOTAL+1))
    
    # Check if the status code matches the expected status
    if [[ $HTTP_RESPONSE == $EXPECTED_STATUS ]]; then
        echo -e "${GREEN}✅ Status $HTTP_RESPONSE matches expected $EXPECTED_STATUS${NC}"
        cat response.txt | jq '.' 2>/dev/null || cat response.txt
        PASSED=$((PASSED+1))
        # Return the response content for possible extraction of IDs
        cat response.txt
    else
        echo -e "${RED}❌ Status $HTTP_RESPONSE does not match expected $EXPECTED_STATUS${NC}"
        cat response.txt | jq '.' 2>/dev/null || cat response.txt
        FAILED=$((FAILED+1))
        # Return empty
        echo ""
    fi
}

# Section header
section() {
    echo -e "\n${YELLOW}========== $1 ==========${NC}"
}

# Clean up any previous response file
rm -f response.txt

# Start the tests
echo -e "${YELLOW}Starting API Tests for Digital Twin Lab${NC}"
echo -e "${YELLOW}===================================${NC}"

# 1. USER MANAGEMENT TESTS
section "USER MANAGEMENT"

# 1.0 Get All Users
run_test "Get All Users" "curl -s -X GET \"$BASE_URL/users\"" "200"

# 1.1 Create User
TIMESTAMP=$(date +%s)
USER_ID="testuser_${TIMESTAMP}"
RESPONSE=$(run_test "Create User" "curl -s -X POST \"$BASE_URL/users\" -H \"Content-Type: application/json\" -d '{\"userId\": \"$USER_ID\"}'" "201")

# 1.2 Get User
run_test "Get User" "curl -s -X GET \"$BASE_URL/users/$USER_ID\"" "200"

# 2. ASSET MANAGEMENT TESTS
section "ASSET MANAGEMENT"

# 2.1 Upload File
ASSET_RESPONSE=$(run_test "Upload File" "curl -s -X POST \"$BASE_URL/upload\" -F \"userId=$USER_ID\" -F \"sourcePlatform=twitter\" -F \"sourceMedium=tweet\" -F \"file=@tests/examples/tweet_examples.txt\"" "200")

# Extract asset ID from response
ASSET_ID=$(echo "$ASSET_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [[ ! -z "$ASSET_ID" ]]; then
    echo -e "Extracted Asset ID: $ASSET_ID"
fi

# 2.2 Get All Assets
run_test "Get All Assets" "curl -s -X GET \"$BASE_URL/assets/$USER_ID\"" "200"

# 2.3 Get Asset Content
if [[ ! -z "$ASSET_ID" ]]; then
    run_test "Get Asset Content" "curl -s -X GET \"$BASE_URL/assets/$USER_ID/$ASSET_ID/content\"" "200"
else
    echo -e "${RED}Skipping asset content retrieval as no asset ID was extracted${NC}"
    FAILED=$((FAILED+1))
    TOTAL=$((TOTAL+1))
fi

# 3. CHARACTER CARD MANAGEMENT TESTS
section "CHARACTER CARD MANAGEMENT"

# 3.1 Generate Character Card
if [[ ! -z "$ASSET_ID" ]]; then
    CARD_RESPONSE=$(run_test "Generate Character Card" "curl -s -X POST \"$BASE_URL/prompts/$USER_ID/generate-character-card\" -H \"Content-Type: application/json\" -d '{\"assetIds\": [\"$ASSET_ID\"]}'" "201")
    
    # Extract card ID
    CARD_ID=$(echo "$CARD_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    if [[ ! -z "$CARD_ID" ]]; then
        echo -e "Extracted Card ID: $CARD_ID"
    fi
else
    echo -e "${RED}Skipping character card generation as no asset ID was extracted${NC}"
    FAILED=$((FAILED+1))
    TOTAL=$((TOTAL+1))
fi

# 3.2 Get Current Character Card
run_test "Get Current Character Card" "curl -s -X GET \"$BASE_URL/prompts/$USER_ID/current-character-card\"" "200"

# 4. CONTENT GENERATION TESTS
section "CONTENT GENERATION"

# 4.1 Generate Content
run_test "Generate Content" "curl -s -X POST \"$BASE_URL/chat/$USER_ID/generate-content\" -H \"Content-Type: application/json\" -d '{\"contentType\": \"post\", \"mainGoal\": \"AI in healthcare\"}'" "200"

# 5. CONVERSATION TESTS
section "CONVERSATION"

# 5.1 Get Chat Response
run_test "Get Chat Response" "curl -s -X POST \"$BASE_URL/chat/$USER_ID/response\" -H \"Content-Type: application/json\" -d '{\"message\": \"Tell me about yourself\"}'" "200"

# Summary
section "TEST SUMMARY"
echo -e "Total tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

# Cleanup
rm -f response.txt

# Exit with appropriate status code
if [[ $FAILED -gt 0 ]]; then
    exit 1
else
    exit 0
fi 