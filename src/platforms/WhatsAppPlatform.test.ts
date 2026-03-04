import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WhatsAppConfig } from '../types/index.js';
import { WhatsAppPlatform } from './WhatsAppPlatform.js';

describe('WhatsAppPlatform', () => {
  let platform: WhatsAppPlatform;
  let config: WhatsAppConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      provider: 'baileys',
    };
    platform = new WhatsAppPlatform(config);
  });

  afterEach(async () => {
    if (platform.isInitialized) {
      await platform.shutdown();
    }
  });

  describe('constructor', () => {
    it('should create platform with config', () => {
      expect(platform).toBeDefined();
      expect(platform.name).toBe('whatsapp');
      expect(platform.version).toBe('1.0.0');
    });

    it('should not be initialized initially', () => {
      expect(platform.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize platform', async () => {
      await platform.initialize();
      expect(platform.isInitialized).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown platform', async () => {
      await platform.initialize();
      await platform.shutdown();
      expect(platform.isInitialized).toBe(false);
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await platform.initialize();
    });

    it('should return not implemented error', async () => {
      const result = await platform.sendMessage('123456', {
        type: 'text',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('WhatsApp platform not yet implemented');
    });
  });
});
