import type {
  BulkMessage,
  BulkMessageResult,
  ILogger,
  IPlatform,
  MessageResult,
  OutgoingMessage,
  PlatformType,
} from '../types/index.js';

/**
 * Base platform class that provides common functionality for all platforms
 */
export abstract class BasePlatform implements IPlatform {
  public abstract readonly name: PlatformType;
  public abstract readonly version: string;

  protected _logger?: ILogger;
  protected _initialized = false;

  /**
   * Set the logger instance
   */
  setLogger(logger: ILogger): void {
    this._logger = logger.child({ platform: this.name });
  }

  /**
   * Check if platform is initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Initialize the platform
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      this._logger?.warn('Platform already initialized');
      return;
    }

    this._logger?.info(`Initializing ${this.name} platform`);
    await this.onInitialize();
    this._initialized = true;
    this._logger?.info(`${this.name} platform initialized`);
  }

  /**
   * Shutdown the platform
   */
  async shutdown(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    this._logger?.info(`Shutting down ${this.name} platform`);
    await this.onShutdown();
    this._initialized = false;
    this._logger?.info(`${this.name} platform shut down`);
  }

  /**
   * Send a message to a user
   */
  abstract sendMessage(userId: string, message: OutgoingMessage): Promise<MessageResult>;

  /**
   * Send bulk messages (with rate limiting)
   */
  async sendBulkMessages(messages: BulkMessage[]): Promise<BulkMessageResult> {
    const results: MessageResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const { userId, message } of messages) {
      try {
        const result = await this.sendMessage(userId, message);
        results.push(result);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Basic rate limiting - 30 messages per second
        await this._delay(33);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        failed++;
      }
    }

    return {
      total: messages.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Override this method to perform platform-specific initialization
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Override this method to perform platform-specific shutdown
   */
  protected abstract onShutdown(): Promise<void>;

  /**
   * Utility method for delays (used in rate limiting)
   */
  protected _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
