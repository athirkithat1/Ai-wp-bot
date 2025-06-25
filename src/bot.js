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
                    '--disable-component-extensions-with-background-pages',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
            logger.info('='.repeat(50));
            logger.info('NEW QR CODE GENERATED - SCAN TO CONNECT');
            logger.info('='.repeat(50));
            this.emit('qr_received', qr);
            
            // Show a very tiny QR code in terminal (just for reference)
            console.log('\nMini QR (for reference only):');
            qrcode.generate(qr, { small: true });
            
            logger.info('='.repeat(50));
            logger.info('For easier scanning, visit: http://localhost:5000/qr');
            logger.info('Or copy this link and open in browser: /qr');
            logger.info('='.repeat(50));
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
            logger.error('Try scanning the QR code again or restart the bot');
        });

        this.client.on('loading_screen', (percent, message) => {
            logger.info(`Loading: ${percent}% - ${message}`);
        });

        this.client.on('change_state', (state) => {
            logger.info(`Connection state changed: ${state}`);
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
            const chat = await originalMessage.getChat();
            
            // Simulate typing indicator
            await this.simulateTyping(chat.id._serialized);
            
            // Add random delay to make responses feel more natural
            const delay = { min: 1000, max: 3000 };
            const randomDelay = Math.random() * (delay.max - delay.min) + delay.min;
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
            // Handle different response types
            let messageText;
            if (typeof response === 'object' && response.type) {
                if (response.type === 'button') {
                    messageText = response.content.text;
                } else if (response.type === 'text') {
                    messageText = response.content;
                } else {
                    messageText = JSON.stringify(response);
                }
            } else {
                messageText = response;
            }
            
            // Send the response
            await chat.sendMessage(messageText);
            
            this.emit('message_replied');
            logger.info(`Sent response to ${originalMessage.from}`);

            // Update rate limiter
            this.rateLimiter.recordMessage(originalMessage.from);

        } catch (error) {
            logger.error('Failed to send response:', error);
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
