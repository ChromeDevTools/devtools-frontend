// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Enable/disable logging */
  enabled: boolean;
  /** Include timestamp in logs */
  includeTimestamp: boolean;
  /** Include source location in logs */
  includeSource: boolean;
  /** Module-specific log levels */
  moduleLevels?: Record<string, LogLevel>;
}

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  OFF = 5,
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: Date;
  data?: any;
  error?: Error;
  source?: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Logger instance for a specific module
 */
export class Logger {
  /**
   * Default configuration for production builds
   * 
   * To change the default log level:
   * - For production: Change DEFAULT_LOG_LEVEL below
   * - For development: Runs with DEBUG level automatically on localhost
   * - At runtime: Use Logger.configure({ level: LogLevel.WARN })
   */
  private static readonly DEFAULT_LOG_LEVEL = LogLevel.INFO;
  
  private static config: LoggerConfig = {
    level: Logger.DEFAULT_LOG_LEVEL,
    enabled: true,
    includeTimestamp: true,
    includeSource: false,
  };

  private static logHandlers: ((entry: LogEntry) => void)[] = [];

  constructor(private readonly module: string) {}

  /**
   * Configure global logger settings
   */
  static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * Add a custom log handler
   */
  static addHandler(handler: (entry: LogEntry) => void): void {
    Logger.logHandlers.push(handler);
  }

  /**
   * Remove all custom handlers
   */
  static clearHandlers(): void {
    Logger.logHandlers = [];
  }

  /**
   * Check if we're in development mode
   */
  private static isDevelopment(): boolean {
    // Check for development indicators
    return location.hostname === 'localhost' || 
           location.hostname.includes('127.0.0.1') ||
           location.port === '8090' ||
           location.port === '8000';
  }

  /**
   * Get effective log level for a module
   */
  private getEffectiveLevel(): LogLevel {
    if (!Logger.config.enabled) {
      return LogLevel.OFF;
    }
    
    const moduleLevel = Logger.config.moduleLevels?.[this.module];
    if (moduleLevel !== undefined) {
      return moduleLevel;
    }

    // Always respect the configured level (removed production restriction)
    return Logger.config.level;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const effectiveLevel = this.getEffectiveLevel();
    if (level < effectiveLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      module: this.module,
      message,
      timestamp: new Date(),
      data,
    };

    // Add source information if enabled
    if (Logger.config.includeSource) {
      const stack = new Error().stack;
      if (stack) {
        const sourceMatch = stack.split('\n')[3]?.match(/at\s+(.+):(\d+):(\d+)/);
        if (sourceMatch) {
          entry.source = {
            file: sourceMatch[1],
            line: parseInt(sourceMatch[2], 10),
            column: parseInt(sourceMatch[3], 10),
          };
        }
      }
    }

    // Process with handlers
    if (Logger.logHandlers.length > 0) {
      Logger.logHandlers.forEach(handler => handler(entry));
    }

    // Default console output
    this.consoleOutput(entry);
  }

  /**
   * Output to console with proper formatting
   */
  private consoleOutput(entry: LogEntry): void {
    const { level, module, message, timestamp, data, source } = entry;
    
    // Build prefix
    const parts: string[] = [];
    
    if (Logger.config.includeTimestamp) {
      parts.push(`[${timestamp.toISOString()}]`);
    }
    
    parts.push(`[${LogLevel[level]}]`);
    parts.push(`[${module}]`);
    
    const prefix = parts.join(' ');
    // Convert \n to actual newlines and unescape quotes for better readability
    let formattedMessage = message.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    
    // For very long multi-line messages, add some visual separation
    if (formattedMessage.includes('\n') && formattedMessage.length > 200) {
      formattedMessage = formattedMessage.replace(/^/, '\n').replace(/$/, '\n');
    }

    // Choose console method based on level
    const consoleMethod = this.getConsoleMethod(level);
    
    if (data !== undefined) {
      // When data is provided, log message and data separately
      consoleMethod(`${prefix} ${formattedMessage}`, data);
    } else {
      // For all messages, use a single console call to avoid repeated source locations
      consoleMethod(`${prefix} ${formattedMessage}`);
    }
  }

  /**
   * Get the appropriate console method for a log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.TRACE:
        return console.log.bind(console); // Use console.log for visibility
      case LogLevel.DEBUG:
        return console.log.bind(console); // Use console.log for visibility
      case LogLevel.INFO:
        return console.log.bind(console);
      case LogLevel.WARN:
        return console.warn.bind(console);
      case LogLevel.ERROR:
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Log a trace message (most verbose)
   */
  trace(message: string, data?: any): void {
    this.log(LogLevel.TRACE, message, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      module: this.module,
      message,
      timestamp: new Date(),
      error: error instanceof Error ? error : undefined,
      data: error instanceof Error ? undefined : error,
    };

    if (Logger.config.includeSource) {
      const stack = new Error().stack;
      if (stack) {
        const sourceMatch = stack.split('\n')[2]?.match(/at\s+(.+):(\d+):(\d+)/);
        if (sourceMatch) {
          entry.source = {
            file: sourceMatch[1],
            line: parseInt(sourceMatch[2], 10),
            column: parseInt(sourceMatch[3], 10),
          };
        }
      }
    }

    // Process with handlers
    if (Logger.logHandlers.length > 0) {
      Logger.logHandlers.forEach(handler => handler(entry));
    }

    // Console output with error
    const prefix = Logger.config.includeTimestamp 
      ? `[${entry.timestamp.toISOString()}] [ERROR] [${this.module}]`
      : `[ERROR] [${this.module}]`;
    
    // Convert \n to actual newlines and unescape quotes in error messages too
    let formattedMessage = message.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    
    // For very long multi-line error messages, add some visual separation
    if (formattedMessage.includes('\n') && formattedMessage.length > 200) {
      formattedMessage = formattedMessage.replace(/^/, '\n').replace(/$/, '\n');
    }

    if (entry.error) {
      console.error(`${prefix} ${formattedMessage}`, entry.error);
    } else if (entry.data !== undefined) {
      console.error(`${prefix} ${formattedMessage}`, entry.data);
    } else {
      console.error(`${prefix} ${formattedMessage}`);
    }
  }

  /**
   * Create a child logger with a sub-module name
   */
  child(subModule: string): Logger {
    return new Logger(`${this.module}:${subModule}`);
  }
}

/**
 * Factory function to create a logger for a module
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}

/**
 * Development-time logger configuration
 */
if (Logger['isDevelopment']()) {
  Logger.configure({
    level: LogLevel.DEBUG,
    includeTimestamp: true,
    includeSource: true,
  });
}

/**
 * Export for global configuration
 */
export const LoggerConfig = Logger;