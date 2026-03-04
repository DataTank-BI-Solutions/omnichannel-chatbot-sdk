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
// Platform Exports
// ============================================================================

export { TelegramPlatform } from './platforms/TelegramPlatform.js';
export { WhatsAppPlatform } from './platforms/WhatsAppPlatform.js';
export { BasePlatform } from './platforms/BasePlatform.js';

// ============================================================================
// Plugin Exports
// ============================================================================

export {
  BasePlugin,
  LiveChatPlugin,
  BroadcastPlugin,
  AIPlugin,
  type Agent,
  type AgentStatus,
  type LiveChatConfig,
  type Broadcast,
  type BroadcastContact,
  type BroadcastConfig,
  type BroadcastRecipient,
  type BroadcastStats,
  type BroadcastStatus,
  type DeliveryStatus,
  type AudienceFilter,
  type AIPluginConfig,
  type ConversationTurn,
  type Intent,
} from './plugins/index.js';

// ============================================================================
// Admin Panel Exports
// ============================================================================

export {
  AdminAPI,
  SupabaseAuthProvider,
  createAuthMiddleware,
  requirePermission,
  requireRole,
  type SupabaseAuthConfig,
  type AdminConfig,
  type AdminUser,
  type UserRole,
  type Permission,
  type TokenPayload,
  type LoginCredentials,
  type AuthResponse,
  type AuthenticatedRequest,
  type PaginationQuery,
  type PaginatedResponse,
  type ApiResponse,
  type ConversationFilters,
  type ConversationDetails,
  type AssignConversationRequest,
  type UserFilters,
  type UserDetails,
  type BroadcastFilters,
  type BroadcastDetails,
  type CreateBroadcastRequest,
  type AnalyticsMetrics,
  type AgentMetrics,
  type DateRange,
  type WebSocketEvent,
  type WebSocketMessage,
  type AdminRoutes,
} from './admin/index.js';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
