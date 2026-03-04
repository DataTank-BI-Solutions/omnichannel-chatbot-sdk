import EventEmitter from 'eventemitter3';
import type {
  BroadcastFilter,
  BulkMessageResult,
  ChatbotConfig,
  ChatbotEvent,
  ChatbotEventHandler,
  IChatbot,
  IDatabaseAdapter,
  ILogger,
  IMiddleware,
  IPlatform,
  IPlugin,
  IRouter,
  IncomingMessage,
  MessageType,
  MiddlewareFunction,
  OutgoingMessage,
  PlatformType,
  RouteHandler,
} from '../types/index.js';
import { ChatbotError, ErrorCodes } from './ChatbotError.js';
import { Context } from './Context.js';
import { createChatbotLogger } from './Logger.js';
import { compose } from './Middleware.js';
import { Router } from './Router.js';

/**
 * Main Chatbot class - the entry point for the SDK
 */
export class Chatbot implements IChatbot {
  public readonly config: ChatbotConfig;
  public readonly platforms: Map<PlatformType, IPlatform> = new Map();
  public readonly plugins: Map<string, IPlugin> = new Map();
  public readonly router: IRouter;
  public readonly logger: ILogger;
  public database?: IDatabaseAdapter;

  private readonly _emitter: EventEmitter;
  private _started = false;

  constructor(config: ChatbotConfig) {
    this.config = config;
    this.router = new Router();
    this.logger = createChatbotLogger(config.logging);
    this._emitter = new EventEmitter();
  }

  /**
   * Register a plugin or middleware
   */
  use(pluginOrMiddleware: IPlugin | MiddlewareFunction | IMiddleware): void {
    // Check if it's a plugin (has install method)
    if (this._isPlugin(pluginOrMiddleware)) {
      this._installPlugin(pluginOrMiddleware);
    } else {
      // It's middleware
      this.router.use(pluginOrMiddleware as MiddlewareFunction | IMiddleware);
    }
  }

  /**
   * Register a command handler
   */
  command(command: string, handler: RouteHandler): void {
    this.router.command(command, handler);
  }

  /**
   * Register an event handler for message types
   */
  on(event: MessageType, handler: RouteHandler): void {
    this.router.on(event, handler);
  }

  /**
   * Register a text pattern handler
   */
  text(pattern: string | RegExp, handler: RouteHandler): void {
    this.router.text(pattern, handler);
  }

  /**
   * Subscribe to chatbot events
   */
  onEvent<T = unknown>(event: ChatbotEvent, handler: ChatbotEventHandler<T>): void {
    this._emitter.on(event, handler);
  }

  /**
   * Start the chatbot
   */
  async start(): Promise<void> {
    if (this._started) {
      throw new ChatbotError(ErrorCodes.ALREADY_STARTED, 'Chatbot is already started');
    }

    this.logger.info('Starting chatbot...');

    // Initialize database if configured
    if (this.config.database) {
      await this._initializeDatabase();
    }

    // Initialize platforms
    await this._initializePlatforms();

    this._started = true;
    this._emitter.emit('start');
    this.logger.info('Chatbot started successfully');
  }

  /**
   * Stop the chatbot
   */
  async stop(): Promise<void> {
    if (!this._started) {
      throw new ChatbotError(ErrorCodes.NOT_STARTED, 'Chatbot is not started');
    }

    this.logger.info('Stopping chatbot...');

    // Shutdown platforms
    for (const [name, platform] of this.platforms) {
      try {
        await platform.shutdown();
        this.logger.debug(`Platform ${name} shut down`);
      } catch (error) {
        this.logger.error(`Failed to shutdown platform ${name}`, { error });
      }
    }

    // Uninstall plugins
    for (const [name, plugin] of this.plugins) {
      try {
        await plugin.uninstall();
        this.logger.debug(`Plugin ${name} uninstalled`);
      } catch (error) {
        this.logger.error(`Failed to uninstall plugin ${name}`, { error });
      }
    }

    // Disconnect database
    if (this.database) {
      await this.database.disconnect();
    }

    this._started = false;
    this._emitter.emit('stop');
    this.logger.info('Chatbot stopped');
  }

  /**
   * Broadcast a message to multiple users
   */
  async broadcast(
    _message: OutgoingMessage,
    _filter?: BroadcastFilter
  ): Promise<BulkMessageResult> {
    if (!this._started) {
      throw new ChatbotError(ErrorCodes.NOT_STARTED, 'Chatbot must be started before broadcasting');
    }

    // TODO: Implement broadcast logic with database query for users
    // For now, return empty result
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
    };
  }

  /**
   * Handle an incoming message from a platform
   */
  async handleMessage(message: IncomingMessage, platform: IPlatform): Promise<void> {
    try {
      // Get or create user
      const user = await this._getOrCreateUser(message, platform);

      // Get or create conversation
      const conversation = await this._getOrCreateConversation(message, user);

      // Create context
      const ctx = new Context(message, platform, user, conversation);

      // Emit message event
      this._emitter.emit('message', ctx);

      // Get router middlewares
      const routerMiddlewares = (this.router as Router).middlewares;

      // Compose middleware chain
      const composed = compose(routerMiddlewares);

      // Run middleware chain with route matching as final handler
      await composed(ctx, async () => {
        const match = this.router.match(ctx);
        if (match) {
          ctx.state.set('params', match.params);
          await match.handler(ctx);
        }
      });
    } catch (error) {
      this._emitter.emit('error', error);
      this.logger.error('Error handling message', {
        error,
        messageId: message.id,
        platform: message.platform,
      });
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private _isPlugin(obj: unknown): obj is IPlugin {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'name' in obj &&
      'version' in obj &&
      'install' in obj &&
      typeof (obj as IPlugin).install === 'function'
    );
  }

  private async _installPlugin(plugin: IPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn(`Plugin ${plugin.name} is already installed`);
      return;
    }

    try {
      await plugin.install(this);
      this.plugins.set(plugin.name, plugin);
      this._emitter.emit('plugin:installed', plugin);
      this.logger.info(`Plugin ${plugin.name}@${plugin.version} installed`);
    } catch (error) {
      throw new ChatbotError(
        ErrorCodes.PLUGIN_INSTALL_FAILED,
        `Failed to install plugin ${plugin.name}`,
        { error }
      );
    }
  }

  private async _initializeDatabase(): Promise<void> {
    // TODO: Implement database initialization based on config
    this.logger.debug('Database initialization skipped (not implemented)');
  }

  private async _initializePlatforms(): Promise<void> {
    const { platforms } = this.config;

    if (platforms.telegram?.enabled) {
      // TODO: Initialize Telegram platform
      this.logger.debug('Telegram platform initialization skipped (not implemented)');
    }

    if (platforms.whatsapp?.enabled) {
      // TODO: Initialize WhatsApp platform
      this.logger.debug('WhatsApp platform initialization skipped (not implemented)');
    }
  }

  private async _getOrCreateUser(
    message: IncomingMessage,
    _platform: IPlatform
  ): Promise<{
    id: string;
    platformId: string;
    platform: PlatformType;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }> {
    // TODO: Implement user lookup/creation with database
    return {
      id: message.userId,
      platformId: message.userId,
      platform: message.platform,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async _getOrCreateConversation(
    message: IncomingMessage,
    user: { id: string }
  ): Promise<{
    id: string;
    platform: PlatformType;
    chatId: string;
    userId: string;
    status: 'active';
    metadata: Record<string, unknown>;
    startedAt: Date;
    lastMessageAt: Date;
  }> {
    // TODO: Implement conversation lookup/creation with database
    return {
      id: message.chatId,
      platform: message.platform,
      chatId: message.chatId,
      userId: user.id,
      status: 'active',
      metadata: {},
      startedAt: new Date(),
      lastMessageAt: new Date(),
    };
  }
}
