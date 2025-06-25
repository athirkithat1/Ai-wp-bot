const OpenAI = require('openai');
const logger = require('./logger');

class AIHandler {
    constructor() {
        this.openai = null;
        this.initialize();
    }

    initialize() {
        if (!process.env.OPENAI_API_KEY) {
            logger.warn('OpenAI API key not found. AI responses will not be available.');
            return;
        }

        try {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            logger.info('OpenAI client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize OpenAI client:', error);
        }
    }

    async generateResponse(message, senderInfo = {}) {
        if (!this.openai) {
            return null;
        }

        try {
            const systemPrompt = this.getSystemPrompt(senderInfo);
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 150,
                temperature: 0.7
            });

            const aiResponse = response.choices[0].message.content.trim();
            logger.info('AI response generated successfully');
            return aiResponse;

        } catch (error) {
            logger.error('Error generating AI response:', error);
            return null;
        }
    }

    getSystemPrompt(senderInfo) {
        return `You are a smart AI assistant helping users with their questions and conversations. You have access to a wide range of knowledge and can help with:

- General knowledge questions (history, science, geography, etc.)
- Explanations of concepts and principles  
- Helpful advice and recommendations
- Conversational chat and assistance

Guidelines:
- Always provide accurate, helpful information
- Keep responses clear and informative but not too long (2-4 sentences typically)
- Be friendly and conversational
- If you don't know something specific, say so honestly
- For complex topics, provide simple explanations first

You are chatting with: ${senderInfo.name || 'a user'}`;
    }

    async analyzeMessage(message) {
        if (!this.openai) {
            return { urgency: 'medium', category: 'general' };
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "Analyze this WhatsApp message and return JSON with 'urgency' (low/medium/high) and 'category' (greeting/question/request/emergency/spam/other)."
                    },
                    { role: "user", content: message }
                ],
                response_format: { type: "json_object" },
                max_tokens: 50
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            logger.error('Error analyzing message:', error);
            return { urgency: 'medium', category: 'general' };
        }
    }

    isAvailable() {
        return this.openai !== null;
    }
}

module.exports = AIHandler;