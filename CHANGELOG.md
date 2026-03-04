# Changelog

All notable changes to the Omnichannel Chatbot SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase 2: Core System Enhancements (Complete)

#### Session Management System

- Added `ISessionStorage` interface for pluggable session storage backends
- Implemented `MemoryStorage` class with TTL support and automatic expiration
- Implemented `SessionManager` high-level API for session operations
- Added session integration to `Chatbot` class via `bot.session` property
- Session data automatically persists per user and platform
- Support for custom session key generators
- 37 comprehensive tests with 100% coverage

**Files:**

- `src/session/types.ts` - Session type definitions
- `src/session/MemoryStorage.ts` - In-memory storage adapter with TTL
- `src/session/SessionManager.ts` - Session manager with high-level API
- `src/session/index.ts` - Session module exports
- `src/session/MemoryStorage.test.ts` - 19 tests
- `src/session/SessionManager.test.ts` - 18 tests

#### Conversation Flow Builder

- Added scene-based conversation flow system for multi-step interactions
- Implemented `Scene` class with enter/message/leave lifecycle hooks
- Implemented `FlowBuilder` class for creating and managing conversation flows
- Added `FlowContext` extending `IContext` with flow-specific methods:
  - `ctx.enterScene(sceneId)` - Navigate to a new scene
  - `ctx.leaveScene()` - Exit current flow
  - `ctx.getCurrentScene()` - Get active scene ID
  - `ctx.flowState.get(key)` - Retrieve flow state
  - `ctx.flowState.set(key, value)` - Store flow state
  - `ctx.flowState.delete(key)` - Remove flow state key
  - `ctx.flowState.clear()` - Clear all flow state
- Flow state automatically persists across messages using SessionManager
- Scene TTL support for automatic expiration
- Flow registration via `bot.flow()` method
- Automatic flow routing with priority over normal commands
- 20 comprehensive tests with 100% coverage

**Files:**

- `src/flow/types.ts` - Flow type definitions (FlowContext, FlowState, SceneConfig, etc.)
- `src/flow/Scene.ts` - Scene class with lifecycle hooks
- `src/flow/FlowBuilder.ts` - Flow builder and scene management
- `src/flow/index.ts` - Flow module exports
- `src/flow/FlowBuilder.test.ts` - 20 tests

#### Core System Improvements

- Integrated FlowBuilder with Chatbot class
- Added `flows` Map to Chatbot for storing registered flows
- Modified message handling to prioritize active flows over commands
- Added flow integration test to Chatbot test suite
- Exported flow module from main `src/index.ts` entry point

### Changed

#### Test Coverage

- Increased test count from 246 to 267 tests
- Maintained 93.76% code coverage (exceeds 80% threshold)
- All 267 tests passing with 0 type errors

#### Documentation

- Updated `ROADMAP.md` to mark Phase 2 as 100% complete
- Updated test statistics in ROADMAP.md

### Fixed

- Fixed variable redeclaration bug in `FlowBuilder._createFlowContext()` (lines 270-271)
- Fixed async context creation in FlowBuilder to properly load state from SessionManager

---

## [0.1.0] - Phase 1: Project Foundation (Complete)

### Added

#### Project Infrastructure

- TypeScript 5.6+ configuration with strict mode
- ESM module format with CommonJS fallback
- tsup bundler configuration with esbuild
- Biome configuration for linting and formatting
- Vitest configuration for testing (80% coverage threshold)
- Zod for runtime validation
- Directory structure (`src/core/`, `src/platforms/`, `src/plugins/`, etc.)
- `.env.example` file for configuration

#### Core System

- `Chatbot` main class - Entry point for SDK
- `Context` class - Message context with state management
- `Router` class - Command, text, and event routing
- `Middleware` system - Composable middleware chain
- `ChatbotError` class - Custom error handling with error codes
- `Logger` class - Winston-based logging with child logger support
- `BasePlatform` abstract class - Foundation for platform adapters
- `BasePlugin` abstract class - Foundation for plugins

#### Configuration & Validation

- Zod schemas for config validation:
  - `LoggingConfigSchema` - Logging configuration
  - `TelegramConfigSchema` - Telegram platform config
  - `WhatsAppConfigSchema` - WhatsApp platform config
  - `DatabaseConfigSchema` - Database configuration
  - `AIConfigSchema` - AI provider configuration
  - `ChatbotConfigSchema` - Main chatbot configuration
- `validateConfig()` function - Throws on invalid config
- `safeValidateConfig()` function - Returns success/error result

#### Event System

- EventEmitter3 integration for lifecycle events
- Built-in events: `start`, `stop`, `message`, `error`
- `bot.onEvent()` method for subscribing to events

#### Middleware

- `LoggingMiddleware` - Request/response logging
- `ErrorHandlingMiddleware` - Centralized error handling
- `RateLimitMiddleware` - Rate limiting per user

#### Context Helpers

- `ctx.reply()` - Send text or structured messages
- `ctx.replyWithMedia()` - Send media (image, video, audio, document)
- `ctx.replyWithButtons()` - Send messages with inline/keyboard buttons
- `ctx.state` - Context-scoped state management

#### Graceful Shutdown

- `bot.start()` - Initialize all platforms and plugins
- `bot.stop()` - Gracefully shutdown with cleanup
- Platform and plugin lifecycle management
- Error handling during shutdown

#### Type Definitions

- `IContext` - Message context interface
- `IRouter` - Router interface
- `IMiddleware` - Middleware interface
- `IPlatform` - Platform adapter interface
- `IPlugin` - Plugin interface
- `IChatbot` - Chatbot interface
- `IDatabaseAdapter` - Database adapter interface (placeholder)
- Message type definitions (IncomingMessage, OutgoingMessage, MessageType)
- Platform type definitions (PlatformType)
- Configuration types (ChatbotConfig, LoggingConfig, etc.)

#### Testing

- 230 unit tests across all core modules
- 97.38% code coverage
- Test files for:
  - Chatbot.test.ts
  - Context.test.ts
  - Router.test.ts
  - Middleware.test.ts
  - ChatbotError.test.ts
  - Logger.test.ts
  - ConfigSchema.test.ts
  - BasePlatform.test.ts
  - BasePlugin.test.ts

### Quick Wins Implemented

- ✅ Zod validation for all config
- ✅ JSDoc comments on all public APIs
- ✅ All modules exported from `src/index.ts`
- ✅ EventEmitter for lifecycle hooks
- ✅ Graceful shutdown handling

---

## Release Notes

### Version 0.1.0 - Foundation Complete

This release establishes the core foundation of the Omnichannel Chatbot SDK with a complete type-safe architecture, robust error handling, comprehensive testing, and extensible plugin system.

### Phase 2 - Core System Enhancements Complete

Phase 2 adds essential features for production chatbots including session management for stateful conversations and a powerful conversation flow builder for creating multi-step user interactions.

**Next:** Phase 3 will add the database layer with Supabase integration and Drizzle ORM for persistent storage of users, conversations, and messages.

---

## Development Roadmap

- ✅ **Phase 1:** Project Foundation (100%)
- ✅ **Phase 2:** Core System Enhancements (100%)
- 🔄 **Phase 3:** Database Layer (0%)
- 🔄 **Phase 4:** Platform Adapters (0%)
- 🔄 **Phase 5:** Built-in Plugins (0%)
- 🔄 **Phase 6:** Admin Panel (0%)
- 🔄 **Phase 7:** CLI & Publishing (0%)

See [ROADMAP.md](./ROADMAP.md) for detailed development plan.
