#!/bin/bash

# Integration Test Script for CampusHub Backend and Frontend
# This script tests the API endpoints and verifies integration

BASE_URL="http://localhost:8082/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "CampusHub Integration Test Script"
echo "=========================================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/healthz)
if [ "$HEALTH" == "200" ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running (expected 200, got $HEALTH)${NC}"
    echo "Please start the backend server first!"
    exit 1
fi
echo ""

# Test 2: Sign Up
echo -e "${YELLOW}Test 2: User Sign Up${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/sign-up" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@sjsu.edu",
    "role": "buyer",
    "password": "TestPass123!"
  }')
if echo "$SIGNUP_RESPONSE" | grep -q "data"; then
    echo -e "${GREEN}✓ Sign up successful${NC}"
    USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  User ID: $USER_ID"
else
    echo -e "${RED}✗ Sign up failed${NC}"
    echo "  Response: $SIGNUP_RESPONSE"
fi
echo ""

# Test 3: Sign In
echo -e "${YELLOW}Test 3: User Sign In${NC}"
SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@sjsu.edu",
    "password": "TestPass123!"
  }')
if echo "$SIGNIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Sign in successful${NC}"
    TOKEN=$(echo "$SIGNIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "  Token obtained: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ Sign in failed${NC}"
    echo "  Response: $SIGNIN_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Create Listing
echo -e "${YELLOW}Test 4: Create Listing${NC}"
LISTING_RESPONSE=$(curl -s -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sellerId": "'"$USER_ID"'",
    "title": "Test Textbook",
    "description": "A test listing for integration testing",
    "category": "Textbooks",
    "price": 25.50,
    "condition": "Good"
  }')
if echo "$LISTING_RESPONSE" | grep -q "data"; then
    echo -e "${GREEN}✓ Listing created successfully${NC}"
    LISTING_ID=$(echo "$LISTING_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Listing ID: $LISTING_ID"
else
    echo -e "${RED}✗ Listing creation failed${NC}"
    echo "  Response: $LISTING_RESPONSE"
fi
echo ""

# Test 5: Get Listing
echo -e "${YELLOW}Test 5: Get Listing${NC}"
GET_LISTING=$(curl -s -X GET "$BASE_URL/listings/$LISTING_ID" \
  -H "Authorization: Bearer $TOKEN")
if echo "$GET_LISTING" | grep -q "data"; then
    echo -e "${GREEN}✓ Get listing successful${NC}"
else
    echo -e "${RED}✗ Get listing failed${NC}"
    echo "  Response: $GET_LISTING"
fi
echo ""

# Test 6: List Listings
echo -e "${YELLOW}Test 6: List Listings${NC}"
LIST_LISTINGS=$(curl -s -X GET "$BASE_URL/listings?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN")
if echo "$LIST_LISTINGS" | grep -q "data"; then
    echo -e "${GREEN}✓ List listings successful${NC}"
else
    echo -e "${RED}✗ List listings failed${NC}"
    echo "  Response: $LIST_LISTINGS"
fi
echo ""

# Test 7: Create Report
echo -e "${YELLOW}Test 7: Create Report${NC}"
REPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "listingId": "'"$LISTING_ID"'",
    "reporterId": "'"$USER_ID"'",
    "reason": "Test report for integration testing"
  }')
if echo "$REPORT_RESPONSE" | grep -q "data"; then
    echo -e "${GREEN}✓ Report created successfully${NC}"
    REPORT_ID=$(echo "$REPORT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Report ID: $REPORT_ID"
else
    echo -e "${RED}✗ Report creation failed${NC}"
    echo "  Response: $REPORT_RESPONSE"
fi
echo ""

# Test 8: Admin - Sign In as Admin
echo -e "${YELLOW}Test 8: Admin Sign In${NC}"
ADMIN_SIGNIN=$(curl -s -X POST "$BASE_URL/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sjsu.edu",
    "password": "AdminPass123!"
  }')
if echo "$ADMIN_SIGNIN" | grep -q "token"; then
    ADMIN_TOKEN=$(echo "$ADMIN_SIGNIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Admin sign in successful${NC}"
    echo "  Using admin token for admin tests..."
else
    echo -e "${YELLOW}⚠ Admin sign in failed (may need to create admin user)${NC}"
    ADMIN_TOKEN=$TOKEN  # Fallback to regular token
fi
echo ""

# Test 9: Admin - Get Metrics
echo -e "${YELLOW}Test 9: Admin Get Metrics${NC}"
METRICS=$(curl -s -X GET "$BASE_URL/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$METRICS" | grep -q "data"; then
    echo -e "${GREEN}✓ Get metrics successful${NC}"
    echo "$METRICS" | grep -o '"listings":[0-9]*' | head -1
    echo "$METRICS" | grep -o '"users":[0-9]*' | head -1
else
    echo -e "${RED}✗ Get metrics failed${NC}"
    echo "  Response: $METRICS"
fi
echo ""

# Test 10: Admin - List Reports
echo -e "${YELLOW}Test 10: Admin List Reports${NC}"
ADMIN_REPORTS=$(curl -s -X GET "$BASE_URL/reports?status=open" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$ADMIN_REPORTS" | grep -q "data"; then
    echo -e "${GREEN}✓ List reports successful${NC}"
else
    echo -e "${RED}✗ List reports failed${NC}"
    echo "  Response: $ADMIN_REPORTS"
fi
echo ""

# Test 11: Admin - List Users
echo -e "${YELLOW}Test 11: Admin List Users${NC}"
ADMIN_USERS=$(curl -s -X GET "$BASE_URL/admin/users?limit=10&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$ADMIN_USERS" | grep -q "data"; then
    echo -e "${GREEN}✓ List users successful${NC}"
else
    echo -e "${RED}✗ List users failed${NC}"
    echo "  Response: $ADMIN_USERS"
fi
echo ""

# Test 12: Admin - Update Report Status
if [ ! -z "$REPORT_ID" ]; then
    echo -e "${YELLOW}Test 12: Admin Update Report Status${NC}"
    UPDATE_STATUS=$(curl -s -X PATCH "$BASE_URL/reports/$REPORT_ID/status" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{
        "status": "resolved"
      }')
    if echo "$UPDATE_STATUS" | grep -q "data"; then
        echo -e "${GREEN}✓ Update report status successful${NC}"
    else
        echo -e "${RED}✗ Update report status failed${NC}"
        echo "  Response: $UPDATE_STATUS"
    fi
    echo ""
fi

echo "=========================================="
echo -e "${GREEN}Integration Tests Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the frontend: cd frontend && npm run dev"
echo "2. Open http://localhost:5137 in your browser"
echo "3. Test the UI integration with the backend"

