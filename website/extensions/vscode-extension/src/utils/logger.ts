import * as vscode from 'vscode';

export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logs: LogEntry[] = [];
  private maxLogSize = 1000;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Stealth Optimizer');
  }

  /**
   * Log a message with the given level
   */
  log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = { timestamp, level, message, data };

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

  debug(message: string, data?: any): void {
    this.log(LogLevel.Debug, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.Info, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.Warn, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.Error, message, data);
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.outputChannel.clear();
  }

  /**
   * Show the output channel to the user
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

// Global logger instance
let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}
