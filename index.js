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
        
        botInstance.on('ready', () => {
            logger.info('WhatsApp bot is ready!');
            botStats.isConnected = true;
            botStats.startTime = Date.now();
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
