import type { ISessionStorage, Session } from './types.js';

/**
 * In-memory session storage adapter
 *
 * @remarks
 * This adapter stores sessions in memory (Map).
 * Data is lost when the process restarts.
 * Suitable for development and testing.
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorage();
 *
 * await storage.set('user123', { name: 'John' });
 * const session = await storage.get('user123');
 * ```
 */
export class MemoryStorage implements ISessionStorage {
  private readonly _sessions: Map<string, Session> = new Map();
  private readonly _timers: Map<string, NodeJS.Timeout> = new Map();

  async get(sessionId: string): Promise<Session | undefined> {
    const session = this._sessions.get(sessionId);

    // Check if expired
    if (session?.expiresAt && session.expiresAt < new Date()) {
      await this.delete(sessionId);
      return undefined;
    }

    return session;
  }

  async set(sessionId: string, data: Record<string, unknown>, ttl?: number): Promise<void> {
    const now = new Date();
    const expiresAt = ttl ? new Date(now.getTime() + ttl * 1000) : undefined;

    const session: Session = {
      id: sessionId,
      data,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    this._sessions.set(sessionId, session);

    // Set expiration timer
    if (ttl) {
      this._clearTimer(sessionId);
      const timer = setTimeout(() => {
        this.delete(sessionId);
      }, ttl * 1000);
      this._timers.set(sessionId, timer);
    }
  }

  async update(sessionId: string, data: Record<string, unknown>): Promise<void> {
    const session = await this.get(sessionId);

    if (!session) {
      // Create new session if doesn't exist
      await this.set(sessionId, data);
      return;
    }

    session.data = { ...session.data, ...data };
    session.updatedAt = new Date();
    this._sessions.set(sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    this._sessions.delete(sessionId);
    this._clearTimer(sessionId);
  }

  async clear(): Promise<void> {
    this._sessions.clear();

    // Clear all timers
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();
  }

  async has(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    return session !== undefined;
  }

  /**
   * Get the number of active sessions
   */
  get size(): number {
    return this._sessions.size;
  }

  /**
   * Clear expiration timer for a session
   */
  private _clearTimer(sessionId: string): void {
    const timer = this._timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(sessionId);
    }
  }
}
