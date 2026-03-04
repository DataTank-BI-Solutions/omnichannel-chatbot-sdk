/**
 * Session management types
 */

/**
 * Session data structure
 */
export interface Session {
  /** Unique session identifier (typically userId) */
  id: string;
  /** Session data storage */
  data: Record<string, unknown>;
  /** When the session was created */
  createdAt: Date;
  /** When the session was last updated */
  updatedAt: Date;
  /** When the session expires (optional) */
  expiresAt?: Date;
}

/**
 * Session storage adapter interface
 */
export interface ISessionStorage {
  /**
   * Get session data by ID
   * @param sessionId - Unique session identifier
   * @returns Session data or undefined if not found
   */
  get(sessionId: string): Promise<Session | undefined>;

  /**
   * Set session data
   * @param sessionId - Unique session identifier
   * @param data - Session data to store
   * @param ttl - Time to live in seconds (optional)
   */
  set(sessionId: string, data: Record<string, unknown>, ttl?: number): Promise<void>;

  /**
   * Update existing session data (merge with existing)
   * @param sessionId - Unique session identifier
   * @param data - Partial data to merge
   */
  update(sessionId: string, data: Record<string, unknown>): Promise<void>;

  /**
   * Delete session by ID
   * @param sessionId - Unique session identifier
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Clear all sessions (use with caution)
   */
  clear(): Promise<void>;

  /**
   * Check if session exists
   * @param sessionId - Unique session identifier
   */
  has(sessionId: string): Promise<boolean>;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Storage adapter to use */
  storage?: ISessionStorage;
  /** Default TTL in seconds (default: 1 hour) */
  ttl?: number;
  /** Session key generator function */
  getSessionKey?: (userId: string, platform: string) => string;
}
