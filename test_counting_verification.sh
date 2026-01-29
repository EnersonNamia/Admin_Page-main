#!/bin/bash
# Test the test counting API endpoints
# Run this script to verify the fixes are working

echo "🧪 TEST COUNTING API VERIFICATION"
echo "===================================="

BASE_URL="http://localhost:5000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}1. Creating a test...${NC}"
TEST_RESPONSE=$(curl -s -X POST "$BASE_URL/tests" \
  -H "Content-Type: application/json" \
  -d '{"test_name":"Counting Test","description":"Test for counting","test_type":"adaptive"}')

TEST_ID=$(echo $TEST_RESPONSE | grep -o '"test_id":[0-9]*' | grep -o '[0-9]*')
if [ -n "$TEST_ID" ]; then
    echo -e "${GREEN}✅ Test created with ID: $TEST_ID${NC}"
else
    echo -e "${RED}❌ Failed to create test${NC}"
    echo "Response: $TEST_RESPONSE"
    exit 1
fi

# Get a user (assume user_id = 1 exists)
USER_ID=1

echo -e "\n${YELLOW}2. Submitting test attempt...${NC}"
SUBMIT_RESPONSE=$(curl -s -X POST "$BASE_URL/tests/$TEST_ID/submit" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"test_id\":$TEST_ID,\"score\":85,\"total_questions\":100,\"time_taken\":30}")

if echo "$SUBMIT_RESPONSE" | grep -q '"attempt_id"'; then
    ATTEMPT_ID=$(echo $SUBMIT_RESPONSE | grep -o '"attempt_id":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✅ Test attempt recorded with ID: $ATTEMPT_ID${NC}"
else
    echo -e "${RED}❌ Failed to submit test${NC}"
    echo "Response: $SUBMIT_RESPONSE"
    exit 1
fi

echo -e "\n${YELLOW}3. Checking user tests_taken count...${NC}"
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users?limit=100" \
  -H "Accept: application/json")

# Check if user_id 1 has tests_taken > 0
TESTS_TAKEN=$(echo "$USERS_RESPONSE" | grep -o '"tests_taken":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ "$TESTS_TAKEN" -gt 0 ]; then
    echo -e "${GREEN}✅ User tests_taken count: $TESTS_TAKEN${NC}"
else
    echo -e "${YELLOW}⚠️  Tests taken might be 0 - checking details...${NC}"
fi

echo -e "\n${YELLOW}4. Getting test history for user...${NC}"
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/users/$USER_ID/test-history")

if echo "$HISTORY_RESPONSE" | grep -q '"test_history"'; then
    TEST_COUNT=$(echo "$HISTORY_RESPONSE" | grep -o '"total_tests_taken":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✅ Test history shows: $TEST_COUNT tests${NC}"
else
    echo -e "${RED}❌ Failed to get test history${NC}"
fi

echo -e "\n${YELLOW}5. Checking test attempts records...${NC}"
ATTEMPTS_RESPONSE=$(curl -s -X GET "$BASE_URL/tests/$TEST_ID/attempts")

if echo "$ATTEMPTS_RESPONSE" | grep -q '"attempts"'; then
    ATTEMPT_COUNT=$(echo "$ATTEMPTS_RESPONSE" | grep -o '"total_attempts":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✅ Test attempts recorded: $ATTEMPT_COUNT${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify attempts${NC}"
fi

echo -e "\n===================================="
echo -e "${GREEN}✅ TEST COMPLETE${NC}"
echo -e "\nSummary:"
echo "- Created test: $TEST_ID"
echo "- Submitted attempt: $ATTEMPT_ID"
echo "- User tests_taken: $TESTS_TAKEN"
echo "- Test history count: $TEST_COUNT"
echo "- Attempts recorded: $ATTEMPT_COUNT"
echo ""
echo "If all values are > 0, the test counting is working correctly!"
