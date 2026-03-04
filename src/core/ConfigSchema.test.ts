import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  AIConfigSchema,
  ChatbotConfigSchema,
  DatabaseConfigSchema,
  LoggingConfigSchema,
  TelegramConfigSchema,
  WhatsAppConfigSchema,
  safeValidateConfig,
  validateConfig,
} from './ConfigSchema.js';

describe('ConfigSchema', () => {
  describe('LoggingConfigSchema', () => {
    it('should validate valid logging config', () => {
      const config = { level: 'info' as const, format: 'json' as const };
      expect(() => LoggingConfigSchema.parse(config)).not.toThrow();
    });

    it('should accept config without format', () => {
      const config = { level: 'debug' as const };
      expect(() => LoggingConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject invalid log level', () => {
      const config = { level: 'invalid' };
      expect(() => LoggingConfigSchema.parse(config)).toThrow(ZodError);
    });
  });

  describe('TelegramConfigSchema', () => {
    it('should validate valid Telegram config', () => {
      const config = {
        enabled: true,
        token: 'test-token-123',
      };
      expect(() => TelegramConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate with optional webhook fields', () => {
      const config = {
        enabled: true,
        token: 'test-token-123',
        webhookUrl: 'https://example.com/webhook',
        webhookPath: '/telegram',
      };
      expect(() => TelegramConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject empty token', () => {
      const config = {
        enabled: true,
        token: '',
      };
      expect(() => TelegramConfigSchema.parse(config)).toThrow(ZodError);
    });

    it('should reject missing token', () => {
      const config = {
        enabled: true,
      };
      expect(() => TelegramConfigSchema.parse(config)).toThrow(ZodError);
    });
  });

  describe('WhatsAppConfigSchema', () => {
    it('should validate Baileys config', () => {
      const config = {
        enabled: true,
        provider: 'baileys' as const,
        sessionPath: './sessions',
      };
      expect(() => WhatsAppConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate Twilio config', () => {
      const config = {
        enabled: true,
        provider: 'twilio' as const,
        accountSid: 'AC123',
        authToken: 'token123',
        phoneNumber: '+1234567890',
      };
      expect(() => WhatsAppConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject Twilio config without required fields', () => {
      const config = {
        enabled: true,
        provider: 'twilio' as const,
      };
      expect(() => WhatsAppConfigSchema.parse(config)).toThrow(ZodError);
    });

    it('should reject config without provider', () => {
      const config = {
        enabled: true,
      };
      expect(() => WhatsAppConfigSchema.parse(config)).toThrow(ZodError);
    });
  });

  describe('DatabaseConfigSchema', () => {
    it('should validate memory database config', () => {
      const config = {
        provider: 'memory' as const,
      };
      expect(() => DatabaseConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate Supabase config', () => {
      const config = {
        provider: 'supabase' as const,
        url: 'https://example.supabase.co',
        apiKey: 'key123',
      };
      expect(() => DatabaseConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject invalid provider', () => {
      const config = {
        provider: 'mongodb',
      };
      expect(() => DatabaseConfigSchema.parse(config)).toThrow(ZodError);
    });
  });

  describe('AIConfigSchema', () => {
    it('should validate Gemini config', () => {
      const config = {
        provider: 'gemini' as const,
        apiKey: 'key123',
      };
      expect(() => AIConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate with optional fields', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'key123',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      };
      expect(() => AIConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject temperature out of range', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'key123',
        temperature: 3,
      };
      expect(() => AIConfigSchema.parse(config)).toThrow(ZodError);
    });

    it('should reject empty API key', () => {
      const config = {
        provider: 'anthropic' as const,
        apiKey: '',
      };
      expect(() => AIConfigSchema.parse(config)).toThrow(ZodError);
    });
  });

  describe('ChatbotConfigSchema', () => {
    it('should validate minimal config', () => {
      const config = {
        platforms: {},
      };
      expect(() => ChatbotConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate full config', () => {
      const config = {
        platforms: {
          telegram: {
            enabled: true,
            token: 'telegram-token',
          },
          whatsapp: {
            enabled: true,
            provider: 'baileys' as const,
          },
        },
        database: {
          provider: 'supabase' as const,
          url: 'https://example.supabase.co',
          apiKey: 'key123',
        },
        logging: {
          level: 'debug' as const,
          format: 'pretty' as const,
        },
        ai: {
          provider: 'gemini' as const,
          apiKey: 'ai-key',
        },
      };
      expect(() => ChatbotConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject missing platforms', () => {
      const config = {};
      expect(() => ChatbotConfigSchema.parse(config)).toThrow(ZodError);
    });
  });

  describe('validateConfig', () => {
    it('should return validated config', () => {
      const config = {
        platforms: {
          telegram: {
            enabled: true,
            token: 'test-token',
          },
        },
      };
      const result = validateConfig(config);
      expect(result).toEqual(config);
    });

    it('should throw ZodError for invalid config', () => {
      const config = {
        platforms: {
          telegram: {
            enabled: true,
            token: '',
          },
        },
      };
      expect(() => validateConfig(config)).toThrow(ZodError);
    });
  });

  describe('safeValidateConfig', () => {
    it('should return success for valid config', () => {
      const config = {
        platforms: {
          telegram: {
            enabled: true,
            token: 'test-token',
          },
        },
      };
      const result = safeValidateConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(config);
      }
    });

    it('should return error for invalid config', () => {
      const config = {
        platforms: {
          telegram: {
            enabled: true,
            token: '',
          },
        },
      };
      const result = safeValidateConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should return detailed errors', () => {
      const config = {
        platforms: {},
        ai: {
          provider: 'openai' as const,
          apiKey: '',
        },
      };
      const result = safeValidateConfig(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
