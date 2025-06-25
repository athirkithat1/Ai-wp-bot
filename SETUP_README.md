# WhatsApp Bot - Quick Setup Guide

## Step 1: Add Your Owner Number
1. Click "Secrets" tab (🔒 lock icon) in left sidebar
2. Click "New Secret"
3. Key: `OWNER_NUMBER`
4. Value: Your WhatsApp number without + (example: 919876543210)
5. Click "Add Secret"

## Step 2: Connect WhatsApp
1. Make sure bot is running (green status in console)
2. Click "View QR Code" in dashboard
3. Open WhatsApp → Settings → Linked Devices → Link Device
4. Scan the QR code

## Step 3: Test Admin Commands
Once connected with your owner number, reply to any user message with:
- `/approve 1day` - Approve user for 1 day
- `/approve forever` - Approve permanently
- `/approve stop` - Remove approval

## User Commands
- `/start` or `/ai` - Start AI chat
- `/stop` - Stop AI chat
- `/help` - Show help

## Switch WhatsApp Account
Use "Change WhatsApp Account" button in dashboard to connect different phone.

## Troubleshooting
- If not recognized as owner: Check OWNER_NUMBER matches your exact number
- If QR won't scan: Try "Change WhatsApp Account" button first
- If bot stops: Restart the workflow

Your bot is ready to use once QR code is scanned!