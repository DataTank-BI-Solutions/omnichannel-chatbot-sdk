import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../core/Logger.js';
import type {
  IChatbot,
  ILogger,
  IPlatform,
  MessageResult,
  OutgoingMessage,
} from '../types/index.js';
import { type BroadcastContact, BroadcastPlugin } from './BroadcastPlugin.js';

describe('BroadcastPlugin', () => {
  let plugin: BroadcastPlugin;
  let mockChatbot: IChatbot;
  let mockLogger: ILogger;
  let mockTelegramPlatform: IPlatform;
  let mockWhatsAppPlatform: IPlatform;

  beforeEach(() => {
    plugin = new BroadcastPlugin();

    mockLogger = new Logger({ level: 'info' });
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'child').mockReturnValue(mockLogger);

    const successResult: MessageResult = {
      success: true,
      messageId: 'msg123',
    };

    mockTelegramPlatform = {
      name: 'telegram',
      version: '1.0.0',
      initialize: vi.fn(),
      shutdown: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(successResult),
      sendBulkMessages: vi.fn(),
    };

    mockWhatsAppPlatform = {
      name: 'whatsapp',
      version: '1.0.0',
      initialize: vi.fn(),
      shutdown: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(successResult),
      sendBulkMessages: vi.fn(),
    };

    mockChatbot = {
      config: {
        platforms: {},
      },
      platforms: new Map([
        ['telegram', mockTelegramPlatform],
        ['whatsapp', mockWhatsAppPlatform],
      ]),
      plugins: new Map(),
      router: {} as any,
      logger: mockLogger,
      use: vi.fn(),
      command: vi.fn(),
      on: vi.fn(),
      text: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      broadcast: vi.fn(),
    };
  });

  describe('plugin metadata', () => {
    it('should have correct name and version', () => {
      expect(plugin.name).toBe('BroadcastPlugin');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultPlugin = new BroadcastPlugin();
      defaultPlugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('BroadcastPlugin installed', {
        config: {
          featureKey: 'broadcast',
          rateLimit: {
            telegram: 25,
            whatsapp: 10,
          },
          retry: {
            maxAttempts: 3,
            backoffMs: 1000,
          },
          whatsapp: {
            enabled: false,
            templateId: '',
            requireTemplateOutside24h: true,
          },
          contacts: {
            autoSyncFromSessions: true,
            captureDisplayNames: true,
          },
        },
      });
    });

    it('should accept custom configuration', () => {
      const customPlugin = new BroadcastPlugin({
        featureKey: 'custom_broadcast',
        rateLimit: {
          telegram: 30,
          whatsapp: 15,
        },
        retry: {
          maxAttempts: 5,
          backoffMs: 2000,
        },
      });
      customPlugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('BroadcastPlugin installed', {
        config: {
          featureKey: 'custom_broadcast',
          rateLimit: {
            telegram: 30,
            whatsapp: 15,
          },
          retry: {
            maxAttempts: 5,
            backoffMs: 2000,
          },
          whatsapp: {
            enabled: false,
            templateId: '',
            requireTemplateOutside24h: true,
          },
          contacts: {
            autoSyncFromSessions: true,
            captureDisplayNames: true,
          },
        },
      });
    });
  });

  describe('contact management', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    describe('addContact', () => {
      it('should add a contact', () => {
        const contact = plugin.addContact({
          userId: 'user123',
          platform: 'telegram',
          chatId: 'chat123',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          metadata: {},
        });

        expect(contact.id).toBeDefined();
        expect(contact.userId).toBe('user123');
        expect(contact.platform).toBe('telegram');
        expect(plugin.getContact(contact.id)).toEqual(contact);
      });

      it('should auto-generate ID and timestamps', () => {
        const contact = plugin.addContact({
          userId: 'user123',
          platform: 'telegram',
          chatId: 'chat123',
        });

        expect(contact.id).toMatch(/^contact_\d+$/);
        expect(contact.createdAt).toBeInstanceOf(Date);
        expect(contact.updatedAt).toBeInstanceOf(Date);
      });

      it('should log contact addition', () => {
        const contact = plugin.addContact({
          userId: 'user123',
          platform: 'telegram',
          chatId: 'chat123',
        });

        expect(mockLogger.info).toHaveBeenCalledWith('Contact added', {
          contactId: contact.id,
          userId: 'user123',
          platform: 'telegram',
        });
      });
    });

    describe('removeContact', () => {
      it('should remove a contact', () => {
        const contact = plugin.addContact({
          userId: 'user123',
          platform: 'telegram',
          chatId: 'chat123',
        });

        const result = plugin.removeContact(contact.id);

        expect(result).toBe(true);
        expect(plugin.getContact(contact.id)).toBeUndefined();
      });

      it('should return false for non-existent contact', () => {
        const result = plugin.removeContact('nonexistent');
        expect(result).toBe(false);
      });
    });

    describe('getAllContacts', () => {
      it('should return all contacts', () => {
        const contact1 = plugin.addContact({
          userId: 'user1',
          platform: 'telegram',
          chatId: 'chat1',
        });

        const contact2 = plugin.addContact({
          userId: 'user2',
          platform: 'whatsapp',
          chatId: 'chat2',
        });

        const contacts = plugin.getAllContacts();
        expect(contacts).toHaveLength(2);
        expect(contacts).toContainEqual(contact1);
        expect(contacts).toContainEqual(contact2);
      });

      it('should filter by platform', () => {
        plugin.addContact({
          userId: 'user1',
          platform: 'telegram',
          chatId: 'chat1',
        });

        plugin.addContact({
          userId: 'user2',
          platform: 'whatsapp',
          chatId: 'chat2',
        });

        const contacts = plugin.getAllContacts({ platforms: ['telegram'] });
        expect(contacts).toHaveLength(1);
        expect(contacts[0].platform).toBe('telegram');
      });

      it('should exclude contacts by ID', () => {
        const contact1 = plugin.addContact({
          userId: 'user1',
          platform: 'telegram',
          chatId: 'chat1',
        });

        plugin.addContact({
          userId: 'user2',
          platform: 'telegram',
          chatId: 'chat2',
        });

        const contacts = plugin.getAllContacts({ excludeIds: [contact1.id] });
        expect(contacts).toHaveLength(1);
        expect(contacts[0].userId).toBe('user2');
      });
    });
  });

  describe('broadcast creation', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should create a broadcast', () => {
      const message: OutgoingMessage = {
        type: 'text',
        text: 'Hello everyone!',
      };
      const broadcast = plugin.createBroadcast({
        name: 'Test Broadcast',
        message,
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      expect(broadcast.id).toMatch(/^broadcast_\d+$/);
      expect(broadcast.name).toBe('Test Broadcast');
      expect(broadcast.message).toEqual(message);
      expect(broadcast.status).toBe('draft');
      expect(broadcast.sentCount).toBe(0);
      expect(broadcast.failedCount).toBe(0);
    });

    it('should get broadcast by ID', () => {
      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      expect(plugin.getBroadcast(broadcast.id)).toEqual(broadcast);
    });

    it('should get all broadcasts', () => {
      const broadcast1 = plugin.createBroadcast({
        name: 'Test 1',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      const broadcast2 = plugin.createBroadcast({
        name: 'Test 2',
        message: { type: 'text', text: 'World' },
        targetPlatforms: ['whatsapp'],
        totalRecipients: 0,
      });

      const broadcasts = plugin.getAllBroadcasts();
      expect(broadcasts).toHaveLength(2);
      expect(broadcasts).toContainEqual(broadcast1);
      expect(broadcasts).toContainEqual(broadcast2);
    });

    it('should filter broadcasts by status', () => {
      plugin.createBroadcast({
        name: 'Draft',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      const broadcasts = plugin.getAllBroadcasts('draft');
      expect(broadcasts).toHaveLength(1);
      expect(broadcasts[0].status).toBe('draft');
    });
  });

  describe('sending broadcasts', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should send broadcast to all contacts', async () => {
      // Add contacts
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      plugin.addContact({
        userId: 'user2',
        platform: 'telegram',
        chatId: 'chat2',
      });

      // Create broadcast
      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      // Send broadcast
      const stats = await plugin.sendBroadcast(broadcast.id);

      expect(stats.total).toBe(2);
      expect(stats.sent).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(mockTelegramPlatform.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should update broadcast status during sending', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      await plugin.sendBroadcast(broadcast.id);

      const updated = plugin.getBroadcast(broadcast.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.startedAt).toBeInstanceOf(Date);
      expect(updated?.completedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent broadcast', async () => {
      await expect(plugin.sendBroadcast('nonexistent')).rejects.toThrow(
        'Broadcast nonexistent not found'
      );
    });

    it('should throw error if already sending', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      // Start sending
      const promise = plugin.sendBroadcast(broadcast.id);

      // Try to send again immediately
      await expect(plugin.sendBroadcast(broadcast.id)).rejects.toThrow('is already sending');

      await promise;
    });

    it('should handle send failures with retry', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      // Mock failure
      vi.mocked(mockTelegramPlatform.sendMessage).mockResolvedValue({
        success: false,
        error: new Error('Send failed'),
      });

      const stats = await plugin.sendBroadcast(broadcast.id);

      expect(stats.failed).toBe(1);
      expect(stats.sent).toBe(0);
      expect(mockTelegramPlatform.sendMessage).toHaveBeenCalledTimes(3); // 3 retries
    });

    it('should filter contacts by target platforms', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      plugin.addContact({
        userId: 'user2',
        platform: 'whatsapp',
        chatId: 'chat2',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      const stats = await plugin.sendBroadcast(broadcast.id);

      expect(stats.total).toBe(1);
      expect(mockTelegramPlatform.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockWhatsAppPlatform.sendMessage).not.toHaveBeenCalled();
    });

    it('should apply rate limiting', async () => {
      // Create plugin with lower rate limit
      const rateLimitedPlugin = new BroadcastPlugin({
        rateLimit: {
          telegram: 10, // 10 messages per second = 100ms delay
        },
      });
      rateLimitedPlugin.install(mockChatbot);

      // Add 3 contacts
      rateLimitedPlugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      rateLimitedPlugin.addContact({
        userId: 'user2',
        platform: 'telegram',
        chatId: 'chat2',
      });

      rateLimitedPlugin.addContact({
        userId: 'user3',
        platform: 'telegram',
        chatId: 'chat3',
      });

      const broadcast = rateLimitedPlugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      const startTime = Date.now();
      await rateLimitedPlugin.sendBroadcast(broadcast.id);
      const duration = Date.now() - startTime;

      // Should take at least 200ms for 3 messages at 10 msg/sec (100ms each)
      expect(duration).toBeGreaterThanOrEqual(200);
    });
  });

  describe('broadcast cancellation', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should cancel a broadcast', () => {
      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      const result = plugin.cancelBroadcast(broadcast.id);

      expect(result).toBe(true);
      expect(plugin.getBroadcast(broadcast.id)?.status).toBe('cancelled');
    });

    it('should return false for non-existent broadcast', () => {
      expect(plugin.cancelBroadcast('nonexistent')).toBe(false);
    });

    it('should return false for completed broadcast', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      await plugin.sendBroadcast(broadcast.id);

      expect(plugin.cancelBroadcast(broadcast.id)).toBe(false);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should calculate broadcast stats correctly', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      plugin.addContact({
        userId: 'user2',
        platform: 'telegram',
        chatId: 'chat2',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      const stats = await plugin.sendBroadcast(broadcast.id);

      expect(stats.total).toBe(2);
      expect(stats.sent).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate success rate correctly with failures', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      plugin.addContact({
        userId: 'user2',
        platform: 'telegram',
        chatId: 'chat2',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      // Mock one success, one failure
      let callCount = 0;
      vi.mocked(mockTelegramPlatform.sendMessage).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { success: true, messageId: 'msg1' };
        }
        return { success: false, error: new Error('Failed') };
      });

      const stats = await plugin.sendBroadcast(broadcast.id);

      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe(50);
    });
  });

  describe('recipients', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should track recipients for broadcast', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      await plugin.sendBroadcast(broadcast.id);

      const recipients = plugin.getRecipients(broadcast.id);
      expect(recipients).toHaveLength(1);
      expect(recipients[0].status).toBe('sent');
      expect(recipients[0].messageId).toBeDefined();
    });

    it('should filter recipients by status', async () => {
      const contact1 = plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      const contact2 = plugin.addContact({
        userId: 'user2',
        platform: 'telegram',
        chatId: 'chat2',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      // Mock one success, one failure
      vi.mocked(mockTelegramPlatform.sendMessage).mockImplementation(
        async (_chatId: string, _message: OutgoingMessage) => {
          if (_chatId === contact1.chatId) {
            return { success: true, messageId: 'msg1' };
          }
          return { success: false, error: new Error('Failed') };
        }
      );

      await plugin.sendBroadcast(broadcast.id);

      const sent = plugin.getRecipients(broadcast.id, 'sent');
      const failed = plugin.getRecipients(broadcast.id, 'failed');

      expect(sent).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });
  });

  describe('lifecycle hooks', () => {
    it('should log on install', () => {
      plugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('BroadcastPlugin installed', {
        config: expect.any(Object),
      });
    });

    it('should clear state on uninstall', () => {
      plugin.install(mockChatbot);

      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      plugin.uninstall();

      expect(mockLogger.info).toHaveBeenCalledWith('BroadcastPlugin uninstalled');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should handle multiple concurrent broadcasts', async () => {
      // Add contacts
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      plugin.addContact({
        userId: 'user2',
        platform: 'whatsapp',
        chatId: 'chat2',
      });

      // Create two broadcasts
      const broadcast1 = plugin.createBroadcast({
        name: 'Telegram Broadcast',
        message: { type: 'text', text: 'Hello Telegram' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      const broadcast2 = plugin.createBroadcast({
        name: 'WhatsApp Broadcast',
        message: { type: 'text', text: 'Hello WhatsApp' },
        targetPlatforms: ['whatsapp'],
        totalRecipients: 0,
      });

      // Send both concurrently
      const [stats1, stats2] = await Promise.all([
        plugin.sendBroadcast(broadcast1.id),
        plugin.sendBroadcast(broadcast2.id),
      ]);

      expect(stats1.sent).toBe(1);
      expect(stats2.sent).toBe(1);
      expect(mockTelegramPlatform.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockWhatsAppPlatform.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle platform not found error', async () => {
      plugin.addContact({
        userId: 'user1',
        platform: 'telegram',
        chatId: 'chat1',
      });

      const broadcast = plugin.createBroadcast({
        name: 'Test',
        message: { type: 'text', text: 'Hello' },
        targetPlatforms: ['telegram'],
        totalRecipients: 0,
      });

      // Remove platform
      mockChatbot.platforms.delete('telegram');

      const stats = await plugin.sendBroadcast(broadcast.id);

      expect(stats.failed).toBe(1);
      expect(stats.sent).toBe(0);
    });
  });
});
