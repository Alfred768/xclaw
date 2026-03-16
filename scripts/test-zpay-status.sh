#!/bin/bash
# ZPay Status Check Script
# Usage: ./test-zpay-status.sh <your-jwt-token> <order-id>

SUPABASE_URL="https://zpeiuaojlprxdlakmnxg.supabase.co"
TOKEN="$1"
ORDER_ID="$2"

if [ -z "$TOKEN" ] || [ -z "$ORDER_ID" ]; then
    echo "Usage: $0 <your-jwt-token> <order-id>"
    exit 1
fi

echo "=========================================="
echo "Checking Payment Status"
echo "Order ID: $ORDER_ID"
echo "=========================================="
echo ""

RESPONSE=$(curl -s -X GET \
    "${SUPABASE_URL}/functions/v1/zpay-status?order_id=${ORDER_ID}" \
    -H "Authorization: Bearer ${TOKEN}")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
