#!/bin/bash
# Token API Test Script
# Usage: ./test-token.sh <your-jwt-token> [monthly|yearly]

# Configuration
SUPABASE_URL="https://zpeiuaojlprxdlakmnxg.supabase.co"
TOKEN="$1"
PLAN="${2:-monthly}"

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <your-jwt-token> [monthly|yearly]"
    echo ""
    echo "To get your JWT token:"
    echo "1. Login to your app at http://localhost:5173"
    echo "2. Open browser DevTools (F12)"
    echo "3. Go to Application > Local Storage"
    echo "4. Find 'sb-zpeiuaojlprxdlakmnxg-auth-token' and copy the access_token"
    exit 1
fi

echo "=========================================="
echo "Testing Token Creation API (BYPASS PAYMENT)"
echo "Plan: $PLAN"
echo "=========================================="
echo ""

# Test create token
echo "Step 1: Creating token..."
CREATE_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/functions/v1/test-token-create" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"plan_id\": \"${PLAN}\"}")

echo "Create Token Response:"
echo "$CREATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RESPONSE"
echo ""

# Extract API key if successful
API_KEY=$(echo "$CREATE_RESPONSE" | jq -r '.apiKey' 2>/dev/null)

if [ "$API_KEY" != "null" ] && [ -n "$API_KEY" ] && [ "$API_KEY" != "" ]; then
    echo "=========================================="
    echo "✅ Token created successfully!"
    echo "API Key: $API_KEY"
    echo "=========================================="
    echo ""

    # Now test token status
    echo "Step 2: Querying token status..."
    sleep 2  # Wait a bit for the token to be fully registered

    STATUS_RESPONSE=$(curl -s -X GET \
        "${SUPABASE_URL}/functions/v1/yunwu-token-status" \
        -H "Authorization: Bearer ${TOKEN}")

    echo "Token Status Response:"
    echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
    echo ""

    # Verify the token
    HAS_TOKEN=$(echo "$STATUS_RESPONSE" | jq -r '.hasToken' 2>/dev/null)
    if [ "$HAS_TOKEN" = "true" ]; then
        echo "=========================================="
        echo "✅ Token verification PASSED!"
        echo "Token is properly associated with user"
        echo "=========================================="

        # Show token details
        echo ""
        echo "Token Details:"
        echo "$STATUS_RESPONSE" | jq '{
            apiKey: .apiKey,
            tier: .subscription.tier,
            endsAt: .subscription.endsAt,
            tokenName: .token.name,
            totalGranted: .token.total_granted,
            totalUsed: .token.total_used,
            totalAvailable: .token.total_available,
            expiresAt: .token.expires_at
        }' 2>/dev/null
    else
        echo "=========================================="
        echo "❌ Token verification FAILED!"
        echo "Token was created but not found in status check"
        echo "=========================================="
    fi
else
    echo "=========================================="
    echo "❌ Token creation FAILED!"
    echo "=========================================="
fi
