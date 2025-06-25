# WhatsApp Bot Setup Guide

## 1. Adding Your Owner Number

### Step 1: Set Your WhatsApp Number as Owner
1. Go to the "Secrets" tab in your Replit project (lock icon on the left)
2. Click "New Secret" 
3. Add this secret:
   - Key: `OWNER_NUMBER`
   - Value: Your WhatsApp number WITHOUT the + symbol
   - Example: If your number is +919876543210, enter: `919876543210`

### Step 2: Restart the Bot
After adding the secret, restart the workflow by clicking the restart button in the console.

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