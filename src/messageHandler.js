const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const NLP = require('./nlp');
const AIHandler = require('./aiHandler');

class MessageHandler {
    constructor() {
        this.responses = null;
        this.settings = null;
        this.nlp = new NLP();
        this.aiHandler = new AIHandler();
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
            const messageText = message.body.toLowerCase().trim();
            const isGroup = message.from.includes('@g.us');

            // Skip group messages if disabled
            if (isGroup && !this.settings.respondToGroups) {
                return null;
            }

            // Check business hours if enabled
            if (this.settings.businessHours.enabled && !this.isWithinBusinessHours()) {
                return this.getRandomResponse('outOfHours') || "Thank you for your message. We'll get back to you during business hours.";
            }

            // Process commands first
            const commandResponse = this.processCommand(messageText);
            if (commandResponse) {
                return commandResponse;
            }

            // Use NLP for intent detection
            if (this.settings.enableNLP) {
                const intent = this.nlp.detectIntent(messageText);
                const intentResponse = this.getResponseByIntent(intent);
                if (intentResponse) {
                    return intentResponse;
                }
            }

            // Keyword-based responses
            const keywordResponse = this.processKeywords(messageText);
            if (keywordResponse) {
                return keywordResponse;
            }

            // Fallback response
            return this.getRandomResponse('fallback');

        } catch (error) {
            logger.error('Error processing message:', error);
            return "I'm experiencing some technical difficulties. Please try again later.";
        }
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
