const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };

        this.currentLevel = process.env.LOG_LEVEL ? 
            this.logLevels[process.env.LOG_LEVEL.toUpperCase()] : 
            this.logLevels.INFO;

        this.logFile = path.join(__dirname, '../logs/bot.log');
        this.errorFile = path.join(__dirname, '../logs/error.log');

        // Create logs directory if it doesn't exist
        this.ensureLogDirectory();

        // Store recent logs in memory for dashboard
        this.recentLogs = [];
        this.maxRecentLogs = 100;
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level}] ${message}${dataStr}`;
    }

    writeToFile(filename, message) {
        try {
            fs.appendFileSync(filename, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    addToRecentLogs(level, message, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        this.recentLogs.unshift(logEntry);
        
        if (this.recentLogs.length > this.maxRecentLogs) {
            this.recentLogs = this.recentLogs.slice(0, this.maxRecentLogs);
        }
    }

    log(level, message, data = null) {
        if (this.logLevels[level] > this.currentLevel) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, data);
        
        // Console output with colors
        const colors = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m',  // Yellow
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[35m'  // Magenta
        };
        
        const resetColor = '\x1b[0m';
        console.log(`${colors[level]}${formattedMessage}${resetColor}`);

        // Write to file
        this.writeToFile(this.logFile, formattedMessage);

        // Write errors to separate file
        if (level === 'ERROR') {
            this.writeToFile(this.errorFile, formattedMessage);
        }

        // Add to recent logs
        this.addToRecentLogs(level, message, data);
    }

    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    getRecentLogs(count = 50) {
        return this.recentLogs.slice(0, count);
    }

    clearLogs() {
        try {
            fs.writeFileSync(this.logFile, '');
            fs.writeFileSync(this.errorFile, '');
            this.recentLogs = [];
            this.info('Log files cleared');
        } catch (error) {
            this.error('Failed to clear log files:', error);
        }
    }

    setLogLevel(level) {
        const upperLevel = level.toUpperCase();
        if (this.logLevels.hasOwnProperty(upperLevel)) {
            this.currentLevel = this.logLevels[upperLevel];
            this.info(`Log level set to: ${upperLevel}`);
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
