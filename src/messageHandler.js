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

            // Process commands - but only special commands, not regular conversation
            if (messageText.toLowerCase().startsWith('/') || messageText.toLowerCase() === 'help') {
                const commandResponse = this.processCommand(messageText.toLowerCase());
                if (commandResponse) {
                    return commandResponse;
                }
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
                // Return AI response with stop option
                return aiResponse + '\n\n• ❌ Stop AI Chat\n\nType "stop ai chat" or "❌" to end AI conversation.';
            } else {
                return "I'm having trouble understanding. Could you rephrase that?\n\n• ❌ Stop AI Chat\n\nType \"stop ai chat\" or \"❌\" to end AI conversation.";
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
            statusText = `Hello ${contactName}!\n\n🔴 My owner is currently offline and will be back within a few minutes.\n\nPlease don't spam messages as they will be reviewed later.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Want to chat with AI assistant while waiting?*\n\n• 🤖 Start AI Chat\n\nType "start ai chat" or "🤖" to begin AI conversation.`;
        } else if (this.ownerStatus === 'busy') {
            statusText = `Hello ${contactName}!\n\n🟡 My owner is currently busy but will respond soon.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Want to chat with AI assistant while waiting?*\n\n• 🤖 Start AI Chat\n\nType "start ai chat" or "🤖" to begin AI conversation.`;
        } else {
            statusText = `Hello ${contactName}!\n\n🟢 My owner should respond shortly.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Want to chat with AI assistant?*\n\n• 🤖 Start AI Chat\n\nType "start ai chat" or "🤖" to begin AI conversation.`;
        }

        return statusText;
    }

    getKnowledgeBasedResponse(messageText) {
        const text = messageText.toLowerCase();
        
        // Geography questions
        if (text.includes('capital') && text.includes('france')) {
            return 'The capital of France is Paris.';
        }
        if (text.includes('capital') && text.includes('india')) {
            return 'The capital of India is New Delhi.';
        }
        if (text.includes('capital') && text.includes('usa') || text.includes('capital') && text.includes('america')) {
            return 'The capital of the USA is Washington, D.C.';
        }
        if (text.includes('capital') && text.includes('japan')) {
            return 'The capital of Japan is Tokyo.';
        }
        
        // Science questions
        if (text.includes('momentum') && (text.includes('principle') || text.includes('law'))) {
            return 'The principle of momentum states that momentum = mass × velocity. It is conserved in isolated systems, meaning the total momentum before and after a collision remains constant.';
        }
        if (text.includes('gravity') || text.includes('gravitational')) {
            return 'Gravity is the force that attracts objects toward each other. On Earth, it gives objects weight and causes them to fall at 9.8 m/s².';
        }
        
        // History questions
        if (text.includes('who wrote') && text.includes('aadijeevitham')) {
            return 'Aadijeevitham (The Goat Life) was written by Benyamin, a Malayalam author. It tells the true story of an Indian migrant worker in Saudi Arabia.';
        }
        if (text.includes('president') && text.includes('india')) {
            return 'The current President of India is Droupadi Murmu (as of 2022). The President is the ceremonial head of state.';
        }
        
        // Time and date
        if (text.includes('time') || text.includes('date')) {
            return `Current time: ${new Date().toLocaleString()}`;
        }
        
        // Math questions
        if (text.includes('what is') && (text.includes('+') || text.includes('plus'))) {
            const numbers = text.match(/\d+/g);
            if (numbers && numbers.length >= 2) {
                const sum = parseInt(numbers[0]) + parseInt(numbers[1]);
                return `${numbers[0]} + ${numbers[1]} = ${sum}`;
            }
        }
        
        // Greetings
        if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
            return `Hello! I'm an AI assistant. I can help you with general knowledge questions about geography, science, history, and basic calculations. What would you like to know?`;
        }
        
        // Default helpful response
        return `I can help you with questions about:\n• Geography (capitals, countries)\n• Science (physics, biology basics)\n• History and general knowledge\n• Simple calculations\n• Current time and date\n\nWhat would you like to know?`;
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
