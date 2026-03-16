#!/bin/bash
# ZPay API Test Script
# Usage: ./test-zpay.sh <your-jwt-token>

# Configuration
SUPABASE_URL="https://zpeiuaojlprxdlakmnxg.supabase.co"
TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <your-jwt-token>"
    echo ""
    echo "To get your JWT token:"
    echo "1. Login to your app"
    echo "2. Open browser DevTools (F12)"
    echo "3. Go to Application > Local Storage"
    echo "4. Find 'supabase.auth.token' and copy the access_token"
    exit 1
fi

echo "=========================================="
echo "Testing ZPay Create Payment API"
echo "=========================================="
echo ""

# Test create payment
RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/functions/v1/zpay-create" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "amount": 0.01,
        "type": "alipay",
        "productName": "测试订单"
    }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract orderId if successful
ORDER_ID=$(echo "$RESPONSE" | jq -r '.orderId' 2>/dev/null)

if [ "$ORDER_ID" != "null" ] && [ -n "$ORDER_ID" ]; then
    echo "=========================================="
    echo "Payment URL generated successfully!"
    echo "Order ID: $ORDER_ID"
    echo "=========================================="
    echo ""
    echo "To test payment status:"
    echo "./test-zpay-status.sh ${TOKEN} ${ORDER_ID}"
fi
