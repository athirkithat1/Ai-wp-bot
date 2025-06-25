const logger = require('./logger');

class NLP {
    constructor() {
        this.patterns = {
            greeting: [
                /^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)/i,
                /^(what's\s+up|how\s+(are\s+you|you\s+doing)|how's\s+it\s+going)/i
            ],
            question: [
                /\?$/,
                /^(what|how|when|where|why|who|which|can\s+you|do\s+you|will\s+you|are\s+you)/i
            ],
            help: [
                /^(help|assist|support|what\s+can\s+you\s+do)/i,
                /(need\s+help|can\s+you\s+help)/i
            ],
            thanks: [
                /^(thank|thanks|appreciate|grateful)/i,
                /(thank\s+you|thanks\s+a\s+lot)/i
            ],
            goodbye: [
                /^(bye|goodbye|farewell|see\s+you|take\s+care)/i,
                /(have\s+a\s+good|good\s+night|good\s+day)/i
            ],
            contact: [
                /(contact|phone|email|address|reach)/i,
                /(how\s+to\s+contact|get\s+in\s+touch)/i
            ],
            info: [
                /(about|info|information|who\s+are\s+you|what\s+are\s+you)/i,
                /(tell\s+me\s+about|more\s+info)/i
            ],
            complaint: [
                /(problem|issue|complaint|bug|error|not\s+working)/i,
                /(wrong|broken|failed|disappointed)/i
            ],
            compliment: [
                /(good|great|awesome|excellent|amazing|wonderful)/i,
                /(well\s+done|nice|perfect|love\s+it)/i
            ]
        };

        this.sentimentWords = {
            positive: ['good', 'great', 'awesome', 'excellent', 'amazing', 'wonderful', 'perfect', 'love', 'like', 'happy', 'pleased'],
            negative: ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'sad'],
            neutral: ['okay', 'fine', 'alright', 'normal', 'average']
        };
    }

    detectIntent(text) {
        try {
            const cleanText = text.toLowerCase().trim();
            
            // Check each pattern category
            for (const [intent, patterns] of Object.entries(this.patterns)) {
                for (const pattern of patterns) {
                    if (pattern.test(cleanText)) {
                        logger.debug(`Detected intent: ${intent} for text: ${text}`);
                        return intent;
                    }
                }
            }

            // If no specific intent found, analyze sentiment
            const sentiment = this.analyzeSentiment(cleanText);
            if (sentiment !== 'neutral') {
                logger.debug(`Detected sentiment: ${sentiment} for text: ${text}`);
                return sentiment === 'positive' ? 'compliment' : 'complaint';
            }

            return null;
        } catch (error) {
            logger.error('Error in intent detection:', error);
            return null;
        }
    }

    analyzeSentiment(text) {
        try {
            const words = text.split(/\s+/);
            let positiveScore = 0;
            let negativeScore = 0;

            words.forEach(word => {
                const cleanWord = word.replace(/[^\w]/g, '');
                
                if (this.sentimentWords.positive.includes(cleanWord)) {
                    positiveScore++;
                } else if (this.sentimentWords.negative.includes(cleanWord)) {
                    negativeScore++;
                }
            });

            if (positiveScore > negativeScore) {
                return 'positive';
            } else if (negativeScore > positiveScore) {
                return 'negative';
            } else {
                return 'neutral';
            }
        } catch (error) {
            logger.error('Error in sentiment analysis:', error);
            return 'neutral';
        }
    }

    extractEntities(text) {
        try {
            const entities = {
                emails: [],
                phones: [],
                urls: [],
                mentions: []
            };

            // Extract emails
            const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            entities.emails = text.match(emailPattern) || [];

            // Extract phone numbers (basic pattern)
            const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
            entities.phones = text.match(phonePattern) || [];

            // Extract URLs
            const urlPattern = /https?:\/\/[^\s]+/g;
            entities.urls = text.match(urlPattern) || [];

            // Extract mentions (@username)
            const mentionPattern = /@\w+/g;
            entities.mentions = text.match(mentionPattern) || [];

            return entities;
        } catch (error) {
            logger.error('Error in entity extraction:', error);
            return { emails: [], phones: [], urls: [], mentions: [] };
        }
    }

    isQuestion(text) {
        return this.patterns.question.some(pattern => pattern.test(text));
    }

    getMessageComplexity(text) {
        const wordCount = text.split(/\s+/).length;
        const sentenceCount = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = wordCount / sentenceCount;

        if (wordCount < 5) return 'simple';
        if (wordCount < 15 && avgWordsPerSentence < 10) return 'medium';
        return 'complex';
    }

    addCustomPattern(intent, pattern) {
        try {
            if (!this.patterns[intent]) {
                this.patterns[intent] = [];
            }
            this.patterns[intent].push(new RegExp(pattern, 'i'));
            logger.info(`Added custom pattern for intent: ${intent}`);
        } catch (error) {
            logger.error('Error adding custom pattern:', error);
        }
    }
}

module.exports = NLP;
