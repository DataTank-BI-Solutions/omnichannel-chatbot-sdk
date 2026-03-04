import { describe, expect, it } from 'vitest';
import { ChatbotError, ErrorCodes } from './ChatbotError.js';

describe('ChatbotError', () => {
  describe('constructor', () => {
    it('should create error with code and message', () => {
      const error = new ChatbotError('TEST_ERROR', 'Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChatbotError);
      expect(error.name).toBe('ChatbotError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.details).toBeUndefined();
    });

    it('should create error with details', () => {
      const details = { userId: '123', reason: 'invalid input' };
      const error = new ChatbotError('TEST_ERROR', 'Test error message', details);

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual(details);
    });

    it('should capture stack trace', () => {
      const error = new ChatbotError('TEST_ERROR', 'Test error message');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ChatbotError');
    });
  });

  describe('toJSON', () => {
    it('should convert error to JSON representation', () => {
      const details = { userId: '123' };
      const error = new ChatbotError('TEST_ERROR', 'Test error message', details);
      const json = error.toJSON();

      expect(json.name).toBe('ChatbotError');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Test error message');
      expect(json.details).toEqual(details);
      expect(json.stack).toBeDefined();
    });

    it('should include undefined details in JSON', () => {
      const error = new ChatbotError('TEST_ERROR', 'Test error message');
      const json = error.toJSON();

      expect(json.details).toBeUndefined();
    });
  });

  describe('from', () => {
    it('should return same instance if error is ChatbotError', () => {
      const original = new ChatbotError('ORIGINAL_ERROR', 'Original message');
      const result = ChatbotError.from(original);

      expect(result).toBe(original);
      expect(result.code).toBe('ORIGINAL_ERROR');
      expect(result.message).toBe('Original message');
    });

    it('should wrap Error instances', () => {
      const original = new Error('Original error');
      const wrapped = ChatbotError.from(original, 'WRAPPED_ERROR');

      expect(wrapped).toBeInstanceOf(ChatbotError);
      expect(wrapped.code).toBe('WRAPPED_ERROR');
      expect(wrapped.message).toBe('Original error');
      expect(wrapped.details?.originalError).toBe('Error');
      expect(wrapped.details?.stack).toBeDefined();
    });

    it('should use default UNKNOWN_ERROR code if not provided', () => {
      const original = new Error('Original error');
      const wrapped = ChatbotError.from(original);

      expect(wrapped.code).toBe('UNKNOWN_ERROR');
      expect(wrapped.message).toBe('Original error');
    });

    it('should convert non-Error values to string', () => {
      const wrapped1 = ChatbotError.from('string error', 'STRING_ERROR');
      expect(wrapped1.code).toBe('STRING_ERROR');
      expect(wrapped1.message).toBe('string error');

      const wrapped2 = ChatbotError.from(123, 'NUMBER_ERROR');
      expect(wrapped2.code).toBe('NUMBER_ERROR');
      expect(wrapped2.message).toBe('123');

      const wrapped3 = ChatbotError.from({ custom: 'object' }, 'OBJECT_ERROR');
      expect(wrapped3.code).toBe('OBJECT_ERROR');
      expect(wrapped3.message).toBe('[object Object]');
    });

    it('should handle null and undefined', () => {
      const wrappedNull = ChatbotError.from(null, 'NULL_ERROR');
      expect(wrappedNull.message).toBe('null');

      const wrappedUndefined = ChatbotError.from(undefined, 'UNDEFINED_ERROR');
      expect(wrappedUndefined.message).toBe('undefined');
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      // Configuration errors
      expect(ErrorCodes.CONFIG_INVALID).toBe('CONFIG_INVALID');
      expect(ErrorCodes.CONFIG_MISSING).toBe('CONFIG_MISSING');

      // Platform errors
      expect(ErrorCodes.PLATFORM_NOT_FOUND).toBe('PLATFORM_NOT_FOUND');
      expect(ErrorCodes.PLATFORM_INIT_FAILED).toBe('PLATFORM_INIT_FAILED');
      expect(ErrorCodes.PLATFORM_SEND_FAILED).toBe('PLATFORM_SEND_FAILED');

      // Plugin errors
      expect(ErrorCodes.PLUGIN_INSTALL_FAILED).toBe('PLUGIN_INSTALL_FAILED');
      expect(ErrorCodes.PLUGIN_NOT_FOUND).toBe('PLUGIN_NOT_FOUND');

      // Database errors
      expect(ErrorCodes.DATABASE_CONNECTION_FAILED).toBe('DATABASE_CONNECTION_FAILED');
      expect(ErrorCodes.DATABASE_QUERY_FAILED).toBe('DATABASE_QUERY_FAILED');

      // Message errors
      expect(ErrorCodes.MESSAGE_INVALID).toBe('MESSAGE_INVALID');
      expect(ErrorCodes.MESSAGE_SEND_FAILED).toBe('MESSAGE_SEND_FAILED');

      // Router errors
      expect(ErrorCodes.ROUTE_NOT_FOUND).toBe('ROUTE_NOT_FOUND');
      expect(ErrorCodes.HANDLER_ERROR).toBe('HANDLER_ERROR');

      // AI errors
      expect(ErrorCodes.AI_PROVIDER_ERROR).toBe('AI_PROVIDER_ERROR');
      expect(ErrorCodes.AI_RESPONSE_FAILED).toBe('AI_RESPONSE_FAILED');

      // General errors
      expect(ErrorCodes.ALREADY_STARTED).toBe('ALREADY_STARTED');
      expect(ErrorCodes.NOT_STARTED).toBe('NOT_STARTED');
      expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });
});
