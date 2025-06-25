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
        this.contactedUsers = new Set(); // Track users who have been contacted
        this.approvedUsers = new Map(); // Track approved users with expiry
        this.ownerNumber = process.env.OWNER_NUMBER || null; // Set owner's WhatsApp number
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

            // Handle owner-only approve commands
            if (this.isOwnerMessage(message)) {
                const approveResponse = this.handleOwnerApproveCommand(messageText, message);
                if (approveResponse) {
                    return approveResponse;
                }
            }

            // Handle AI chat commands
            if (messageText.toLowerCase() === '/start' || messageText.toLowerCase() === '/ai') {
                const buttonResponse = await this.buttonHandler.handleButtonClick('start_ai_chat', message);
                return buttonResponse;
            }
            
            if (messageText.toLowerCase() === '/stop') {
                const buttonResponse = await this.buttonHandler.handleButtonClick('stop_ai_chat', message);
                return buttonResponse;
            }

            // Check if user wants help/commands
            if (messageText.toLowerCase() === '/help' || messageText.toLowerCase() === 'help') {
                return this.getHelpMessage();
            }

            // Check if AI chat is active for this user
            if (this.buttonHandler.isAIChatActive(chatId)) {
                return await this.handleAIChatMessage(message, contact);
            }

            // Check if user is approved
            if (this.isUserApproved(chatId)) {
                // User is approved, let them chat freely
                return this.getApprovedUserResponse();
            }

            // User not approved - show welcome message with commands
            return this.createWelcomeMessageWithCommands(contact, message);

        } catch (error) {
            logger.error('Error processing message:', error);
            return "Sorry, I encountered an error processing your message.";
        }
    }

    async handleAIChatMessage(message, contact) {
        const messageText = message.body.trim();
        const chatId = message.from;

        try {
            // Generate AI response if available
            const senderInfo = {
                name: contact.pushname || contact.name || 'Unknown',
                number: contact.number || message.from
            };

            let aiResponse = null;
            try {
                aiResponse = await this.aiHandler.generateResponse(messageText, senderInfo);
            } catch (error) {
                logger.warn('AI response failed, using knowledge-based fallback');
            }
            
            if (aiResponse) {
                return aiResponse + '\n\n• Type /stop to end AI chat';
            } else {
                // Knowledge-based fallback responses
                const fallbackResponse = this.getKnowledgeBasedResponse(messageText);
                return fallbackResponse + '\n\n• Type /stop to end AI chat';
            }

        } catch (error) {
            logger.error('Error in AI chat:', error);
            return "Sorry, I'm experiencing technical difficulties. Please try again.\n\n• ❌ Stop AI Chat\n\nType \"stop ai chat\" or \"❌\" to end AI conversation.";
        }
    }

    createWelcomeMessageWithCommands(contact, message) {
        const contactName = contact.pushname || contact.name || 'Unknown';
        const contactNumber = contact.number || message.from.replace('@c.us', '');
        const messageTime = new Date().toLocaleString();

        let statusText;
        if (this.ownerStatus === 'offline') {
            statusText = `Hello ${contactName}!\n\n🔴 My owner is currently offline and will be back within a few minutes.\n\nPlease don't spam messages as they will be reviewed later.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Available Commands:*\n• /start or /ai - Start AI chat\n• /help - Show commands\n\nType /start to begin AI conversation!`;
        } else if (this.ownerStatus === 'busy') {
            statusText = `Hello ${contactName}!\n\n🟡 My owner is currently busy but will respond soon.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Available Commands:*\n• /start or /ai - Start AI chat\n• /help - Show commands\n\nType /start to begin AI conversation!`;
        } else {
            statusText = `Hello ${contactName}!\n\n🟢 My owner should respond shortly.\n\n📋 *Your Contact Details:*\n• Your Number: ${contactNumber}\n• Your Name: ${contactName}\n• Message Time: ${messageTime}\n\n*Available Commands:*\n• /start or /ai - Start AI chat\n• /help - Show commands\n\nType /start to begin AI conversation!`;
        }

        return statusText;
    }

    getHelpMessage() {
        return `*Available Commands:*\n\n• /start or /ai - Start AI chat\n• /stop - Stop AI chat\n• /help - Show this help\n\nUse these commands to interact with the bot!`;
    }

    getApprovedUserResponse() {
        return `You are approved to chat directly! Your messages will be forwarded to the owner.\n\nYou can also use /start for AI chat anytime.`;
    }

    isOwnerMessage(message) {
        if (!this.ownerNumber) return false;
        const senderNumber = message.from.replace('@c.us', '');
        return senderNumber === this.ownerNumber;
    }

    handleOwnerApproveCommand(messageText, message) {
        const text = messageText.toLowerCase().trim();
        
        if (!text.startsWith('/approve')) {
            return null;
        }

        // Parse approve command: /approve <duration> [user_number]
        const parts = text.split(' ');
        if (parts.length < 2) {
            return 'Usage: /approve <duration> [user_number]\nExamples:\n• /approve 1day\n• /approve 5message\n• /approve forever\n• /approve stop\n• /approve 1hour +1234567890';
        }

        const duration = parts[1];
        let targetUser = null;

        // If user number is provided, use it; otherwise use the quoted message sender
        if (parts.length > 2 && parts[2].startsWith('+')) {
            targetUser = parts[2].replace('+', '') + '@c.us';
        } else if (message.hasQuotedMsg) {
            // Get the quoted message sender
            message.getQuotedMessage().then(quotedMsg => {
                if (quotedMsg) {
                    targetUser = quotedMsg.from;
                    this.processApproval(duration, targetUser);
                }
            });
            return 'Processing approval for quoted message sender...';
        }

        if (!targetUser) {
            return 'Please reply to a user message or specify phone number.\nExample: /approve 1day +1234567890';
        }

        return this.processApproval(duration, targetUser);
    }

    processApproval(duration, userId) {
        if (duration === 'stop') {
            this.approvedUsers.delete(userId);
            return `✅ Approval removed for user.`;
        }

        if (duration === 'forever') {
            this.approvedUsers.set(userId, {
                type: 'forever',
                expiresAt: null
            });
            return `✅ User approved forever.`;
        }

        // Parse duration
        const durationInfo = this.parseDuration(duration);
        if (!durationInfo) {
            return '❌ Invalid duration format.\nExamples: 1day, 5message, 2hour, 1week, 30minute';
        }

        this.approvedUsers.set(userId, durationInfo);
        return `✅ User approved for ${duration}.`;
    }

    parseDuration(duration) {
        const match = duration.match(/^(\d+)(minute|hour|day|week|month|year|message)s?$/);
        if (!match) return null;

        const amount = parseInt(match[1]);
        const unit = match[2];

        if (unit === 'message') {
            return {
                type: 'message',
                remaining: amount,
                expiresAt: null
            };
        }

        const now = Date.now();
        let expiresAt;

        switch (unit) {
            case 'minute':
                expiresAt = now + (amount * 60 * 1000);
                break;
            case 'hour':
                expiresAt = now + (amount * 60 * 60 * 1000);
                break;
            case 'day':
                expiresAt = now + (amount * 24 * 60 * 60 * 1000);
                break;
            case 'week':
                expiresAt = now + (amount * 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                expiresAt = now + (amount * 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                expiresAt = now + (amount * 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                return null;
        }

        return {
            type: 'time',
            expiresAt: expiresAt
        };
    }

    isUserApproved(userId) {
        const approval = this.approvedUsers.get(userId);
        if (!approval) return false;

        if (approval.type === 'forever') {
            return true;
        }

        if (approval.type === 'time') {
            if (Date.now() > approval.expiresAt) {
                this.approvedUsers.delete(userId);
                return false;
            }
            return true;
        }

        if (approval.type === 'message') {
            if (approval.remaining <= 0) {
                this.approvedUsers.delete(userId);
                return false;
            }
            // Decrease remaining messages
            approval.remaining--;
            this.approvedUsers.set(userId, approval);
            return true;
        }

        return false;
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
        if (text.includes('capital') && (text.includes('usa') || text.includes('america'))) {
            return 'The capital of the USA is Washington, D.C.';
        }
        if (text.includes('capital') && text.includes('japan')) {
            return 'The capital of Japan is Tokyo.';
        }
        if (text.includes('capital') && text.includes('kerala')) {
            return 'The capital of Kerala is Thiruvananthapuram (also known as Trivandrum).';
        }
        if (text.includes('capital') && text.includes('tamil nadu')) {
            return 'The capital of Tamil Nadu is Chennai.';
        }
        if (text.includes('capital') && text.includes('karnataka')) {
            return 'The capital of Karnataka is Bengaluru (Bangalore).';
        }
        if (text.includes('capital') && text.includes('maharashtra')) {
            return 'The capital of Maharashtra is Mumbai.';
        }
        
        // Science questions
        if (text.includes('momentum') && (text.includes('principle') || text.includes('law'))) {
            return 'The principle of momentum states that momentum = mass × velocity. It is conserved in isolated systems, meaning the total momentum before and after a collision remains constant.';
        }
        if (text.includes('gravity') || text.includes('gravitational')) {
            return 'Gravity is the force that attracts objects toward each other. On Earth, it gives objects weight and causes them to fall at 9.8 m/s².';
        }
        if (text.includes('what is force')) {
            return 'Force is a push or pull that can change an object\'s motion. It is measured in Newtons (N). According to Newton\'s second law: Force = mass × acceleration (F = ma).';
        }
        if (text.includes('what is anatomy')) {
            return 'Anatomy is the branch of biology that studies the structure of living organisms and their parts. It includes the study of organs, tissues, cells, and body systems in humans, animals, and plants.';
        }
        if (text.includes('what is physics')) {
            return 'Physics is the science that studies matter, energy, motion, and the fundamental forces of nature. It includes mechanics, thermodynamics, electromagnetism, and quantum physics.';
        }
        if (text.includes('what is chemistry')) {
            return 'Chemistry is the science that studies the composition, structure, properties, and reactions of matter at the atomic and molecular level.';
        }
        
        // History and Government questions
        if (text.includes('who wrote') && text.includes('aadijeevitham')) {
            return 'Aadijeevitham (The Goat Life) was written by Benyamin, a Malayalam author. It tells the true story of an Indian migrant worker in Saudi Arabia.';
        }
        if (text.includes('president') && text.includes('india')) {
            return 'The current President of India is Droupadi Murmu (as of 2022). The President is the ceremonial head of state.';
        }
        if (text.includes('prime minister') && text.includes('india')) {
            return 'The current Prime Minister of India is Narendra Modi. He has been in office since 2014.';
        }
        if ((text.includes('finance minister') || text.includes('financial minister')) && text.includes('india')) {
            return 'The current Finance Minister of India is Nirmala Sitharaman. She has been serving since 2019 and is the second woman to hold this position.';
        }
        if (text.includes('current status') && text.includes('india')) {
            return 'India is currently the world\'s most populous country and 5th largest economy. It continues to grow as a major global power with significant technological and economic development.';
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
        
        // More specific knowledge areas
        if (text.includes('photosynthesis')) {
            return 'Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen. The formula is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2.';
        }
        if (text.includes('cell') && (text.includes('what is') || text.includes('definition'))) {
            return 'A cell is the basic structural and functional unit of all living organisms. Cells can be prokaryotic (without nucleus) or eukaryotic (with nucleus).';
        }
        if (text.includes('dna')) {
            return 'DNA (Deoxyribonucleic Acid) is the molecule that carries genetic information in all living organisms. It has a double helix structure made of four bases: A, T, G, and C.';
        }

        // Check for basic patterns
        if (text.includes('who is') || text.includes('what is') || text.includes('how') || text.includes('why') || text.includes('when') || text.includes('where')) {
            return `I can help you with questions about:\n• Geography: capitals of countries and states\n• Science: physics, chemistry, biology, anatomy\n• History: presidents, ministers, government officials\n• Math: basic calculations and formulas\n• General knowledge and current information\n\nCould you be more specific about what you'd like to know?`;
        }
        
        // Default helpful response
        return `Hello! I'm here to help you with questions. You can ask me about:\n• Geography (capitals, countries, states)\n• Science (physics, biology basics)\n• History and general knowledge\n• Simple calculations\n• Current time and date\n\nWhat would you like to know?`;
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
