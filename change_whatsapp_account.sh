#!/bin/bash

echo "🔄 Changing WhatsApp Account for Bot"
echo "=================================="

# Stop any running processes
echo "📱 Stopping current bot session..."
pkill -f "node index.js" 2>/dev/null || true

# Remove existing WhatsApp session
echo "🗑️  Clearing WhatsApp session data..."
rm -rf .wwebjs_auth 2>/dev/null || true
rm -rf .wwebjs_cache 2>/dev/null || true

echo "✅ Session cleared successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Restart the bot workflow"
echo "2. Go to /qr endpoint to get new QR code"
echo "3. Scan QR code with the NEW WhatsApp account"
echo "4. Set OWNER_NUMBER secret to the new account number"
echo ""
echo "🔗 QR Code URL: https://${REPL_SLUG}.${REPL_OWNER}.repl.co/qr"