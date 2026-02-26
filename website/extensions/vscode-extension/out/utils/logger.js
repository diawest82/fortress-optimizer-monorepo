"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
exports.getLogger = getLogger;
const vscode = require("vscode");
var LogLevel;
(function (LogLevel) {
    LogLevel["Debug"] = "DEBUG";
    LogLevel["Info"] = "INFO";
    LogLevel["Warn"] = "WARN";
    LogLevel["Error"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.logs = [];
        this.maxLogSize = 1000;
        this.outputChannel = vscode.window.createOutputChannel('Stealth Optimizer');
    }
    /**
     * Log a message with the given level
     */
    log(level, message, data) {
        const timestamp = new Date().toISOString();
        const entry = { timestamp, level, message, data };
        // Store in memory
        this.logs.push(entry);
        if (this.logs.length > this.maxLogSize) {
            this.logs.shift();
        }
        // Format for output
        let formatted = `[${timestamp}] ${level}: ${message}`;
        if (data) {
            formatted += `\n${JSON.stringify(data, null, 2)}`;
        }
        // Output to channel
        this.outputChannel.appendLine(formatted);
        // Show errors to user
        if (level === LogLevel.Error) {
            console.error(`Stealth Optimizer: ${message}`, data);
        }
    }
    debug(message, data) {
        this.log(LogLevel.Debug, message, data);
    }
    info(message, data) {
        this.log(LogLevel.Info, message, data);
    }
    warn(message, data) {
        this.log(LogLevel.Warn, message, data);
    }
    error(message, data) {
        this.log(LogLevel.Error, message, data);
    }
    /**
     * Get all stored logs
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }
    /**
     * Clear all logs
     */
    clear() {
        this.logs = [];
        this.outputChannel.clear();
    }
    /**
     * Show the output channel to the user
     */
    show() {
        this.outputChannel.show();
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.Logger = Logger;
// Global logger instance
let loggerInstance = null;
function getLogger() {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
}
//# sourceMappingURL=logger.js.map