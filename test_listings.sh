#!/bin/bash

# Test script to verify listings are accessible
BASE_URL="http://localhost:8082/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Testing Listings Visibility"
echo "=========================================="
echo ""

# Test 1: Public access (no auth)
echo -e "${YELLOW}Test 1: Public Access (No Auth)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/listings?status=active&limit=5")
if echo "$RESPONSE" | grep -q "items"; then
    COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('items',[])))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ Public access works - Found $COUNT listings${NC}"
else
    echo -e "${RED}✗ Public access failed${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 2: With auth token
echo -e "${YELLOW}Test 2: With Auth Token${NC}"
TOKEN=$(curl -s -X POST "$BASE_URL/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d '{"email":"devenjaimin.desai@sjsu.edu","password":"Deven@12345"}' \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Failed to get auth token${NC}"
else
    echo "Token obtained: ${TOKEN:0:20}..."
    RESPONSE=$(curl -s -X GET "$BASE_URL/listings?status=active&limit=5" \
      -H "Authorization: Bearer $TOKEN")
    if echo "$RESPONSE" | grep -q "items"; then
        COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('items',[])))" 2>/dev/null || echo "0")
        TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('total',0))" 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ Authenticated access works - Found $COUNT items (Total: $TOTAL)${NC}"
    else
        echo -e "${RED}✗ Authenticated access failed${NC}"
        echo "Response: $RESPONSE"
    fi
fi
echo ""

# Test 3: Check database directly
echo -e "${YELLOW}Test 3: Database Check${NC}"
DB_COUNT=$(cd /Users/devendesai/202/Integration_final/team-project-cmpe202-03-fall2025-campushub/backend && \
  docker compose -f build/docker-compose.dev.yml exec -T db psql -U postgres -d campus -t -c \
  "SELECT COUNT(*) FROM listings WHERE status = 'active';" 2>/dev/null | tr -d ' \n\r')
echo "Active listings in database: $DB_COUNT"
echo ""

echo "=========================================="
echo -e "${GREEN}Test Complete!${NC}"
echo "=========================================="
echo ""
echo "If tests pass but frontend doesn't show listings:"
echo "1. Check browser console for errors"
echo "2. Verify API_BASE_URL in frontend is http://localhost:8082/v1"
echo "3. Check Network tab in browser DevTools"
echo "4. Verify token is stored in localStorage (Application tab)"

