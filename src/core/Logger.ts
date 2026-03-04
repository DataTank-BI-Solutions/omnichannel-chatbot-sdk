import { type Logger as WinstonLogger, createLogger, format, transports } from 'winston';
import type { ILogger, LoggingConfig } from '../types/index.js';

/**
 * Logger implementation using Winston
 */
export class Logger implements ILogger {
  private readonly _logger: WinstonLogger;
  private readonly _meta: Record<string, unknown>;

  constructor(config?: LoggingConfig, meta: Record<string, unknown> = {}) {
    this._meta = meta;

    const logFormat =
      config?.format === 'pretty'
        ? format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.colorize(),
            format.printf(({ timestamp, level, message, ...rest }) => {
              const metaStr = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
              return `[${timestamp}] ${level}: ${message}${metaStr}`;
            })
          )
        : format.combine(format.timestamp(), format.errors({ stack: true }), format.json());

    this._logger = createLogger({
      level: config?.level ?? 'info',
      format: logFormat,
      defaultMeta: meta,
      transports: [new transports.Console()],
    });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this._logger.error(message, { ...this._meta, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this._logger.warn(message, { ...this._meta, ...meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this._logger.info(message, { ...this._meta, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this._logger.debug(message, { ...this._meta, ...meta });
  }

  /**
   * Create a child logger with additional metadata
   */
  child(meta: Record<string, unknown>): ILogger {
    const childLogger = new Logger(undefined, { ...this._meta, ...meta });
    return childLogger;
  }
}

/**
 * Create a logger instance
 */
export function createChatbotLogger(config?: LoggingConfig): ILogger {
  return new Logger(config, { service: 'omnichannel-chatbot-sdk' });
}
