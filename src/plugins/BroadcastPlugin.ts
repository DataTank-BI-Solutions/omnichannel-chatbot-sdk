import type { IChatbot, OutgoingMessage, PlatformType } from '../types/index.js';
import { BasePlugin } from './BasePlugin.js';

/**
 * Broadcast status
 */
export type BroadcastStatus = 'draft' | 'queued' | 'sending' | 'completed' | 'cancelled' | 'failed';

/**
 * Recipient delivery status
 */
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

/**
 * Contact information
 */
export interface BroadcastContact {
  id: string;
  userId: string;
  platform: PlatformType;
  chatId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Broadcast campaign
 */
export interface Broadcast {
  id: string;
  name: string;
  message: OutgoingMessage;
  status: BroadcastStatus;
  targetPlatforms: PlatformType[];
  targetTags?: string[];
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recipient delivery record
 */
export interface BroadcastRecipient {
  id: string;
  broadcastId: string;
  contactId: string;
  status: DeliveryStatus;
  messageId?: string;
  error?: string;
  sentAt?: Date;
}

/**
 * Broadcast statistics
 */
export interface BroadcastStats {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  successRate: number;
}

/**
 * Audience filter
 */
export interface AudienceFilter {
  platforms?: PlatformType[];
  tags?: string[];
  excludeIds?: string[];
}

/**
 * Broadcast plugin configuration
 */
export interface BroadcastConfig {
  /**
   * Feature toggle key
   * @default 'broadcast'
   */
  featureKey?: string;

  /**
   * Rate limits per platform (messages per second)
   */
  rateLimit?: {
    telegram?: number;
    whatsapp?: number;
  };

  /**
   * Retry configuration
   */
  retry?: {
    maxAttempts?: number;
    backoffMs?: number;
  };

  /**
   * WhatsApp-specific settings
   */
  whatsapp?: {
    enabled?: boolean;
    templateId?: string;
    requireTemplateOutside24h?: boolean;
  };

  /**
   * Contact management
   */
  contacts?: {
    autoSyncFromSessions?: boolean;
    captureDisplayNames?: boolean;
  };
}

/**
 * Broadcast plugin for mass messaging campaigns
 *
 * @remarks
 * This plugin enables broadcast messaging with audience targeting,
 * rate limiting, delivery tracking, and scheduling support.
 *
 * @example
 * ```typescript
 * const broadcast = new BroadcastPlugin({
 *   rateLimit: {
 *     telegram: 25,
 *     whatsapp: 10,
 *   },
 *   retry: {
 *     maxAttempts: 3,
 *     backoffMs: 1000,
 *   },
 * });
 *
 * bot.use(broadcast);
 *
 * // Create a broadcast
 * const campaign = await broadcast.createBroadcast({
 *   name: 'Weekly Update',
 *   message: { text: 'Hello! Here is your weekly update...' },
 *   targetPlatforms: ['telegram', 'whatsapp'],
 * });
 *
 * // Send the broadcast
 * await broadcast.sendBroadcast(campaign.id);
 * ```
 */
export class BroadcastPlugin extends BasePlugin {
  public readonly name = 'BroadcastPlugin';
  public readonly version = '1.0.0';

  private readonly _config: Required<BroadcastConfig>;
  private readonly _contacts: Map<string, BroadcastContact> = new Map();
  private readonly _broadcasts: Map<string, Broadcast> = new Map();
  private readonly _recipients: Map<string, BroadcastRecipient> = new Map();
  private readonly _sendQueues: Map<PlatformType, Promise<void>> = new Map();
  private _nextBroadcastId = 1;
  private _nextContactId = 1;
  private _nextRecipientId = 1;

  constructor(config: BroadcastConfig = {}) {
    super();
    this._config = {
      featureKey: config.featureKey ?? 'broadcast',
      rateLimit: {
        telegram: config.rateLimit?.telegram ?? 25,
        whatsapp: config.rateLimit?.whatsapp ?? 10,
      },
      retry: {
        maxAttempts: config.retry?.maxAttempts ?? 3,
        backoffMs: config.retry?.backoffMs ?? 1000,
      },
      whatsapp: {
        enabled: config.whatsapp?.enabled ?? false,
        templateId: config.whatsapp?.templateId ?? '',
        requireTemplateOutside24h: config.whatsapp?.requireTemplateOutside24h ?? true,
      },
      contacts: {
        autoSyncFromSessions: config.contacts?.autoSyncFromSessions ?? true,
        captureDisplayNames: config.contacts?.captureDisplayNames ?? true,
      },
    };
  }

  /**
   * Add a contact to the broadcast list
   */
  addContact(contact: Omit<BroadcastContact, 'id' | 'createdAt' | 'updatedAt'>): BroadcastContact {
    const newContact: BroadcastContact = {
      ...contact,
      id: `contact_${this._nextContactId++}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this._contacts.set(newContact.id, newContact);
    this.logger.info('Contact added', {
      contactId: newContact.id,
      userId: newContact.userId,
      platform: newContact.platform,
    });

    return newContact;
  }

  /**
   * Remove a contact from the broadcast list
   */
  removeContact(contactId: string): boolean {
    const deleted = this._contacts.delete(contactId);
    if (deleted) {
      this.logger.info('Contact removed', { contactId });
    }
    return deleted;
  }

  /**
   * Get a contact by ID
   */
  getContact(contactId: string): BroadcastContact | undefined {
    return this._contacts.get(contactId);
  }

  /**
   * Get all contacts
   */
  getAllContacts(filter?: AudienceFilter): BroadcastContact[] {
    let contacts = Array.from(this._contacts.values());

    if (filter) {
      if (filter.platforms && filter.platforms.length > 0) {
        contacts = contacts.filter((c) => filter.platforms?.includes(c.platform));
      }

      if (filter.excludeIds && filter.excludeIds.length > 0) {
        contacts = contacts.filter((c) => !filter.excludeIds?.includes(c.id));
      }
    }

    return contacts;
  }

  /**
   * Create a new broadcast campaign
   */
  createBroadcast(
    params: Omit<
      Broadcast,
      'id' | 'status' | 'sentCount' | 'failedCount' | 'skippedCount' | 'createdAt' | 'updatedAt'
    >
  ): Broadcast {
    const broadcast: Broadcast = {
      ...params,
      id: `broadcast_${this._nextBroadcastId++}`,
      status: 'draft',
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this._broadcasts.set(broadcast.id, broadcast);
    this.logger.info('Broadcast created', {
      broadcastId: broadcast.id,
      name: broadcast.name,
      targetPlatforms: broadcast.targetPlatforms,
    });

    return broadcast;
  }

  /**
   * Get a broadcast by ID
   */
  getBroadcast(broadcastId: string): Broadcast | undefined {
    return this._broadcasts.get(broadcastId);
  }

  /**
   * Get all broadcasts
   */
  getAllBroadcasts(status?: BroadcastStatus): Broadcast[] {
    const broadcasts = Array.from(this._broadcasts.values());
    if (status) {
      return broadcasts.filter((b) => b.status === status);
    }
    return broadcasts;
  }

  /**
   * Send a broadcast to all targeted contacts
   */
  async sendBroadcast(broadcastId: string): Promise<BroadcastStats> {
    const broadcast = this._broadcasts.get(broadcastId);
    if (!broadcast) {
      throw new Error(`Broadcast ${broadcastId} not found`);
    }

    if (broadcast.status === 'sending') {
      throw new Error(`Broadcast ${broadcastId} is already sending`);
    }

    if (broadcast.status === 'completed') {
      throw new Error(`Broadcast ${broadcastId} is already completed`);
    }

    if (broadcast.status === 'cancelled') {
      throw new Error(`Broadcast ${broadcastId} is cancelled`);
    }

    // Update status
    broadcast.status = 'sending';
    broadcast.startedAt = new Date();
    broadcast.updatedAt = new Date();

    this.logger.info('Broadcast started', { broadcastId: broadcast.id });

    try {
      // Get targeted contacts
      const contacts = this.getAllContacts({
        platforms: broadcast.targetPlatforms,
      });

      broadcast.totalRecipients = contacts.length;

      // Create recipient records
      for (const contact of contacts) {
        const recipient: BroadcastRecipient = {
          id: `recipient_${this._nextRecipientId++}`,
          broadcastId: broadcast.id,
          contactId: contact.id,
          status: 'pending',
        };
        this._recipients.set(recipient.id, recipient);
      }

      // Send messages with rate limiting
      const sendPromises: Promise<void>[] = [];

      for (const contact of contacts) {
        const promise = this._sendToContact(broadcast, contact);
        sendPromises.push(promise);
      }

      await Promise.all(sendPromises);

      // Mark as completed
      broadcast.status = 'completed';
      broadcast.completedAt = new Date();
      broadcast.updatedAt = new Date();

      this.logger.info('Broadcast completed', {
        broadcastId: broadcast.id,
        stats: {
          total: broadcast.totalRecipients,
          sent: broadcast.sentCount,
          failed: broadcast.failedCount,
          skipped: broadcast.skippedCount,
        },
      });

      return this.getBroadcastStats(broadcastId);
    } catch (error) {
      broadcast.status = 'failed';
      broadcast.updatedAt = new Date();
      this.logger.error('Broadcast failed', {
        broadcastId: broadcast.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Cancel a broadcast
   */
  cancelBroadcast(broadcastId: string): boolean {
    const broadcast = this._broadcasts.get(broadcastId);
    if (!broadcast) {
      return false;
    }

    if (broadcast.status === 'completed' || broadcast.status === 'cancelled') {
      return false;
    }

    broadcast.status = 'cancelled';
    broadcast.updatedAt = new Date();

    this.logger.info('Broadcast cancelled', { broadcastId });
    return true;
  }

  /**
   * Get broadcast statistics
   */
  getBroadcastStats(broadcastId: string): BroadcastStats {
    const broadcast = this._broadcasts.get(broadcastId);
    if (!broadcast) {
      throw new Error(`Broadcast ${broadcastId} not found`);
    }

    const total = broadcast.totalRecipients;
    const sent = broadcast.sentCount;
    const failed = broadcast.failedCount;
    const skipped = broadcast.skippedCount;
    const pending = total - sent - failed - skipped;
    const successRate = total > 0 ? (sent / total) * 100 : 0;

    return {
      total,
      sent,
      failed,
      skipped,
      pending,
      successRate,
    };
  }

  /**
   * Get recipients for a broadcast
   */
  getRecipients(broadcastId: string, status?: DeliveryStatus): BroadcastRecipient[] {
    const recipients = Array.from(this._recipients.values()).filter(
      (r) => r.broadcastId === broadcastId
    );

    if (status) {
      return recipients.filter((r) => r.status === status);
    }

    return recipients;
  }

  /**
   * Send message to a single contact with retry logic
   */
  private async _sendToContact(broadcast: Broadcast, contact: BroadcastContact): Promise<void> {
    const recipient = Array.from(this._recipients.values()).find(
      (r) => r.broadcastId === broadcast.id && r.contactId === contact.id
    );

    if (!recipient) {
      return;
    }

    // Check if broadcast was cancelled
    if (broadcast.status === 'cancelled') {
      recipient.status = 'skipped';
      broadcast.skippedCount++;
      return;
    }

    // Apply rate limiting
    await this._applyRateLimit(contact.platform);

    let lastError: Error | undefined;

    const maxAttempts = this._config.retry.maxAttempts ?? 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Get platform instance
        const platform = this.chatbot.platforms.get(contact.platform);
        if (!platform) {
          throw new Error(`Platform ${contact.platform} not found`);
        }

        // Send message
        const result = await platform.sendMessage(contact.chatId, broadcast.message);

        if (result.success) {
          recipient.status = 'sent';
          recipient.messageId = result.messageId;
          recipient.sentAt = new Date();
          broadcast.sentCount++;

          this.logger.debug('Message sent to contact', {
            broadcastId: broadcast.id,
            contactId: contact.id,
            messageId: result.messageId,
          });

          return;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn('Failed to send message to contact', {
          broadcastId: broadcast.id,
          contactId: contact.id,
          attempt,
          error: lastError.message,
        });

        // Wait before retry
        const backoffMs = this._config.retry.backoffMs ?? 1000;
        if (attempt < maxAttempts) {
          await this._sleep(backoffMs * attempt);
        }
      }
    }

    // All attempts failed
    recipient.status = 'failed';
    recipient.error = lastError?.message ?? 'Unknown error';
    broadcast.failedCount++;

    this.logger.error('Failed to send message to contact after retries', {
      broadcastId: broadcast.id,
      contactId: contact.id,
      error: lastError?.message,
    });
  }

  /**
   * Apply rate limiting for a platform
   */
  private async _applyRateLimit(platform: PlatformType): Promise<void> {
    // Get rate limit for platform (default to 10 if not configured)
    let rateLimit = 10;
    if (platform === 'telegram') {
      rateLimit = this._config.rateLimit.telegram ?? 25;
    } else if (platform === 'whatsapp') {
      rateLimit = this._config.rateLimit.whatsapp ?? 10;
    }

    const delayMs = 1000 / rateLimit;

    // Wait for previous message to be sent
    const existingQueue = this._sendQueues.get(platform);
    if (existingQueue) {
      await existingQueue;
    }

    // Create new delay promise
    const delayPromise = this._sleep(delayMs);
    this._sendQueues.set(platform, delayPromise);

    await delayPromise;
  }

  /**
   * Sleep for a duration
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected override onInstall(): void {
    this.logger.info('BroadcastPlugin installed', { config: this._config });
  }

  protected override onUninstall(): void {
    this._contacts.clear();
    this._broadcasts.clear();
    this._recipients.clear();
    this._sendQueues.clear();
    this.logger.info('BroadcastPlugin uninstalled');
  }
}
