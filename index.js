const express = require('express');
const path = require('path');
const Bot = require('./src/bot');
const logger = require('./src/logger');

// Initialize Express app for optional dashboard
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'dashboard')));
app.use(express.json());

let botInstance = null;
let currentQRCode = null;
let botStats = {
    messagesReceived: 0,
    messagesReplied: 0,
    startTime: null,
    isConnected: false,
    lastActivity: null
};

// Dashboard API endpoints
app.get('/api/status', (req, res) => {
    res.json({
        ...botStats,
        uptime: botStats.startTime ? Date.now() - botStats.startTime : 0
    });
});

app.get('/api/logs', (req, res) => {
    const logs = logger.getRecentLogs(20);
    res.json({ logs });
});

// QR Code endpoint for easier scanning
app.get('/qr', (req, res) => {
    if (currentQRCode) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp QR Code</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    .qr-container { margin: 20px auto; }
                    .instructions { max-width: 600px; margin: 0 auto; }
                </style>
            </head>
            <body>
                <h1>Scan QR Code to Connect WhatsApp</h1>
                <div class="instructions">
                    <p>1. Open WhatsApp on your phone</p>
                    <p>2. Go to Settings > Linked Devices</p>
                    <p>3. Tap "Link a Device"</p>
                    <p>4. Scan the QR code below</p>
                </div>
                <div class="qr-container">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentQRCode)}" alt="WhatsApp QR Code" />
                </div>
                <p><small>QR Code will refresh automatically when a new one is generated</small></p>
                <script>
                    setTimeout(() => location.reload(), 30000); // Refresh every 30 seconds
                </script>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp QR Code</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                </style>
            </head>
            <body>
                <h1>WhatsApp Bot Status</h1>
                <p>Bot is starting up or already connected. Check the main dashboard for status.</p>
                <a href="/">Go to Dashboard</a>
                <script>
                    setTimeout(() => location.reload(), 5000); // Refresh every 5 seconds
                </script>
            </body>
            </html>
        `);
    }
});

app.post('/api/restart', (req, res) => {
    try {
        if (botInstance) {
            botInstance.destroy();
        }
        initializeBot();
        res.json({ success: true, message: 'Bot restarted successfully' });
    } catch (error) {
        logger.error('Failed to restart bot:', error);
        res.status(500).json({ success: false, message: 'Failed to restart bot' });
    }
});

// Initialize WhatsApp bot
function initializeBot() {
    try {
        botInstance = new Bot();
        
        botInstance.on('qr_received', (qr) => {
            currentQRCode = qr;
            logger.info('QR code updated. Visit /qr to scan it easily');
        });

        botInstance.on('ready', () => {
            logger.info('WhatsApp bot is ready!');
            botStats.isConnected = true;
            botStats.startTime = Date.now();
            currentQRCode = null; // Clear QR code when connected
        });

        botInstance.on('message_received', () => {
            botStats.messagesReceived++;
            botStats.lastActivity = Date.now();
        });

        botInstance.on('message_replied', () => {
            botStats.messagesReplied++;
        });

        botInstance.on('disconnected', () => {
            logger.warn('WhatsApp bot disconnected');
            botStats.isConnected = false;
        });

        botInstance.initialize();
    } catch (error) {
        logger.error('Failed to initialize bot:', error);
        process.exit(1);
    }
}

// Start the application
async function start() {
    try {
        logger.info('Starting WhatsApp UserBot...');
        
        // Start Express server
        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Dashboard server running on port ${PORT}`);
        });

        // Initialize bot
        initializeBot();

        // Graceful shutdown
        process.on('SIGINT', () => {
            logger.info('Shutting down gracefully...');
            if (botInstance) {
                botInstance.destroy();
            }
            process.exit(0);
        });

    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

start();
