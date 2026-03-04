import { MemoryStorage } from './MemoryStorage.js';
import type { ISessionStorage, Session, SessionConfig } from './types.js';

/**
 * Session manager for handling user sessions
 *
 * @remarks
 * Provides a high-level API for managing user sessions with automatic
 * session key generation and TTL management.
 *
 * @example
 * ```typescript
 * const sessionManager = new SessionManager({
 *   ttl: 3600, // 1 hour
 * });
 *
 * // Get or create session
 * const session = await sessionManager.getSession('user123', 'telegram');
 *
 * // Store data in session
 * await sessionManager.setSessionData('user123', 'telegram', {
 *   language: 'en',
 *   step: 1,
 * });
 *
 * // Get session data
 * const data = await sessionManager.getSessionData('user123', 'telegram');
 * ```
 */
export class SessionManager {
  private readonly _storage: ISessionStorage;
  private readonly _ttl: number;
  private readonly _getSessionKey: (userId: string, platform: string) => string;

  constructor(config: SessionConfig = {}) {
    this._storage = config.storage ?? new MemoryStorage();
    this._ttl = config.ttl ?? 3600; // 1 hour default
    this._getSessionKey = config.getSessionKey ?? ((userId, platform) => `${platform}:${userId}`);
  }

  /**
   * Get session storage adapter
   */
  get storage(): ISessionStorage {
    return this._storage;
  }

  /**
   * Get or create a session
   *
   * @param userId - User identifier
   * @param platform - Platform name
   * @returns Session object
   */
  async getSession(userId: string, platform: string): Promise<Session> {
    const sessionKey = this._getSessionKey(userId, platform);
    let session = await this._storage.get(sessionKey);

    if (!session) {
      // Create new session
      const now = new Date();
      session = {
        id: sessionKey,
        data: {},
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + this._ttl * 1000),
      };
      await this._storage.set(sessionKey, session.data, this._ttl);
    }

    return session;
  }

  /**
   * Get session data
   *
   * @param userId - User identifier
   * @param platform - Platform name
   * @returns Session data or empty object if session doesn't exist
   */
  async getSessionData(userId: string, platform: string): Promise<Record<string, unknown>> {
    const session = await this.getSession(userId, platform);
    return session.data;
  }

  /**
   * Set session data (replaces existing data)
   *
   * @param userId - User identifier
   * @param platform - Platform name
   * @param data - Data to store in session
   */
  async setSessionData(
    userId: string,
    platform: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const sessionKey = this._getSessionKey(userId, platform);
    await this._storage.set(sessionKey, data, this._ttl);
  }

  /**
   * Update session data (merge with existing)
   *
   * @param userId - User identifier
   * @param platform - Platform name
   * @param data - Partial data to merge
   */
  async updateSessionData(
    userId: string,
    platform: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const sessionKey = this._getSessionKey(userId, platform);
    await this._storage.update(sessionKey, data);
  }

  /**
   * Get a specific value from session
   *
   * @param userId - User identifier
   * @param platform - Platform name
   * @param key - Key to retrieve
   * @returns Value or undefined if not found
   */
  async get<T = unknown>(userId: string, platform: string, key: string): Promise<T | undefined> {
    const data = await this.getSessionData(userId, platform);
    return data[key] as T | undefined;
  }

  /**
   * Set a specific value in session
   *
   * @param userId - User identifier
   * @param platform - Platform name
   * @param key - Key to set
   * @param value - Value to store
   */
  async set(userId: string, platform: string, key: string, value: unknown): Promise<void> {
    await this.updateSessionData(userId, platform, { [key]: value });
  }

  /**
   * Delete a specific key from session
   *
   * @param userId - User identifier
   * @param platform - Platform name
   * @param key - Key to delete
   */
  async deleteKey(userId: string, platform: string, key: string): Promise<void> {
    const data = await this.getSessionData(userId, platform);
    delete data[key];
    await this.setSessionData(userId, platform, data);
  }

  /**
   * Delete entire session
   *
   * @param userId - User identifier
   * @param platform - Platform name
   */
  async deleteSession(userId: string, platform: string): Promise<void> {
    const sessionKey = this._getSessionKey(userId, platform);
    await this._storage.delete(sessionKey);
  }

  /**
   * Check if session exists
   *
   * @param userId - User identifier
   * @param platform - Platform name
   */
  async hasSession(userId: string, platform: string): Promise<boolean> {
    const sessionKey = this._getSessionKey(userId, platform);
    return this._storage.has(sessionKey);
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    await this._storage.clear();
  }
}
