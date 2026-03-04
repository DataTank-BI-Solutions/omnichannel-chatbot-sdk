import type { z } from 'zod';

// ============================================================================
// Platform Types
// ============================================================================

export type PlatformType = 'telegram' | 'whatsapp' | 'discord' | 'messenger';

export interface IPlatform {
  readonly name: PlatformType;
  readonly version: string;

  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  sendMessage(userId: string, message: OutgoingMessage): Promise<MessageResult>;
  sendBulkMessages(messages: BulkMessage[]): Promise<BulkMessageResult>;
}

export interface PlatformConfig {
  enabled: boolean;
}

export interface TelegramConfig extends PlatformConfig {
  token: string;
  webhookUrl?: string;
  useWebhook?: boolean;
}

export interface WhatsAppConfig extends PlatformConfig {
  provider: 'twilio' | 'baileys';
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'button_click';

export interface IncomingMessage {
  id: string;
  platform: PlatformType;
  userId: string;
  chatId: string;
  type: MessageType;
  text?: string;
  media?: MediaAttachment;
  location?: LocationData;
  contact?: ContactData;
  replyToMessageId?: string;
  timestamp: Date;
  raw: unknown;
}

export interface OutgoingMessage {
  type: MessageType;
  text?: string;
  media?: MediaAttachment;
  location?: LocationData;
  buttons?: MessageButton[];
  replyToMessageId?: string;
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'audio' | 'document';
  url?: string;
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  caption?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
}

export interface ContactData {
  name: string;
  phoneNumber: string;
  email?: string;
}

export interface MessageButton {
  type: 'url' | 'callback' | 'reply';
  text: string;
  url?: string;
  callbackData?: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: Error;
}

export interface BulkMessage {
  userId: string;
  message: OutgoingMessage;
}

export interface BulkMessageResult {
  total: number;
  successful: number;
  failed: number;
  results: MessageResult[];
}

// ============================================================================
// Context Types
// ============================================================================

export interface IContext {
  readonly id: string;
  readonly message: IncomingMessage;
  readonly platform: IPlatform;
  readonly user: User;
  readonly conversation: Conversation;
  readonly state: ContextState;

  reply(message: string | OutgoingMessage): Promise<MessageResult>;
  replyWithMedia(media: MediaAttachment): Promise<MessageResult>;
  replyWithButtons(text: string, buttons: MessageButton[]): Promise<MessageResult>;
}

export interface ContextState {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
}

// ============================================================================
// User & Conversation Types
// ============================================================================

export interface User {
  id: string;
  platformId: string;
  platform: PlatformType;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  language?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  platform: PlatformType;
  chatId: string;
  userId: string;
  status: ConversationStatus;
  assignedAgentId?: string;
  metadata: Record<string, unknown>;
  startedAt: Date;
  lastMessageAt: Date;
}

export type ConversationStatus = 'active' | 'waiting' | 'assigned' | 'resolved' | 'closed';

// ============================================================================
// Plugin Types
// ============================================================================

export interface IPlugin {
  readonly name: string;
  readonly version: string;

  install(chatbot: IChatbot): void | Promise<void>;
  uninstall(): void | Promise<void>;
}

export interface PluginContext {
  chatbot: IChatbot;
  logger: ILogger;
  database?: IDatabaseAdapter;
}

// ============================================================================
// Middleware Types
// ============================================================================

export type NextFunction = () => Promise<void>;

export type MiddlewareFunction = (ctx: IContext, next: NextFunction) => Promise<void>;

export interface IMiddleware {
  readonly name: string;
  process: MiddlewareFunction;
}

// ============================================================================
// Router Types
// ============================================================================

export type RouteHandler = (ctx: IContext) => Promise<void> | void;

export interface RouteMatch {
  handler: RouteHandler;
  params: Record<string, string>;
}

export interface IRouter {
  command(command: string, handler: RouteHandler): void;
  text(pattern: string | RegExp, handler: RouteHandler): void;
  on(event: MessageType, handler: RouteHandler): void;
  use(middleware: MiddlewareFunction | IMiddleware): void;
  match(ctx: IContext): RouteMatch | undefined;
}

// ============================================================================
// Database Types
// ============================================================================

export interface IDatabaseAdapter {
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // User operations
  findUser(id: string): Promise<User | undefined>;
  findUserByPlatformId(platform: PlatformType, platformId: string): Promise<User | undefined>;
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;

  // Conversation operations
  findConversation(id: string): Promise<Conversation | undefined>;
  findActiveConversation(userId: string): Promise<Conversation | undefined>;
  createConversation(conversation: Omit<Conversation, 'id'>): Promise<Conversation>;
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation>;

  // Message operations
  saveMessage(message: StoredMessage): Promise<StoredMessage>;
  getConversationMessages(conversationId: string, limit?: number): Promise<StoredMessage[]>;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  direction: 'incoming' | 'outgoing';
  type: MessageType;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Chatbot Types
// ============================================================================

export interface ChatbotConfig {
  name?: string;
  database?: DatabaseConfig;
  platforms: PlatformsConfig;
  logging?: LoggingConfig;
  session?: {
    /** Session TTL in seconds (default: 3600) */
    ttl?: number;
  };
}

export interface DatabaseConfig {
  provider: 'supabase' | 'postgres' | 'memory';
  url?: string;
  serviceKey?: string;
}

export interface PlatformsConfig {
  telegram?: TelegramConfig;
  whatsapp?: WhatsAppConfig;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format?: 'json' | 'pretty';
}

export interface IChatbot {
  readonly config: ChatbotConfig;
  readonly platforms: Map<PlatformType, IPlatform>;
  readonly plugins: Map<string, IPlugin>;
  readonly router: IRouter;
  readonly database?: IDatabaseAdapter;
  readonly logger: ILogger;

  use(plugin: IPlugin): void;
  use(middleware: MiddlewareFunction | IMiddleware): void;
  command(command: string, handler: RouteHandler): void;
  on(event: MessageType, handler: RouteHandler): void;
  text(pattern: string | RegExp, handler: RouteHandler): void;

  start(): Promise<void>;
  stop(): Promise<void>;

  broadcast(message: OutgoingMessage, filter?: BroadcastFilter): Promise<BulkMessageResult>;
}

export interface BroadcastFilter {
  platforms?: PlatformType[];
  userIds?: string[];
  tags?: string[];
}

// ============================================================================
// Logger Types
// ============================================================================

export interface ILogger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  child(meta: Record<string, unknown>): ILogger;
}

// ============================================================================
// Error Types
// ============================================================================

export interface IChatbotError extends Error {
  code: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Event Types
// ============================================================================

export type ChatbotEvent =
  | 'start'
  | 'stop'
  | 'message'
  | 'message:sent'
  | 'error'
  | 'plugin:installed'
  | 'plugin:uninstalled';

export type ChatbotEventHandler<T = unknown> = (data: T) => void | Promise<void>;

// ============================================================================
// AI Types
// ============================================================================

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  readonly name: AIProvider;

  generateResponse(prompt: string, context?: string[]): Promise<AIResponse>;
  generateStreamingResponse(
    prompt: string,
    context?: string[],
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MaybePromise<T> = T | Promise<T>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
