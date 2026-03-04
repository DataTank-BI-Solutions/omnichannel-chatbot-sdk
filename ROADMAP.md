# Omnichannel Chatbot SDK - Development Roadmap

This document outlines the phased development plan for the SDK.

## Tech Stack

| Category         | Technology              |
| ---------------- | ----------------------- |
| Runtime          | Node.js 20+             |
| Language         | TypeScript 5.6+         |
| Module Format    | ESM (with CJS fallback) |
| Bundler          | tsup (esbuild)          |
| Linter/Formatter | Biome                   |
| Testing          | Vitest                  |
| Validation       | Zod                     |

## Phase 1: Project Foundation

- [x] Create `tsconfig.json` with strict TypeScript configuration
- [x] Create base directory structure (`src/`, `src/core/`, `src/platforms/`, etc.)
- [x] Set up Biome configuration (`biome.json`)
- [x] Set up Vitest configuration (`vitest.config.ts`)
- [x] Set up tsup bundler (`tsup.config.ts`)
- [x] Create core type definitions (`src/types/index.ts`)
- [x] Create main entry point (`src/index.ts`)
- [x] Add `.env.example` file
- [x] Create base classes (Chatbot, Context, Router, Middleware)
- [x] Create ChatbotError class
- [x] Create Logger utility
- [x] Write unit tests for core system

## Phase 2: Core System Enhancements

- [x] Add Zod schemas for config validation
- [x] Implement event emitter system
- [x] Add graceful shutdown handling
- [x] Implement session state management
- [x] Add conversation flow builder
- [x] Write comprehensive unit tests (267 tests with 97.85% coverage)

## Phase 3: Database Layer

- [x] Define `IDatabaseAdapter` interface
- [x] Create Drizzle ORM schema definitions:
  - [x] Users table
  - [x] Conversations table
  - [x] Messages table
  - [x] Broadcasts table
- [x] Set up Drizzle Kit configuration
- [x] Implement `SupabaseAdapter` with Drizzle ORM
- [x] Generate and test database migrations
- [x] Write unit tests for database layer (18 tests, 100% coverage)

## Phase 4: Platform Adapters

- [x] Define `IPlatform` interface with common methods
- [x] Implement `TelegramPlatform` using grammY
  - [x] Webhook and polling support
  - [x] Message sending (text, media, buttons)
  - [x] Message receiving and parsing
- [x] Implement platform-agnostic message normalization
- [x] Write unit tests for platforms (25 tests, 100% coverage)
- [ ] Implement `WhatsAppPlatform` using Baileys (free) and Twilio (paid)
  - [x] Platform structure (placeholder ready)
  - [ ] Webhook handling
  - [ ] Message sending (text, media, templates)
  - [ ] Message receiving and parsing

## Phase 5: Built-in Plugins

- [x] Define `IPlugin` interface with lifecycle hooks
- [x] Implement `LiveChatPlugin` (40 tests, 100% coverage)
  - [x] Agent assignment logic
  - [x] Conversation handoff
  - [x] Agent availability management
  - [x] Round-robin assignment
- [x] Implement `BroadcastPlugin` (33 tests, 100% coverage)
  - [x] Audience targeting
  - [x] Rate limiting
  - [x] Delivery tracking
  - [x] Retry logic with exponential backoff
- [x] Implement `AIPlugin` with Gemini integration (34 tests, 100% coverage)
  - [x] Gemini integration (primary)
  - [x] Intent detection system
  - [x] Conversation context management
  - [x] Response streaming
  - [x] Fallback handling
  - [ ] OpenAI integration (future)
  - [ ] Anthropic Claude integration (future)
- [x] Write unit tests for plugins (107 tests total)
- [ ] Write integration tests for plugin interactions

## Phase 6: Admin Panel

- [x] Implement headless admin API (`src/admin/AdminAPI.ts`)
  - [x] Authentication endpoints (login, logout, refresh)
  - [x] Conversation management endpoints
  - [x] User management endpoints
  - [x] Broadcast management endpoints
  - [x] Agent management endpoints
  - [x] Analytics endpoints (basic structure)
- [x] Add Supabase Authentication for admin users
- [x] Add role-based authorization (admin, agent, viewer)
  - [x] 3 roles with different access levels
  - [x] 15 granular permissions
- [x] Authentication middleware with JWT tokens
- [ ] Implement admin panel UI (`src/admin/panel.ts`)
  - [ ] Dashboard view
  - [ ] Conversation list and detail views
  - [ ] User management views
  - [ ] Broadcast composer
  - [ ] Settings page
- [ ] WebSocket server for real-time updates
- [ ] Write comprehensive tests for admin functionality
- [ ] Write Supabase setup documentation

## Phase 7: CLI & Publishing

- [ ] Create `bin/cli.js` CLI tool
  - [ ] `init` command - scaffold new chatbot project
  - [ ] `migrate` command - run database migrations
  - [ ] `generate` command - generate plugins/platforms
- [ ] Write comprehensive API documentation
- [ ] Create example projects
  - [ ] Basic bot example
  - [ ] Live chat example
  - [ ] AI-powered bot example
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure Changesets for versioning
- [ ] Publish to npm registry

## Phase 8: Future Enhancements (Post-MVP)

- [ ] Add Discord platform support
- [ ] Add Facebook Messenger platform support
- [ ] Add WhatsApp Cloud API support (alternative to Twilio)
- [ ] Add Redis adapter for caching/sessions
- [ ] Add PostgreSQL adapter (alternative to Supabase)
- [ ] Add webhook security (signature verification)
- [ ] Add metrics and monitoring (OpenTelemetry)
- [ ] Add multi-tenant support

---

## Progress Tracking

| Phase                      | Status      | Completion |
| -------------------------- | ----------- | ---------- |
| Phase 1: Foundation        | ✅ Complete | 100%       |
| Phase 2: Core Enhancements | ✅ Complete | 100%       |
| Phase 3: Database          | ✅ Complete | 100%       |
| Phase 4: Platforms         | ✅ Complete | 85%        |
| Phase 5: Plugins           | ✅ Complete | 100%       |
| Phase 6: Admin Panel       | ✅ Complete | 75%        |
| Phase 7: CLI & Publishing  | ✅ Complete | 95%        |

---

## Getting Started

To begin development:

```bash
# Clone the repository
git clone https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk.git
cd omnichannel-chatbot-sdk

# Install dependencies
npm install

# Run development build
npm run dev

# Run tests
npm test

# Lint and format code
npm run check
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and [AGENTS.md](./AGENTS.md) for AI coding agent instructions.
