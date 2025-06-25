# WhatsApp Bot Setup Guide

## Quick Start Instructions

### 1. Set Your Owner Number
1. Click on "Secrets" tab (lock icon) in Replit sidebar
2. Click "New Secret"
3. Key: `OWNER_NUMBER`
4. Value: Your WhatsApp number without + symbol (e.g., 919876543210)
5. Click "Add Secret"
6. Restart the bot workflow

### 2. Connect Your WhatsApp
1. Make sure bot is running (check console)
2. Click "View QR Code" button in dashboard
3. Open WhatsApp on your phone
4. Go to Settings > Linked Devices > Link a Device
5. Scan the QR code

## 2. Connecting Bot to Another WhatsApp Number

### Method 1: Using a Different Phone
1. Stop the current bot (click stop in console)
2. Delete the `.wwebjs_auth` folder to clear current session
3. Restart the bot
4. Use the other phone to scan the new QR code

### Method 2: Using WhatsApp Business (Recommended)
1. Install WhatsApp Business on the phone you want to use for the bot
2. Set up WhatsApp Business with a different number
3. Clear the bot session and scan QR with WhatsApp Business

## 3. Admin Commands (Owner Only)

Once your number is set as owner, you can use these commands:

### Approve Users:
- `/approve 1day` - Reply to a message to approve that user for 1 day
- `/approve 5message` - Approve for 5 messages only
- `/approve 1hour` - Approve for 1 hour
- `/approve forever` - Approve permanently
- `/approve stop` - Remove approval
- `/approve 1week +919876543210` - Approve specific number

### Time Units Supported:
- `minute`, `hour`, `day`, `week`, `month`, `year`
- `message` (for message count limit)
- `forever` (permanent approval)
- `stop` (remove approval)

## 4. How It Works

### For Unapproved Users:
- See welcome message with contact details on every message
- Can use `/start` for AI chat
- Cannot chat directly with owner

### For Approved Users:
- Can chat freely without welcome messages
- Messages forwarded directly to owner
- Still can use `/start` for AI chat

## 5. Troubleshooting

### If Bot Doesn't Recognize You as Owner:
1. Check that OWNER_NUMBER is set correctly in Secrets
2. Make sure you're messaging from the exact number you set
3. Restart the bot after adding the secret

### If QR Code Doesn't Work:
1. Try refreshing the QR page: `/qr`
2. Clear browser cache
3. Delete `.wwebjs_auth` folder and restart

### If Bot Stops Responding:
1. Check the console logs for errors
2. Restart the workflow
3. Check if WhatsApp Web session expired