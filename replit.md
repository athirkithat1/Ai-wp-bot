# WhatsApp UserBot - Replit Configuration

## Overview

A WhatsApp automation bot built with Node.js that can respond to messages using natural language processing, rate limiting, and a web dashboard for monitoring. The bot uses the whatsapp-web.js library to interface with WhatsApp Web and provides automated responses based on configurable patterns and NLP analysis.

## System Architecture

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js web server
- **WhatsApp Integration**: whatsapp-web.js library with Puppeteer for browser automation
- **Authentication**: LocalAuth strategy for persistent WhatsApp sessions
- **Processing**: Event-driven architecture with EventEmitter patterns

### Frontend Architecture
- **Dashboard**: Static HTML/CSS/JS with Bootstrap 5 and Chart.js
- **Real-time Updates**: Polling-based API calls for status and statistics
- **Visualization**: Charts for message activity and response metrics

### Core Components
1. **Bot Engine** (`src/bot.js`): Main WhatsApp client wrapper with event handling
2. **Message Handler** (`src/messageHandler.js`): Processes incoming messages and generates responses
3. **NLP Engine** (`src/nlp.js`): Pattern matching and sentiment analysis for message understanding
4. **Rate Limiter** (`src/rateLimiter.js`): Prevents spam and manages message frequency
5. **Logger** (`src/logger.js`): Centralized logging with file output and memory storage
6. **Web Dashboard** (`dashboard/`): Browser-based monitoring interface

## Key Components

### Bot Configuration
- Configurable responses via JSON files (`config/responses.json`, `config/settings.json`)
- Environment-based settings for deployment flexibility
- Business hours, rate limiting, and security controls

### Message Processing Pipeline
1. Message reception and validation
2. Rate limiting check
3. NLP analysis for intent detection
4. Response generation based on patterns
5. Typing indicator simulation
6. Message delivery with delay randomization

### Authentication & Session Management
- Local authentication strategy with persistent session storage
- QR code generation for initial setup
- Automatic session restoration on restart

## Data Flow

1. **Incoming Messages**: WhatsApp Web → whatsapp-web.js → Bot Event Handler
2. **Processing**: Message Handler → NLP Analysis → Response Selection
3. **Rate Limiting**: Check user history and apply throttling rules
4. **Response**: Generate reply → Apply delays → Send via WhatsApp client
5. **Logging**: All activities logged to files and memory for dashboard
6. **Dashboard**: API endpoints serve real-time statistics and logs

## External Dependencies

### Core Dependencies
- `whatsapp-web.js`: WhatsApp Web API wrapper
- `express`: Web server for dashboard API
- `qrcode-terminal`: QR code display for authentication

### System Requirements
- Puppeteer-compatible environment (handled by Replit)
- Persistent storage for WhatsApp session data
- Network access for WhatsApp Web servers

### Optional Integrations
- Database support (configured but not implemented)
- Webhook endpoints for external notifications
- Email/SMS notifications for admin alerts

## Deployment Strategy

### Replit Configuration
- Node.js 20 module with stable Nix channel
- Automatic dependency installation via package.json
- Express server runs on port 5000 with health monitoring
- Session data persists in `.wwebjs_auth` directory

### Environment Configuration
- Development and production modes supported
- Configurable logging levels and business hours
- Rate limiting and security settings via environment variables

### Monitoring & Management
- Web dashboard accessible at root URL
- API endpoints for status, logs, and bot restart
- File-based logging with rotation capabilities

## Changelog

- June 25, 2025: Initial setup and configuration
- June 25, 2025: Fixed QR code display issues with smaller terminal output and web endpoint
- June 25, 2025: Enhanced browser configuration and authentication error handling
- June 25, 2025: Implemented advanced AI chat system with owner status display and interactive buttons
- June 25, 2025: Added comprehensive admin approval system with time-based permissions and message limits

## Troubleshooting

### WhatsApp Connection Issues
If you get "Couldn't connect device" error when scanning QR code:

1. **Clear WhatsApp session data**: Delete the `.wwebjs_auth` folder and restart
2. **Try different network**: Some networks block WhatsApp Web connections
3. **Update WhatsApp**: Ensure your phone has the latest WhatsApp version
4. **Check phone connection**: Make sure your phone has stable internet
5. **Restart bot**: Use the restart button in dashboard or restart the workflow
6. **Try multiple times**: Sometimes it takes 2-3 attempts to connect successfully

## User Preferences

Preferred communication style: Simple, everyday language.