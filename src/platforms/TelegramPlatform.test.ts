import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TelegramConfig } from '../types/index.js';
import { TelegramPlatform } from './TelegramPlatform.js';

// Mock grammY
vi.mock('grammy', () => {
  return {
    Bot: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      api: {
        setWebhook: vi.fn(),
        sendMessage: vi.fn().mockResolvedValue({ message_id: 123 }),
        sendPhoto: vi.fn().mockResolvedValue({ message_id: 124 }),
        sendVideo: vi.fn().mockResolvedValue({ message_id: 125 }),
        sendDocument: vi.fn().mockResolvedValue({ message_id: 126 }),
        sendAudio: vi.fn().mockResolvedValue({ message_id: 127 }),
        sendLocation: vi.fn().mockResolvedValue({ message_id: 128 }),
      },
    })),
    webhookCallback: vi.fn().mockReturnValue(() => {}),
  };
});

describe('TelegramPlatform', () => {
  let platform: TelegramPlatform;
  let config: TelegramConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      enabled: true,
      token: 'test-token-123',
      useWebhook: false,
    };
    platform = new TelegramPlatform(config);
  });

  afterEach(async () => {
    if (platform.isInitialized) {
      await platform.shutdown();
    }
  });

  describe('constructor', () => {
    it('should create platform with config', () => {
      expect(platform).toBeDefined();
      expect(platform.name).toBe('telegram');
      expect(platform.version).toBe('1.0.0');
    });

    it('should not be initialized initially', () => {
      expect(platform.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize in polling mode', async () => {
      await platform.initialize();
      expect(platform.isInitialized).toBe(true);
    });

    it('should initialize in webhook mode', async () => {
      const webhookConfig: TelegramConfig = {
        enabled: true,
        token: 'test-token',
        useWebhook: true,
        webhookUrl: 'https://example.com/webhook',
      };
      const webhookPlatform = new TelegramPlatform(webhookConfig);

      await webhookPlatform.initialize();
      expect(webhookPlatform.isInitialized).toBe(true);

      await webhookPlatform.shutdown();
    });

    it('should not reinitialize if already initialized', async () => {
      await platform.initialize();
      await platform.initialize(); // Should not throw
      expect(platform.isInitialized).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown platform', async () => {
      await platform.initialize();
      await platform.shutdown();
      expect(platform.isInitialized).toBe(false);
    });

    it('should not error when shutting down if not initialized', async () => {
      await platform.shutdown(); // Should not throw
      expect(platform.isInitialized).toBe(false);
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await platform.initialize();
    });

    it('should send text message', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'text',
        text: 'Hello, World!',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('123');
    });

    it('should send image message', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'image',
        text: 'Check this out!',
        media: {
          type: 'image',
          url: 'https://example.com/image.jpg',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('124');
    });

    it('should send video message', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'video',
        media: {
          type: 'video',
          url: 'https://example.com/video.mp4',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('125');
    });

    it('should send document message', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'document',
        media: {
          type: 'document',
          url: 'https://example.com/doc.pdf',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('126');
    });

    it('should send audio message', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'audio',
        media: {
          type: 'audio',
          url: 'https://example.com/audio.mp3',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('127');
    });

    it('should send location message', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'location',
        location: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('128');
    });

    it('should return error for missing media URL', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'image',
        media: {
          type: 'image',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Image URL is required');
    });

    it('should return error for missing location', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'location',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Location is required');
    });

    it('should return error for unsupported message type', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'sticker' as any,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unsupported message type');
    });
  });

  describe('sendMessage without initialization', () => {
    it('should return error when not initialized', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'text',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Telegram bot not initialized');
    });
  });

  describe('setChatbot', () => {
    it('should set chatbot instance', () => {
      const mockChatbot = {} as any;
      platform.setChatbot(mockChatbot);
      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('getWebhookCallback', () => {
    it('should throw error if bot not initialized', () => {
      expect(() => platform.getWebhookCallback()).toThrow('Telegram bot not initialized');
    });

    it('should return webhook callback after initialization', async () => {
      await platform.initialize();
      const callback = platform.getWebhookCallback();
      expect(callback).toBeDefined();
    });
  });
});
