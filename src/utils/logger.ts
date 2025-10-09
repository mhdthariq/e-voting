/**
 * Logging utility for BlockVote application
 * Provides structured logging with different levels and environment-aware output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private enableConsoleLogging: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
    this.logLevel = this.getLogLevel();
    this.enableConsoleLogging = process.env.ENABLE_LOGGING !== "false";
  }

  private getLogLevel(): LogLevel {
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLogLevel) {
      case "DEBUG":
        return LogLevel.DEBUG;
      case "INFO":
        return LogLevel.INFO;
      case "WARN":
        return LogLevel.WARN;
      case "ERROR":
        return LogLevel.ERROR;
      default:
        return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
      metadata,
    };
  }

  private output(entry: LogEntry): void {
    if (!this.enableConsoleLogging) return;

    const prefix = `[${entry.timestamp}] ${entry.level}${entry.context ? ` [${entry.context}]` : ""}:`;

    if (this.isDevelopment) {
      // Colorized console output for development
      const colors = {
        DEBUG: "\x1b[36m", // Cyan
        INFO: "\x1b[32m", // Green
        WARN: "\x1b[33m", // Yellow
        ERROR: "\x1b[31m", // Red
      };
      const reset = "\x1b[0m";
      const color = colors[entry.level as keyof typeof colors] || reset;

      console.log(`${color}${prefix}${reset} ${entry.message}`);

      if (entry.metadata) {
        console.log(
          `${color}${" ".repeat(prefix.length)}${reset}`,
          entry.metadata,
        );
      }
    } else {
      // JSON output for production
      console.log(JSON.stringify(entry));
    }
  }

  debug(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(
        this.formatMessage(LogLevel.DEBUG, message, context, metadata),
      );
    }
  }

  info(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(
        this.formatMessage(LogLevel.INFO, message, context, metadata),
      );
    }
  }

  warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(
        this.formatMessage(LogLevel.WARN, message, context, metadata),
      );
    }
  }

  error(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(
        this.formatMessage(LogLevel.ERROR, message, context, metadata),
      );
    }
  }

  // Convenience methods for specific contexts
  auth(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, "AUTH", metadata);
  }

  database(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, "DATABASE", metadata);
  }

  blockchain(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, "BLOCKCHAIN", metadata);
  }

  api(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, "API", metadata);
  }

  email(message: string, metadata?: Record<string, unknown>): void {
    this.info(message, "EMAIL", metadata);
  }

  security(message: string, metadata?: Record<string, unknown>): void {
    this.warn(message, "SECURITY", metadata);
  }

  // Error logging with stack trace
  exception(
    error: Error,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.error(error.message, context, {
      ...metadata,
      stack: error.stack,
      name: error.name,
    });
  }

  // Performance logging
  performance(operation: string, duration: number, context?: string): void {
    this.debug(`Operation completed: ${operation}`, context || "PERFORMANCE", {
      duration: `${duration}ms`,
    });
  }

  // Audit logging for security-sensitive operations
  audit(
    action: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.info(`Audit: ${action}`, "AUDIT", {
      ...metadata,
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Export singleton instance and types
export { logger };
export type { LogEntry };

// Export convenience functions
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  auth: logger.auth.bind(logger),
  database: logger.database.bind(logger),
  blockchain: logger.blockchain.bind(logger),
  api: logger.api.bind(logger),
  email: logger.email.bind(logger),
  security: logger.security.bind(logger),
  exception: logger.exception.bind(logger),
  performance: logger.performance.bind(logger),
  audit: logger.audit.bind(logger),
};

// Helper function to measure performance
export function withPerformanceLogging<T>(
  operation: string,
  fn: () => T | Promise<T>,
  context?: string,
): T | Promise<T> {
  const start = Date.now();

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result
        .then((value) => {
          logger.performance(operation, Date.now() - start, context);
          return value;
        })
        .catch((error) => {
          logger.performance(
            `${operation} (failed)`,
            Date.now() - start,
            context,
          );
          throw error;
        });
    } else {
      logger.performance(operation, Date.now() - start, context);
      return result;
    }
  } catch (error) {
    logger.performance(`${operation} (failed)`, Date.now() - start, context);
    throw error;
  }
}

// Helper function to create scoped logger
export function createScopedLogger(defaultContext: string) {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) =>
      logger.debug(message, defaultContext, metadata),
    info: (message: string, metadata?: Record<string, unknown>) =>
      logger.info(message, defaultContext, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      logger.warn(message, defaultContext, metadata),
    error: (message: string, metadata?: Record<string, unknown>) =>
      logger.error(message, defaultContext, metadata),
    exception: (error: Error, metadata?: Record<string, unknown>) =>
      logger.exception(error, defaultContext, metadata),
    performance: (operation: string, duration: number) =>
      logger.performance(operation, duration, defaultContext),
  };
}
