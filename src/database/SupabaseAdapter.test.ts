import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conversation, StoredMessage, User } from '../types/index.js';
import { SupabaseAdapter } from './SupabaseAdapter.js';

// Mock postgres module
vi.mock('postgres', () => {
  return {
    default: vi.fn(() => ({
      end: vi.fn(),
    })),
  };
});

// Mock drizzle-orm
vi.mock('drizzle-orm/postgres-js', () => {
  return {
    drizzle: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    })),
  };
});

describe('SupabaseAdapter', () => {
  let adapter: SupabaseAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SupabaseAdapter({
      url: 'postgresql://test:test@localhost:5432/test',
    });
  });

  describe('constructor', () => {
    it('should create adapter with config', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('supabase');
    });

    it('should not be connected initially', () => {
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('connect and disconnect', () => {
    it('should connect to database', async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      await adapter.connect();
      await adapter.connect(); // Should not throw
      expect(adapter.isConnected()).toBe(true);
    });

    it('should disconnect from database', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });

    it('should not error when disconnecting if not connected', async () => {
      await adapter.disconnect(); // Should not throw
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error when calling methods without connecting', async () => {
      await expect(adapter.findUser('test-id')).rejects.toThrow(
        'Database not connected. Call connect() first.'
      );
    });
  });

  describe('User operations', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    afterEach(async () => {
      await adapter.disconnect();
    });

    it('should have findUser method', () => {
      expect(typeof adapter.findUser).toBe('function');
    });

    it('should have findUserByPlatformId method', () => {
      expect(typeof adapter.findUserByPlatformId).toBe('function');
    });

    it('should have createUser method', () => {
      expect(typeof adapter.createUser).toBe('function');
    });

    it('should have updateUser method', () => {
      expect(typeof adapter.updateUser).toBe('function');
    });
  });

  describe('Conversation operations', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    afterEach(async () => {
      await adapter.disconnect();
    });

    it('should have findConversation method', () => {
      expect(typeof adapter.findConversation).toBe('function');
    });

    it('should have findActiveConversation method', () => {
      expect(typeof adapter.findActiveConversation).toBe('function');
    });

    it('should have createConversation method', () => {
      expect(typeof adapter.createConversation).toBe('function');
    });

    it('should have updateConversation method', () => {
      expect(typeof adapter.updateConversation).toBe('function');
    });
  });

  describe('Message operations', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    afterEach(async () => {
      await adapter.disconnect();
    });

    it('should have saveMessage method', () => {
      expect(typeof adapter.saveMessage).toBe('function');
    });

    it('should have getConversationMessages method', () => {
      expect(typeof adapter.getConversationMessages).toBe('function');
    });
  });

  describe('config options', () => {
    it('should accept connection pool options', () => {
      const adapterWithOptions = new SupabaseAdapter({
        url: 'postgresql://test:test@localhost:5432/test',
        options: {
          max: 20,
          idleTimeout: 60,
        },
      });

      expect(adapterWithOptions).toBeDefined();
    });
  });
});
