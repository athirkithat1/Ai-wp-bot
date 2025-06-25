const logger = require('./logger');

class ButtonHandler {
    constructor() {
        this.activeAIChats = new Map(); // Track active AI sessions
    }

    createStartAIButton() {
        return {
            buttonText: {
                displayText: '🤖 Start AI Chat'
            },
            buttonId: 'start_ai_chat',
            type: 1
        };
    }

    createStopAIButton() {
        return {
            buttonText: {
                displayText: '❌ Stop AI Chat'
            },
            buttonId: 'stop_ai_chat',
            type: 1
        };
    }

    createButtonMessage(text, buttons) {
        // Create text-based buttons since WhatsApp Web has limited interactive button support
        const buttonText = text + '\n\n' + buttons.map(btn => `• ${btn.buttonText.displayText}`).join('\n');
        return {
            text: buttonText,
            buttons: buttons,
            headerType: 1
        };
    }

    isAIChatActive(chatId) {
        return this.activeAIChats.has(chatId);
    }

    startAIChat(chatId, contactName) {
        this.activeAIChats.set(chatId, {
            startTime: Date.now(),
            contactName: contactName
        });
        logger.info(`Started AI chat for ${chatId}`);
    }

    stopAIChat(chatId) {
        this.activeAIChats.delete(chatId);
        logger.info(`Stopped AI chat for ${chatId}`);
    }

    getAIChatInfo(chatId) {
        return this.activeAIChats.get(chatId);
    }

    async handleButtonClick(buttonId, message) {
        const chatId = message.from;
        
        try {
            if (buttonId === 'start_ai_chat') {
                const contact = await message.getContact();
                const contactName = contact.pushname || contact.name || 'there';
                
                this.startAIChat(chatId, contactName);
                
                const welcomeMessage = `Hi ${contactName}! 🤖\n\nAI chat is now active. I can help you with questions, information, and general conversation.\n\nWhat would you like to know?`;
                
                return {
                    type: 'button',
                    content: this.createButtonMessage(welcomeMessage, [this.createStopAIButton()])
                };
            }
            
            if (buttonId === 'stop_ai_chat') {
                this.stopAIChat(chatId);
                
                const stopMessage = `AI chat has been stopped. ✅\n\nThanks for chatting! If you need to talk to my owner, they'll respond when available.`;
                
                return {
                    type: 'text',
                    content: stopMessage
                };
            }
            
        } catch (error) {
            logger.error('Error handling button click:', error);
            return {
                type: 'text',
                content: 'Sorry, there was an error processing your request.'
            };
        }
        
        return null;
    }
}

module.exports = ButtonHandler;