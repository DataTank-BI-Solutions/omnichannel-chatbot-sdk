/**
 * @code-alchemist/omnichannel-chatbot-sdk
 *
 * A comprehensive Node.js SDK for building production-ready chatbots
 * with multi-platform support, live chat handoff, broadcast messaging,
 * and AI-powered responses.
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Exports
// ============================================================================

export { Chatbot } from './core/Chatbot.js';
export { Context } from './core/Context.js';
export { Router } from './core/Router.js';
export { Middleware } from './core/Middleware.js';
export { ChatbotError, ErrorCodes } from './core/ChatbotError.js';
export { Logger, createChatbotLogger } from './core/Logger.js';
export { validateConfig, safeValidateConfig } from './core/ConfigSchema.js';
export { SessionManager, MemoryStorage } from './session/index.js';
export { FlowBuilder, Scene } from './flow/index.js';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Platform types
  PlatformType,
  IPlatform,
  PlatformConfig,
  TelegramConfig,
  WhatsAppConfig,
  // Message types
  MessageType,
  IncomingMessage,
  OutgoingMessage,
  MediaAttachment,
  LocationData,
  ContactData,
  MessageButton,
  MessageResult,
  BulkMessage,
  BulkMessageResult,
  // Context types
  IContext,
  ContextState,
  // User & Conversation types
  User,
  Conversation,
  ConversationStatus,
  // Plugin types
  IPlugin,
  PluginContext,
  // Middleware types
  NextFunction,
  MiddlewareFunction,
  IMiddleware,
  // Router types
  RouteHandler,
  RouteMatch,
  IRouter,
  // Database types
  IDatabaseAdapter,
  StoredMessage,
  // Config types
  ChatbotConfig,
  DatabaseConfig,
  PlatformsConfig,
  LoggingConfig,
  IChatbot,
  BroadcastFilter,
  // Logger types
  ILogger,
  // Error types
  IChatbotError,
  // Event types
  ChatbotEvent,
  ChatbotEventHandler,
  // AI types
  AIProvider,
  AIConfig,
  AIResponse,
  IAIProvider,
  // Utility types
  DeepPartial,
  MaybePromise,
  Prettify,
} from './types/index.js';

// ============================================================================
// Session Exports
// ============================================================================

export type {
  Session,
  SessionConfig,
  ISessionStorage,
} from './session/index.js';

// ============================================================================
// Flow Exports
// ============================================================================

export type {
  FlowContext,
  FlowState,
  FlowConfig,
  SceneConfig,
  SceneHandler,
  SceneLeaveHandler,
  ActiveScene,
} from './flow/index.js';

// ============================================================================
// Database Exports
// ============================================================================

export * from './database/index.js';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
