const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const NLP = require('./nlp');
const AIHandler = require('./aiHandler');
const ButtonHandler = require('./buttonHandler');

class MessageHandler {
    constructor() {
        this.responses = null;
        this.settings = null;
        this.nlp = new NLP();
        this.aiHandler = new AIHandler();
        this.buttonHandler = new ButtonHandler();
        this.ownerStatus = 'offline'; // offline, online, busy
        this.loadConfiguration();
    }

    async loadConfiguration() {
        try {
            // Load responses configuration
            const responsesPath = path.join(__dirname, '../config/responses.json');
            const responsesData = await fs.readFile(responsesPath, 'utf8');
            this.responses = JSON.parse(responsesData);

            // Load settings configuration
            const settingsPath = path.join(__dirname, '../config/settings.json');
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            this.settings = JSON.parse(settingsData);

            logger.info('Configuration loaded successfully');
        } catch (error) {
            logger.error('Failed to load configuration:', error);
            // Use default configuration
            this.setDefaultConfiguration();
        }
    }

    setDefaultConfiguration() {
        this.responses = {
            greeting: ["Hello! How can I help you today?", "Hi there! What can I do for you?"],
            help: ["Available commands:\n- help: Show this message\n- info: Get information about me\n- contact: Get contact details"],
            info: ["I'm an automated assistant. I'm here to help you with your queries!"],
            contact: ["You can reach us at: contact@example.com"],
            fallback: ["I'm sorry, I didn't understand that. Type 'help' for available commands.", "Could you please rephrase that? Type 'help' for assistance."],
            goodbye: ["Goodbye! Have a great day!", "See you later!"],
            thanks: ["You're welcome!", "Happy to help!", "Anytime!"]
        };

        this.settings = {
            enableNLP: true,
            respondToGroups: false,
            autoReplyDelay: { min: 1000, max: 3000 },
            businessHours: { enabled: false, start: "09:00", end: "17:00" },
            enableTypingIndicator: true
        };
    }

    async processMessage(message) {
        try {
            const messageText = message.body.trim();
            const isGroup = message.from.includes('@g.us');
            const chatId = message.from;

            // Skip group messages
            if (isGroup) {
                logger.info('Skipping group message');
                return null;
            }

            // Get contact information
            let contact;
            try {
                contact = await message.getContact();
            } catch (error) {
                logger.warn('Could not get contact info:', error);
                contact = { pushname: 'Unknown', name: 'Unknown', number: message.from };
            }

            // Handle text-based button commands
            if (messageText.toLowerCase().includes('start ai chat') || messageText.toLowerCase().includes('🤖')) {
                const buttonResponse = await this.buttonHandler.handleButtonClick('start_ai_chat', message);
                return buttonResponse;
            }
            
            if (messageText.toLowerCase().includes('stop ai chat') || messageText.toLowerCase().includes('❌')) {
                const buttonResponse = await this.buttonHandler.handleButtonClick('stop_ai_chat', message);
                return buttonResponse;
            }

            // Check if AI chat is active for this user
            if (this.buttonHandler.isAIChatActive(chatId)) {
                return await this.handleAIChatMessage(message, contact);
            }

            // Process commands
            const commandResponse = this.processCommand(messageText.toLowerCase());
            if (commandResponse) {
                return commandResponse;
            }

            // Show owner status and contact details
            return this.createOwnerStatusMessage(contact, message);

        } catch (error) {
            logger.error('Error processing message:', error);
            return "Sorry, I encountered an error processing your message.";
        }
    }

    async handleAIChatMessage(message, contact) {
        const messageText = message.body.trim();
        const chatId = message.from;

        try {
            // Generate AI response
            const senderInfo = {
                name: contact.pushname || contact.name || 'Unknown',
                number: contact.number || message.from
            };

            const aiResponse = await this.aiHandler.generateResponse(messageText, senderInfo);
            
            if (aiResponse) {
                // Return AI response with stop button
                return {
                    type: 'button',
                    content: this.buttonHandler.createButtonMessage(
                        aiResponse,
                        [this.buttonHandler.createStopAIButton()]
                    )
                };
            } else {
                return {
                    type: 'button',
                    content: this.buttonHandler.createButtonMessage(
                        "I'm having trouble understanding. Could you rephrase that?",
                        [this.buttonHandler.createStopAIButton()]
                    )
                };
            }

        } catch (error) {
            logger.error('Error in AI chat:', error);
            return {
                type: 'button',
                content: this.buttonHandler.createButtonMessage(
                    "Sorry, I'm experiencing technical difficulties. Please try again.",
                    [this.buttonHandler.createStopAIButton()]
                )
            };
        }
    }

    createOwnerStatusMessage(contact, message) {
        const contactName = contact.pushname || contact.name || 'Unknown';
        const contactNumber = contact.number || message.from.replace('@c.us', '');
        const messageTime = new Date().toLocaleString();

        let statusText;
        if (this.ownerStatus === 'offline') {
            statusText = `Hello ${contactName}! 👋\n\n🔴 My owner is currently offline and will be back within a few minutes.\n\nPlease don't spam messages as they will be reviewed later.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Want to chat with AI assistant while waiting?*`;
        } else if (this.ownerStatus === 'busy') {
            statusText = `Hello ${contactName}! 👋\n\n🟡 My owner is currently busy but will respond soon.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Want to chat with AI assistant while waiting?*`;
        } else {
            statusText = `Hello ${contactName}! 👋\n\n🟢 My owner should respond shortly.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Want to chat with AI assistant?*`;
        }

        return {
            type: 'button',
            content: this.buttonHandler.createButtonMessage(
                statusText,
                [this.buttonHandler.createStartAIButton()]
            )
        };
    }

    setOwnerStatus(status) {
        this.ownerStatus = status;
        logger.info(`Owner status changed to: ${status}`);
    }

    processCommand(messageText) {
        // Remove common prefixes
        const cleanText = messageText.replace(/^[\/!.]/, '');

        switch (cleanText) {
            case 'help':
            case 'commands':
                return this.getRandomResponse('help');
            
            case 'info':
            case 'about':
                return this.getRandomResponse('info');
            
            case 'contact':
            case 'contacts':
                return this.getRandomResponse('contact');
            
            case 'ping':
                return "Pong! I'm online and ready to help.";
            
            case 'time':
                return `Current time: ${new Date().toLocaleString()}`;
            
            default:
                return null;
        }
    }

    processKeywords(messageText) {
        // Greeting keywords
        if (this.containsKeywords(messageText, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
            return this.getRandomResponse('greeting');
        }

        // Thank you keywords
        if (this.containsKeywords(messageText, ['thank', 'thanks', 'appreciate', 'grateful'])) {
            return this.getRandomResponse('thanks');
        }

        // Goodbye keywords
        if (this.containsKeywords(messageText, ['bye', 'goodbye', 'see you', 'farewell', 'take care'])) {
            return this.getRandomResponse('goodbye');
        }

        // Help keywords
        if (this.containsKeywords(messageText, ['help', 'assist', 'support', 'what can you do'])) {
            return this.getRandomResponse('help');
        }

        return null;
    }

    getResponseByIntent(intent) {
        if (!intent || !this.responses[intent]) {
            return null;
        }
        return this.getRandomResponse(intent);
    }

    getRandomResponse(category) {
        const responses = this.responses[category];
        if (!responses || !Array.isArray(responses) || responses.length === 0) {
            return null;
        }
        return responses[Math.floor(Math.random() * responses.length)];
    }

    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    isWithinBusinessHours() {
        if (!this.settings.businessHours.enabled) {
            return true;
        }

        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        const startTime = this.parseTime(this.settings.businessHours.start);
        const endTime = this.parseTime(this.settings.businessHours.end);

        return currentTime >= startTime && currentTime <= endTime;
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 100 + minutes;
    }

    async reloadConfiguration() {
        await this.loadConfiguration();
        logger.info('Configuration reloaded');
    }
}

module.exports = MessageHandler;
