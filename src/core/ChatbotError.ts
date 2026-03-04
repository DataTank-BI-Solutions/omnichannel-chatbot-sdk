import type { IChatbotError } from '../types/index.js';

/**
 * Custom error class for Chatbot SDK errors
 */
export class ChatbotError extends Error implements IChatbotError {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ChatbotError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChatbotError);
    }
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * Create a ChatbotError from an unknown error
   */
  static from(error: unknown, code = 'UNKNOWN_ERROR'): ChatbotError {
    if (error instanceof ChatbotError) {
      return error;
    }

    if (error instanceof Error) {
      return new ChatbotError(code, error.message, {
        originalError: error.name,
        stack: error.stack,
      });
    }

    return new ChatbotError(code, String(error));
  }
}

// ============================================================================
// Pre-defined Error Codes
// ============================================================================

export const ErrorCodes = {
  // Configuration errors
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',

  // Platform errors
  PLATFORM_NOT_FOUND: 'PLATFORM_NOT_FOUND',
  PLATFORM_INIT_FAILED: 'PLATFORM_INIT_FAILED',
  PLATFORM_SEND_FAILED: 'PLATFORM_SEND_FAILED',

  // Plugin errors
  PLUGIN_INSTALL_FAILED: 'PLUGIN_INSTALL_FAILED',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',

  // Database errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',

  // Message errors
  MESSAGE_INVALID: 'MESSAGE_INVALID',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',

  // Router errors
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  HANDLER_ERROR: 'HANDLER_ERROR',

  // AI errors
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_RESPONSE_FAILED: 'AI_RESPONSE_FAILED',

  // General errors
  ALREADY_STARTED: 'ALREADY_STARTED',
  NOT_STARTED: 'NOT_STARTED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
