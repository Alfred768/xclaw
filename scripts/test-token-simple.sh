#!/bin/bash
# Simple Token Test Script
# Usage: ./scripts/test-token-simple.sh <your-jwt-token>

SUPABASE_URL="https://zpeiuaojlprxdlakmnxg.supabase.co"
TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <your-jwt-token>"
    echo ""
    echo "To get your JWT token:"
    echo "1. Login to your app at http://localhost:5174"
    echo "2. Open browser DevTools (F12)"
    echo "3. Go to Application > Local Storage"
    echo "4. Find 'sb-zpeiuaojlprxdlakmnxg-auth-token' and copy the access_token"
    exit 1
fi

echo "=========================================="
echo "Testing Token APIs (BYPASS PAYMENT)"
echo "=========================================="
echo ""

# Test 1: Check token status
echo "Step 1: Checking token status..."
STATUS_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/functions/v1/yunwu-token-status" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"${TOKEN}\"}")

echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

# Test 2: Create test token (monthly)
echo "Step 2: Creating test token (monthly plan)..."
CREATE_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/functions/v1/test-token-create" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"${TOKEN}\", \"plan_id\": \"monthly\"}")

echo "$CREATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RESPONSE"
echo ""

# Check if token was created
API_KEY=$(echo "$CREATE_RESPONSE" | jq -r '.apiKey' 2>/dev/null)
if [ "$API_KEY" != "null" ] && [ -n "$API_KEY" ] && [ "$API_KEY" != "" ]; then
    echo "=========================================="
    echo "✅ Token created successfully!"
    echo "API Key: $API_KEY"
    echo "=========================================="
    echo ""

    # Verify token status again
    echo "Step 3: Verifying token status..."
    sleep 2
    VERIFY_RESPONSE=$(curl -s -X POST \
        "${SUPABASE_URL}/functions/v1/yunwu-token-status" \
        -H "Content-Type: application/json" \
        -d "{\"token\": \"${TOKEN}\"}")

    echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
else
    echo "=========================================="
    echo "❌ Token creation failed or returned no API key"
    echo "=========================================="
fi
