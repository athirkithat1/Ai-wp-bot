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
        return `You are a helpful WhatsApp assistant responding on behalf of your user. 

Key guidelines:
- Keep responses concise (1-3 sentences max)
- Be friendly but professional
- If asked about availability, mention you'll get back to them soon
- For urgent matters, suggest they call directly
- Don't reveal you're an AI unless asked directly
- Respond naturally as if you're the phone owner
- If you don't understand something, ask for clarification politely

Context: ${senderInfo.name ? `Sender name: ${senderInfo.name}` : 'Unknown sender'}`;
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