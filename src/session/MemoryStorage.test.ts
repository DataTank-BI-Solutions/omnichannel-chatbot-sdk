import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './MemoryStorage.js';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('set and get', () => {
    it('should store and retrieve session data', async () => {
      await storage.set('user123', { name: 'John', age: 30 });

      const session = await storage.get('user123');

      expect(session).toBeDefined();
      expect(session?.id).toBe('user123');
      expect(session?.data).toEqual({ name: 'John', age: 30 });
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return undefined for non-existent session', async () => {
      const session = await storage.get('nonexistent');

      expect(session).toBeUndefined();
    });

    it('should set expiration time when TTL is provided', async () => {
      await storage.set('user123', { name: 'John' }, 3600);

      const session = await storage.get('user123');

      expect(session?.expiresAt).toBeInstanceOf(Date);
      expect(session?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not set expiration when TTL is not provided', async () => {
      await storage.set('user123', { name: 'John' });

      const session = await storage.get('user123');

      expect(session?.expiresAt).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should merge data with existing session', async () => {
      await storage.set('user123', { name: 'John', age: 30 });
      await storage.update('user123', { city: 'NYC' });

      const session = await storage.get('user123');

      expect(session?.data).toEqual({ name: 'John', age: 30, city: 'NYC' });
    });

    it('should update existing values', async () => {
      await storage.set('user123', { name: 'John', age: 30 });
      await storage.update('user123', { age: 31 });

      const session = await storage.get('user123');

      expect(session?.data).toEqual({ name: 'John', age: 31 });
    });

    it('should create new session if does not exist', async () => {
      await storage.update('user456', { name: 'Jane' });

      const session = await storage.get('user456');

      expect(session).toBeDefined();
      expect(session?.data).toEqual({ name: 'Jane' });
    });

    it('should update updatedAt timestamp', async () => {
      await storage.set('user123', { name: 'John' });

      const before = await storage.get('user123');
      await new Promise((resolve) => setTimeout(resolve, 50));

      await storage.update('user123', { age: 30 });

      const after = await storage.get('user123');

      expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(before?.updatedAt.getTime() || 0);
    });
  });

  describe('delete', () => {
    it('should delete session', async () => {
      await storage.set('user123', { name: 'John' });

      expect(await storage.has('user123')).toBe(true);

      await storage.delete('user123');

      expect(await storage.has('user123')).toBe(false);
    });

    it('should not throw when deleting non-existent session', async () => {
      await expect(storage.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all sessions', async () => {
      await storage.set('user1', { name: 'John' });
      await storage.set('user2', { name: 'Jane' });
      await storage.set('user3', { name: 'Bob' });

      expect(storage.size).toBe(3);

      await storage.clear();

      expect(storage.size).toBe(0);
      expect(await storage.has('user1')).toBe(false);
      expect(await storage.has('user2')).toBe(false);
      expect(await storage.has('user3')).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing session', async () => {
      await storage.set('user123', { name: 'John' });

      expect(await storage.has('user123')).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      expect(await storage.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL and expiration', () => {
    it('should auto-delete expired sessions', async () => {
      vi.useFakeTimers();

      await storage.set('user123', { name: 'John' }, 1); // 1 second TTL

      expect(await storage.has('user123')).toBe(true);

      // Fast-forward 1.5 seconds
      vi.advanceTimersByTime(1500);

      expect(await storage.has('user123')).toBe(false);

      vi.useRealTimers();
    });

    it('should return undefined for expired session on get', async () => {
      const pastDate = new Date(Date.now() - 10000); // 10 seconds ago
      await storage.set('user123', { name: 'John' }, 5);

      // Manually set expiration to past
      const session = await storage.get('user123');
      if (session) {
        session.expiresAt = pastDate;
      }

      const retrieved = await storage.get('user123');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return correct number of sessions', async () => {
      expect(storage.size).toBe(0);

      await storage.set('user1', { name: 'John' });
      expect(storage.size).toBe(1);

      await storage.set('user2', { name: 'Jane' });
      expect(storage.size).toBe(2);

      await storage.delete('user1');
      expect(storage.size).toBe(1);
    });
  });
});
