import EventEmitter from 'eventemitter3';
import type { FlowBuilder } from '../flow/FlowBuilder.js';
import { SessionManager } from '../session/index.js';
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
import { safeValidateConfig } from './ConfigSchema.js';
import { Context } from './Context.js';
import { createChatbotLogger } from './Logger.js';
import { compose } from './Middleware.js';
import { Router } from './Router.js';

/**
 * Main Chatbot class - the entry point for the SDK
 *
 * @example
 * ```typescript
 * import { Chatbot } from '@code-alchemist/omnichannel-chatbot-sdk';
 *
 * const bot = new Chatbot({
 *   platforms: {
 *     telegram: {
 *       enabled: true,
 *       token: process.env.TELEGRAM_TOKEN!,
 *     },
 *   },
 *   logging: {
 *     level: 'info',
 *     format: 'pretty',
 *   },
 * });
 *
 * bot.command('start', async (ctx) => {
 *   await ctx.reply('Welcome to the bot!');
 * });
 *
 * await bot.start();
 * ```
 */
export class Chatbot implements IChatbot {
  public readonly config: ChatbotConfig;
  public readonly platforms: Map<PlatformType, IPlatform> = new Map();
  public readonly plugins: Map<string, IPlugin> = new Map();
  public readonly flows: Map<string, FlowBuilder> = new Map();
  public readonly router: IRouter;
  public readonly logger: ILogger;
  public readonly session: SessionManager;
  public database?: IDatabaseAdapter;

  private readonly _emitter: EventEmitter;
  private _started = false;

  constructor(config: ChatbotConfig) {
    // Validate configuration
    const validation = safeValidateConfig(config);
    if (!validation.success) {
      const errorMessages = validation.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new ChatbotError(
        ErrorCodes.CONFIG_INVALID,
        `Invalid chatbot configuration: ${errorMessages}`,
        { errors: validation.error.errors }
      );
    }

    this.config = validation.data;
    this.router = new Router();
    this.logger = createChatbotLogger(config.logging);
    this.session = new SessionManager({
      ttl: config.session?.ttl ?? 3600,
    });
    this._emitter = new EventEmitter();
  }

  /**
   * Register a plugin or middleware
   *
   * @param pluginOrMiddleware - Plugin instance or middleware function to register
   *
   * @example
   * ```typescript
   * // Register a plugin
   * bot.use(new LiveChatPlugin());
   *
   * // Register a middleware function
   * bot.use(async (ctx, next) => {
   *   console.log(`Received: ${ctx.message.text}`);
   *   await next();
   * });
   *
   * // Register a middleware class
   * bot.use(new LoggingMiddleware());
   * ```
   */
  use(pluginOrMiddleware: IPlugin | MiddlewareFunction | IMiddleware): void {
    // Check if it's a plugin (has install method)
    if (this._isPlugin(pluginOrMiddleware)) {
      this._installPlugin(pluginOrMiddleware).catch((error) => {
        this.logger.error(error.code || 'PLUGIN_INSTALL_FAILED', { error });
      });
    } else {
      // It's middleware
      this.router.use(pluginOrMiddleware as MiddlewareFunction | IMiddleware);
    }
  }

  /**
   * Register a command handler
   *
   * @param command - Command name (without leading slash)
   * @param handler - Async function to handle the command
   *
   * @example
   * ```typescript
   * bot.command('start', async (ctx) => {
   *   await ctx.reply('Hello! Use /help to see available commands.');
   * });
   *
   * bot.command('echo', async (ctx) => {
   *   const args = ctx.state.get<{ args?: string }>('params')?.args;
   *   await ctx.reply(args || 'Nothing to echo');
   * });
   * ```
   */
  command(command: string, handler: RouteHandler): void {
    this.router.command(command, handler);
  }

  /**
   * Register an event handler for message types
   *
   * @param event - Message type to listen for (e.g., 'text', 'image', 'video')
   * @param handler - Async function to handle messages of this type
   *
   * @example
   * ```typescript
   * bot.on('image', async (ctx) => {
   *   await ctx.reply('Thanks for the image!');
   * });
   *
   * bot.on('text', async (ctx) => {
   *   await ctx.reply(`You said: ${ctx.message.text}`);
   * });
   * ```
   */
  on(event: MessageType, handler: RouteHandler): void {
    this.router.on(event, handler);
  }

  /**
   * Register a text pattern handler
   *
   * @param pattern - String (exact match) or RegExp to match against message text
   * @param handler - Async function to handle matching messages
   *
   * @example
   * ```typescript
   * // Exact match
   * bot.text('hello', async (ctx) => {
   *   await ctx.reply('Hi there!');
   * });
   *
   * // Regex with capture groups
   * bot.text(/^Hi, my name is (?<name>\w+)$/i, async (ctx) => {
   *   const params = ctx.state.get<{ name: string }>('params');
   *   await ctx.reply(`Nice to meet you, ${params?.name}!`);
   * });
   * ```
   */
  text(pattern: string | RegExp, handler: RouteHandler): void {
    this.router.text(pattern, handler);
  }

  /**
   * Register a conversation flow
   *
   * @param flowBuilder - FlowBuilder instance to register
   *
   * @remarks
   * Flows are automatically handled before command routing. When a user has an
   * active flow session, all messages will be routed to the flow instead of
   * normal command handlers.
   *
   * @example
   * ```typescript
   * const registrationFlow = new FlowBuilder({
   *   name: 'registration',
   *   initialScene: 'welcome',
   * });
   *
   * registrationFlow.scene({
   *   id: 'welcome',
   *   onEnter: async (ctx) => {
   *     await ctx.reply('Welcome! What is your name?');
   *   },
   *   onMessage: async (ctx) => {
   *     ctx.flowState.set('name', ctx.message.text);
   *     await ctx.enterScene('email');
   *   },
   * });
   *
   * bot.flow(registrationFlow);
   *
   * bot.command('register', async (ctx) => {
   *   await registrationFlow.enter(ctx, bot.session);
   * });
   * ```
   */
  flow(flowBuilder: FlowBuilder): void {
    if (this.flows.has(flowBuilder.name)) {
      this.logger.warn(`Flow "${flowBuilder.name}" is already registered`);
      return;
    }

    this.flows.set(flowBuilder.name, flowBuilder);
    this.logger.debug(`Registered flow: ${flowBuilder.name}`);
  }

  /**
   * Subscribe to chatbot lifecycle events
   *
   * @param event - Event name to listen for ('start', 'stop', 'message', 'error', etc.)
   * @param handler - Async function to handle the event
   *
   * @example
   * ```typescript
   * bot.onEvent('start', () => {
   *   console.log('Bot started!');
   * });
   *
   * bot.onEvent('error', (error) => {
   *   console.error('Bot error:', error);
   * });
   *
   * bot.onEvent('message', (ctx) => {
   *   console.log(`Message from ${ctx.user.platformId}`);
   * });
   * ```
   */
  onEvent<T = unknown>(event: ChatbotEvent, handler: ChatbotEventHandler<T>): void {
    this._emitter.on(event, handler);
  }

  /**
   * Start the chatbot and initialize all platforms
   *
   * @throws {ChatbotError} If chatbot is already started
   *
   * @example
   * ```typescript
   * await bot.start();
   * console.log('Bot is now running!');
   * ```
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
   * Stop the chatbot and gracefully shutdown all platforms and plugins
   *
   * @throws {ChatbotError} If chatbot is not started
   *
   * @example
   * ```typescript
   * // Graceful shutdown on SIGINT
   * process.on('SIGINT', async () => {
   *   await bot.stop();
   *   process.exit(0);
   * });
   * ```
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
   * Broadcast a message to multiple users (requires database)
   *
   * @param message - Message to broadcast
   * @param filter - Optional filter for targeting specific users
   * @returns Results of the broadcast operation
   * @throws {ChatbotError} If chatbot is not started
   *
   * @example
   * ```typescript
   * await bot.broadcast(
   *   { type: 'text', text: 'Important announcement!' },
   *   { platform: 'telegram' }
   * );
   * ```
   *
   * @remarks
   * This feature requires a database adapter to be configured.
   * Currently returns empty results (implementation pending).
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
   *
   * @param message - The incoming message to process
   * @param platform - The platform the message came from
   *
   * @remarks
   * This method is typically called internally by platform adapters.
   * It runs the full middleware chain and routes the message to appropriate handlers.
   *
   * @internal
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

      // Check for active flows first (flows take priority over commands)
      let flowHandled = false;
      for (const flow of this.flows.values()) {
        await flow.handleMessage(ctx, this.session);
        // If the flow handled the message (user has active scene), stop processing
        const sessionKey = `flow:${flow.name}:scene`;
        const activeScene = await this.session.get(ctx.user.id, ctx.message.platform, sessionKey);
        if (activeScene) {
          flowHandled = true;
          break;
        }
      }

      // If a flow handled the message, skip normal routing
      if (flowHandled) {
        return;
      }

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
