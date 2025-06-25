const logger = require('./logger');

class RateLimiter {
    constructor() {
        this.messageHistory = new Map();
        this.globalSettings = {
            maxMessagesPerMinute: 30,
            maxMessagesPerHour: 200,
            maxMessagesPerDay: 1000,
            cooldownPeriod: 5000, // 5 seconds
            warningThreshold: 0.9 // 90% of limit
        };
        
        // Clean up old entries periodically
        setInterval(() => this.cleanup(), 300000); // 5 minutes
    }

    canSendMessage(chatId) {
        try {
            const now = Date.now();
            
            if (!this.messageHistory.has(chatId)) {
                this.messageHistory.set(chatId, {
                    messages: [],
                    lastMessage: 0,
                    warningIssued: false
                });
            }

            const userHistory = this.messageHistory.get(chatId);
            
            // Check cooldown period - but allow more frequent responses for natural conversation
            if (now - userHistory.lastMessage < this.globalSettings.cooldownPeriod) {
                // Allow if it's been at least 3 seconds and user is in active conversation
                if (now - userHistory.lastMessage > 3000 && userHistory.messages.length < 5) {
                    return true;
                }
                logger.debug(`Chat ${chatId} is in cooldown period`);
                return false;
            }

            // Clean old messages
            this.cleanUserHistory(userHistory, now);

            // Check rate limits
            const minuteCount = this.getMessageCount(userHistory.messages, now, 60000);
            const hourCount = this.getMessageCount(userHistory.messages, now, 3600000);
            const dayCount = this.getMessageCount(userHistory.messages, now, 86400000);

            // Check limits
            if (minuteCount >= this.globalSettings.maxMessagesPerMinute) {
                logger.warn(`Rate limit exceeded for ${chatId}: ${minuteCount} messages per minute`);
                return false;
            }

            if (hourCount >= this.globalSettings.maxMessagesPerHour) {
                logger.warn(`Rate limit exceeded for ${chatId}: ${hourCount} messages per hour`);
                return false;
            }

            if (dayCount >= this.globalSettings.maxMessagesPerDay) {
                logger.warn(`Rate limit exceeded for ${chatId}: ${dayCount} messages per day`);
                return false;
            }

            // Issue warning if approaching limits
            if (!userHistory.warningIssued) {
                const minuteWarning = minuteCount >= this.globalSettings.maxMessagesPerMinute * this.globalSettings.warningThreshold;
                const hourWarning = hourCount >= this.globalSettings.maxMessagesPerHour * this.globalSettings.warningThreshold;
                
                if (minuteWarning || hourWarning) {
                    logger.warn(`Chat ${chatId} approaching rate limits`);
                    userHistory.warningIssued = true;
                }
            }

            return true;

        } catch (error) {
            logger.error('Error in rate limiting check:', error);
            return true; // Allow message on error to avoid blocking
        }
    }

    recordMessage(chatId) {
        try {
            const now = Date.now();
            
            if (!this.messageHistory.has(chatId)) {
                this.messageHistory.set(chatId, {
                    messages: [],
                    lastMessage: 0,
                    warningIssued: false
                });
            }

            const userHistory = this.messageHistory.get(chatId);
            userHistory.messages.push(now);
            userHistory.lastMessage = now;

            // Reset warning flag if enough time has passed
            if (userHistory.warningIssued) {
                const lastHourCount = this.getMessageCount(userHistory.messages, now, 3600000);
                if (lastHourCount < this.globalSettings.maxMessagesPerHour * this.globalSettings.warningThreshold) {
                    userHistory.warningIssued = false;
                }
            }

        } catch (error) {
            logger.error('Error recording message:', error);
        }
    }

    getMessageCount(messages, now, timeWindow) {
        return messages.filter(timestamp => now - timestamp <= timeWindow).length;
    }

    cleanUserHistory(userHistory, now) {
        // Remove messages older than 24 hours
        userHistory.messages = userHistory.messages.filter(timestamp => 
            now - timestamp <= 86400000
        );
    }

    cleanup() {
        try {
            const now = Date.now();
            const chatIds = Array.from(this.messageHistory.keys());

            for (const chatId of chatIds) {
                const userHistory = this.messageHistory.get(chatId);
                
                // Remove users with no recent activity (older than 7 days)
                if (now - userHistory.lastMessage > 604800000) {
                    this.messageHistory.delete(chatId);
                    continue;
                }

                // Clean old messages
                this.cleanUserHistory(userHistory, now);
            }

            logger.debug(`Rate limiter cleanup completed. Active chats: ${this.messageHistory.size}`);
        } catch (error) {
            logger.error('Error in rate limiter cleanup:', error);
        }
    }

    getStats() {
        const stats = {
            totalChats: this.messageHistory.size,
            activeChats: 0,
            messagesLastHour: 0,
            messagesLastDay: 0
        };

        const now = Date.now();

        for (const userHistory of this.messageHistory.values()) {
            if (now - userHistory.lastMessage <= 3600000) {
                stats.activeChats++;
            }

            stats.messagesLastHour += this.getMessageCount(userHistory.messages, now, 3600000);
            stats.messagesLastDay += this.getMessageCount(userHistory.messages, now, 86400000);
        }

        return stats;
    }

    updateSettings(newSettings) {
        try {
            this.globalSettings = { ...this.globalSettings, ...newSettings };
            logger.info('Rate limiter settings updated:', newSettings);
        } catch (error) {
            logger.error('Error updating rate limiter settings:', error);
        }
    }

    resetUserLimits(chatId) {
        try {
            if (this.messageHistory.has(chatId)) {
                this.messageHistory.delete(chatId);
                logger.info(`Reset rate limits for chat: ${chatId}`);
            }
        } catch (error) {
            logger.error('Error resetting user limits:', error);
        }
    }
}

module.exports = RateLimiter;
