const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');
const { execSync } = require('child_process');
const MessageHandler = require('./messageHandler');
const logger = require('./logger');
const RateLimiter = require('./rateLimiter');

class Bot extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.messageHandler = new MessageHandler();
        this.rateLimiter = new RateLimiter();
        this.isReady = false;
    }

    initialize() {
        try {
            // Get the dynamic Chromium path
            let chromiumPath;
            try {
                chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();
            } catch (error) {
                chromiumPath = null;
                logger.warn('Chromium not found, using default Puppeteer browser');
            }

            // Initialize WhatsApp client with local authentication
            const puppeteerConfig = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--disable-component-extensions-with-background-pages'
                ]
            };

            // Only set executablePath if Chromium is found
            if (chromiumPath) {
                puppeteerConfig.executablePath = chromiumPath;
                logger.info(`Using Chromium at: ${chromiumPath}`);
            }

            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: "whatsapp-userbot"
                }),
                puppeteer: puppeteerConfig
            });

            this.setupEventHandlers();
            this.client.initialize();

        } catch (error) {
            logger.error('Failed to initialize WhatsApp client:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        // QR Code event
        this.client.on('qr', (qr) => {
            logger.info('QR Code received, scan with your phone:');
            this.emit('qr_received', qr);
            qrcode.generate(qr, { small: true });
            logger.info('Visit /qr in your browser for an easier-to-scan QR code');
        });

        // Ready event
        this.client.on('ready', () => {
            logger.info('WhatsApp client is ready!');
            this.isReady = true;
            this.emit('ready');
        });

        // Authentication events
        this.client.on('authenticated', () => {
            logger.info('WhatsApp client authenticated successfully');
        });

        this.client.on('auth_failure', (msg) => {
            logger.error('Authentication failed:', msg);
        });

        // Message event
        this.client.on('message', async (message) => {
            try {
                await this.handleIncomingMessage(message);
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        });

        // Disconnection event
        this.client.on('disconnected', (reason) => {
            logger.warn('WhatsApp client disconnected:', reason);
            this.isReady = false;
            this.emit('disconnected', reason);
        });

        // Error handling
        this.client.on('error', (error) => {
            logger.error('WhatsApp client error:', error);
        });
    }

    async handleIncomingMessage(message) {
        try {
            // Skip messages from status broadcasts and groups (optional)
            if (message.from === 'status@broadcast') {
                return;
            }

            // Skip own messages
            if (message.fromMe) {
                return;
            }

            this.emit('message_received');
            
            logger.info(`Received message from ${message.from}: ${message.body}`);

            // Check rate limiting
            if (!this.rateLimiter.canSendMessage(message.from)) {
                logger.warn(`Rate limited message from ${message.from}`);
                return;
            }

            // Process message and get response
            const response = await this.messageHandler.processMessage(message);
            
            if (response) {
                await this.sendResponse(message, response);
            }

        } catch (error) {
            logger.error('Error in handleIncomingMessage:', error);
        }
    }

    async sendResponse(originalMessage, response) {
        try {
            // Add typing indicator simulation
            await this.simulateTyping(originalMessage.from);
            
            // Send the response
            await this.client.sendMessage(originalMessage.from, response);
            
            this.emit('message_replied');
            logger.info(`Sent response to ${originalMessage.from}: ${response}`);

            // Update rate limiter
            this.rateLimiter.recordMessage(originalMessage.from);

        } catch (error) {
            logger.error('Failed to send response:', error);
            throw error;
        }
    }

    async simulateTyping(chatId) {
        try {
            // Simulate typing for 1-3 seconds to appear more human
            const typingDuration = Math.random() * 2000 + 1000;
            
            // Start typing
            const chat = await this.client.getChatById(chatId);
            await chat.sendStateTyping();
            
            // Wait for typing duration
            await new Promise(resolve => setTimeout(resolve, typingDuration));
            
            // Stop typing
            await chat.clearState();
            
        } catch (error) {
            logger.warn('Failed to simulate typing:', error);
        }
    }

    async getClientInfo() {
        try {
            if (!this.isReady) {
                return null;
            }
            return await this.client.getClientInfo();
        } catch (error) {
            logger.error('Failed to get client info:', error);
            return null;
        }
    }

    destroy() {
        try {
            if (this.client) {
                this.client.destroy();
                this.isReady = false;
                logger.info('WhatsApp client destroyed');
            }
        } catch (error) {
            logger.error('Error destroying client:', error);
        }
    }
}

module.exports = Bot;
