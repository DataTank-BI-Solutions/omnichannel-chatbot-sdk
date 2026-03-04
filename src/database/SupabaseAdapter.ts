import { and, desc, eq } from 'drizzle-orm';
import { type PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type {
  Conversation,
  IDatabaseAdapter,
  PlatformType,
  StoredMessage,
  User,
} from '../types/index.js';
import * as schema from './schema.js';

/**
 * Supabase adapter configuration
 */
export interface SupabaseAdapterConfig {
  /**
   * Supabase project URL or database connection string
   */
  url: string;
  /**
   * Database connection options
   */
  options?: {
    /**
     * Maximum number of connections in the pool
     * @default 10
     */
    max?: number;
    /**
     * Idle timeout in seconds
     * @default 30
     */
    idleTimeout?: number;
  };
}

/**
 * Supabase database adapter using Drizzle ORM
 *
 * @remarks
 * This adapter provides database operations using Supabase/PostgreSQL as the backend
 * and Drizzle ORM for type-safe queries.
 *
 * @example
 * ```typescript
 * const adapter = new SupabaseAdapter({
 *   url: process.env.DATABASE_URL!,
 * });
 *
 * await adapter.connect();
 *
 * const user = await adapter.createUser({
 *   platformId: '12345',
 *   platform: 'telegram',
 *   metadata: {},
 * });
 * ```
 */
export class SupabaseAdapter implements IDatabaseAdapter {
  public readonly name = 'supabase';

  private readonly _config: SupabaseAdapterConfig;
  private _db?: PostgresJsDatabase<typeof schema>;
  private _client?: postgres.Sql;
  private _connected = false;

  constructor(config: SupabaseAdapterConfig) {
    this._config = config;
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this._connected) {
      return;
    }

    this._client = postgres(this._config.url, {
      prepare: false,
      max: this._config.options?.max ?? 10,
      idle_timeout: this._config.options?.idleTimeout ?? 30,
    });

    this._db = drizzle(this._client, { schema });
    this._connected = true;
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }

    await this._client?.end();
    this._connected = false;
    this._db = undefined;
    this._client = undefined;
  }

  /**
   * Check if connected to the database
   */
  isConnected(): boolean {
    return this._connected;
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  /**
   * Find a user by ID
   */
  async findUser(id: string): Promise<User | undefined> {
    this._ensureConnected();

    const [user] = await this._db!.select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    return user ? this._mapSchemaUserToUser(user) : undefined;
  }

  /**
   * Find a user by platform ID
   */
  async findUserByPlatformId(
    platform: PlatformType,
    platformId: string
  ): Promise<User | undefined> {
    this._ensureConnected();

    const [user] = await this._db!.select()
      .from(schema.users)
      .where(and(eq(schema.users.platform, platform), eq(schema.users.platformId, platformId)))
      .limit(1);

    return user ? this._mapSchemaUserToUser(user) : undefined;
  }

  /**
   * Create a new user
   */
  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    this._ensureConnected();

    const [user] = await this._db!.insert(schema.users)
      .values({
        platformId: data.platformId,
        platform: data.platform,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        phoneNumber: data.phoneNumber,
        email: data.email,
        language: data.language,
        metadata: data.metadata || {},
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create user');
    }

    return this._mapSchemaUserToUser(user);
  }

  /**
   * Update a user
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    this._ensureConnected();

    const [user] = await this._db!.update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    return this._mapSchemaUserToUser(user);
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Find a conversation by ID
   */
  async findConversation(id: string): Promise<Conversation | undefined> {
    this._ensureConnected();

    const [conversation] = await this._db!.select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .limit(1);

    return conversation ? this._mapSchemaConversationToConversation(conversation) : undefined;
  }

  /**
   * Find the active conversation for a user
   */
  async findActiveConversation(userId: string): Promise<Conversation | undefined> {
    this._ensureConnected();

    const [conversation] = await this._db!.select()
      .from(schema.conversations)
      .where(
        and(eq(schema.conversations.userId, userId), eq(schema.conversations.status, 'active'))
      )
      .orderBy(desc(schema.conversations.lastMessageAt))
      .limit(1);

    return conversation ? this._mapSchemaConversationToConversation(conversation) : undefined;
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: Omit<Conversation, 'id'>): Promise<Conversation> {
    this._ensureConnected();

    const [conversation] = await this._db!.insert(schema.conversations)
      .values({
        platform: data.platform,
        chatId: data.chatId,
        userId: data.userId,
        status: data.status,
        assignedAgentId: data.assignedAgentId,
        metadata: data.metadata || {},
        startedAt: data.startedAt,
        lastMessageAt: data.lastMessageAt,
      })
      .returning();

    if (!conversation) {
      throw new Error('Failed to create conversation');
    }

    return this._mapSchemaConversationToConversation(conversation);
  }

  /**
   * Update a conversation
   */
  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
    this._ensureConnected();

    const [conversation] = await this._db!.update(schema.conversations)
      .set(data)
      .where(eq(schema.conversations.id, id))
      .returning();

    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }

    return this._mapSchemaConversationToConversation(conversation);
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Save a message to the database
   */
  async saveMessage(message: StoredMessage): Promise<StoredMessage> {
    this._ensureConnected();

    const [savedMessage] = await this._db!.insert(schema.messages)
      .values({
        id: message.id,
        conversationId: message.conversationId,
        direction: message.direction,
        type: message.type,
        content: message.content,
        metadata: message.metadata || {},
        createdAt: message.createdAt,
      })
      .returning();

    if (!savedMessage) {
      throw new Error('Failed to save message');
    }

    return this._mapSchemaMessageToStoredMessage(savedMessage);
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(conversationId: string, limit = 50): Promise<StoredMessage[]> {
    this._ensureConnected();

    const messages = await this._db!.select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

    return messages.map((msg) => this._mapSchemaMessageToStoredMessage(msg));
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private _ensureConnected(): void {
    if (!this._connected || !this._db) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  private _mapSchemaUserToUser(user: schema.User): User {
    return {
      id: user.id,
      platformId: user.platformId,
      platform: user.platform as PlatformType,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      username: user.username || undefined,
      phoneNumber: user.phoneNumber || undefined,
      email: user.email || undefined,
      language: user.language || undefined,
      metadata: (user.metadata as Record<string, unknown>) || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private _mapSchemaConversationToConversation(conversation: schema.Conversation): Conversation {
    return {
      id: conversation.id,
      platform: conversation.platform as PlatformType,
      chatId: conversation.chatId,
      userId: conversation.userId,
      status: conversation.status,
      assignedAgentId: conversation.assignedAgentId || undefined,
      metadata: (conversation.metadata as Record<string, unknown>) || {},
      startedAt: conversation.startedAt,
      lastMessageAt: conversation.lastMessageAt,
    };
  }

  private _mapSchemaMessageToStoredMessage(message: schema.Message): StoredMessage {
    return {
      id: message.id,
      conversationId: message.conversationId,
      direction: message.direction,
      type: message.type as StoredMessage['type'],
      content: message.content,
      metadata: (message.metadata as Record<string, unknown>) || {},
      createdAt: message.createdAt,
    };
  }
}
