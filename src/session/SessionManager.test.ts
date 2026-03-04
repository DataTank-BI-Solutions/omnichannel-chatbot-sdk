import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from './MemoryStorage.js';
import { SessionManager } from './SessionManager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager({ ttl: 3600 });
  });

  describe('constructor', () => {
    it('should create with default memory storage', () => {
      const sm = new SessionManager();
      expect(sm.storage).toBeInstanceOf(MemoryStorage);
    });

    it('should accept custom storage', () => {
      const customStorage = new MemoryStorage();
      const sm = new SessionManager({ storage: customStorage });
      expect(sm.storage).toBe(customStorage);
    });

    it('should use default TTL of 1 hour', () => {
      const sm = new SessionManager();
      expect(sm).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('should create new session if does not exist', async () => {
      const session = await sessionManager.getSession('user123', 'telegram');

      expect(session).toBeDefined();
      expect(session.id).toBe('telegram:user123');
      expect(session.data).toEqual({});
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should return existing session', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
      });

      const session = await sessionManager.getSession('user123', 'telegram');

      expect(session.data).toEqual({ name: 'John' });
    });
  });

  describe('getSessionData', () => {
    it('should return session data', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
        age: 30,
      });

      const data = await sessionManager.getSessionData('user123', 'telegram');

      expect(data).toEqual({ name: 'John', age: 30 });
    });

    it('should return empty object for new session', async () => {
      const data = await sessionManager.getSessionData('newuser', 'telegram');

      expect(data).toEqual({});
    });
  });

  describe('setSessionData', () => {
    it('should set session data', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
        age: 30,
      });

      const data = await sessionManager.getSessionData('user123', 'telegram');

      expect(data).toEqual({ name: 'John', age: 30 });
    });

    it('should replace existing data', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
      });
      await sessionManager.setSessionData('user123', 'telegram', { age: 30 });

      const data = await sessionManager.getSessionData('user123', 'telegram');

      expect(data).toEqual({ age: 30 });
    });
  });

  describe('updateSessionData', () => {
    it('should merge with existing data', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
        age: 30,
      });
      await sessionManager.updateSessionData('user123', 'telegram', {
        city: 'NYC',
      });

      const data = await sessionManager.getSessionData('user123', 'telegram');

      expect(data).toEqual({ name: 'John', age: 30, city: 'NYC' });
    });

    it('should update existing values', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
        age: 30,
      });
      await sessionManager.updateSessionData('user123', 'telegram', {
        age: 31,
      });

      const data = await sessionManager.getSessionData('user123', 'telegram');

      expect(data).toEqual({ name: 'John', age: 31 });
    });
  });

  describe('get and set', () => {
    it('should get specific value from session', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
        age: 30,
      });

      const name = await sessionManager.get<string>('user123', 'telegram', 'name');
      const age = await sessionManager.get<number>('user123', 'telegram', 'age');

      expect(name).toBe('John');
      expect(age).toBe(30);
    });

    it('should return undefined for non-existent key', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
      });

      const value = await sessionManager.get('user123', 'telegram', 'nonexistent');

      expect(value).toBeUndefined();
    });

    it('should set specific value in session', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
      });

      await sessionManager.set('user123', 'telegram', 'age', 30);

      const data = await sessionManager.getSessionData('user123', 'telegram');

      expect(data).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('deleteKey', () => {
    it('should delete specific key from session', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
        age: 30,
        city: 'NYC',
      });

      await sessionManager.deleteKey('user123', 'telegram', 'age');

      const data = await sessionManager.getSessionData('user123', 'telegram');

      expect(data).toEqual({ name: 'John', city: 'NYC' });
    });
  });

  describe('deleteSession', () => {
    it('should delete entire session', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
      });

      expect(await sessionManager.hasSession('user123', 'telegram')).toBe(true);

      await sessionManager.deleteSession('user123', 'telegram');

      expect(await sessionManager.hasSession('user123', 'telegram')).toBe(false);
    });
  });

  describe('hasSession', () => {
    it('should return true for existing session', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        name: 'John',
      });

      expect(await sessionManager.hasSession('user123', 'telegram')).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      expect(await sessionManager.hasSession('nonexistent', 'telegram')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all sessions', async () => {
      await sessionManager.setSessionData('user1', 'telegram', {
        name: 'John',
      });
      await sessionManager.setSessionData('user2', 'whatsapp', {
        name: 'Jane',
      });

      await sessionManager.clearAll();

      expect(await sessionManager.hasSession('user1', 'telegram')).toBe(false);
      expect(await sessionManager.hasSession('user2', 'whatsapp')).toBe(false);
    });
  });

  describe('custom session key generator', () => {
    it('should use custom key generator', async () => {
      const sm = new SessionManager({
        getSessionKey: (userId, platform) => `custom-${platform}-${userId}`,
      });

      await sm.setSessionData('user123', 'telegram', { name: 'John' });

      const session = await sm.storage.get('custom-telegram-user123');

      expect(session).toBeDefined();
      expect(session?.data).toEqual({ name: 'John' });
    });
  });

  describe('platform separation', () => {
    it('should separate sessions by platform', async () => {
      await sessionManager.setSessionData('user123', 'telegram', {
        source: 'telegram',
      });
      await sessionManager.setSessionData('user123', 'whatsapp', {
        source: 'whatsapp',
      });

      const telegramData = await sessionManager.getSessionData('user123', 'telegram');
      const whatsappData = await sessionManager.getSessionData('user123', 'whatsapp');

      expect(telegramData).toEqual({ source: 'telegram' });
      expect(whatsappData).toEqual({ source: 'whatsapp' });
    });
  });
});
