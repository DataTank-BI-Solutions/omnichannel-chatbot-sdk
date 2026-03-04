# Omnichannel Chatbot SDK - Development Roadmap

This document outlines the phased development plan for the SDK.

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.6+ |
| Module Format | ESM (with CJS fallback) |
| Bundler | tsup (esbuild) |
| Linter/Formatter | Biome |
| Testing | Vitest |
| Validation | Zod |

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
- [ ] Write unit tests for core system

## Phase 2: Core System Enhancements

- [ ] Add Zod schemas for config validation
- [ ] Implement event emitter system
- [ ] Add graceful shutdown handling
- [ ] Implement session state management
- [ ] Add conversation flow builder
- [ ] Write comprehensive unit tests

## Phase 3: Database Layer

- [ ] Define `IDatabaseAdapter` interface
- [ ] Implement `SupabaseAdapter` with Drizzle ORM
- [ ] Create SQL migrations for:
  - [ ] Users table
  - [ ] Conversations table
  - [ ] Messages table
  - [ ] Broadcasts table
  - [ ] Feature toggles table
- [ ] Implement repository classes (UserRepository, MessageRepository, etc.)
- [ ] Write unit tests for database layer

## Phase 4: Platform Adapters

- [ ] Define `IPlatform` interface with common methods
- [ ] Implement `TelegramPlatform` using grammY
  - [ ] Webhook and polling support
  - [ ] Message sending (text, media, buttons)
  - [ ] Message receiving and parsing
- [ ] Implement `WhatsAppPlatform` using Baileys (free) and Twilio (paid)
  - [ ] Webhook handling
  - [ ] Message sending (text, media, templates)
  - [ ] Message receiving and parsing
- [ ] Implement platform-agnostic message normalization
- [ ] Write unit tests for platforms
- [ ] Write integration tests for platforms

## Phase 5: Built-in Plugins

- [ ] Define `IPlugin` interface with lifecycle hooks
- [ ] Implement `LiveChatPlugin`
  - [ ] Agent assignment logic
  - [ ] Conversation handoff
  - [ ] Agent availability management
  - [ ] Conversation history
- [ ] Implement `BroadcastPlugin`
  - [ ] Audience targeting
  - [ ] Rate limiting
  - [ ] Delivery tracking
  - [ ] Scheduling support
- [ ] Implement `AIPlugin` using Vercel AI SDK
  - [ ] Gemini integration
  - [ ] OpenAI integration
  - [ ] Anthropic Claude integration
  - [ ] Conversation context management
  - [ ] Response streaming
  - [ ] Fallback handling
- [ ] Write unit tests for each plugin
- [ ] Write integration tests for plugin interactions

## Phase 6: Admin Panel

- [ ] Implement admin API routes (`src/admin/api.ts`)
  - [ ] Authentication endpoints
  - [ ] Conversation management endpoints
  - [ ] User management endpoints
  - [ ] Broadcast management endpoints
  - [ ] Analytics endpoints
- [ ] Implement admin panel UI (`src/admin/panel.ts`)
  - [ ] Dashboard view
  - [ ] Conversation list and detail views
  - [ ] User management views
  - [ ] Broadcast composer
  - [ ] Settings page
- [ ] Add JWT-based authentication
- [ ] Add role-based authorization (admin, agent)
- [ ] Write tests for admin functionality

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

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | In Progress | 90% |
| Phase 2: Core Enhancements | Not Started | 0% |
| Phase 3: Database | Not Started | 0% |
| Phase 4: Platforms | Not Started | 0% |
| Phase 5: Plugins | Not Started | 0% |
| Phase 6: Admin Panel | Not Started | 0% |
| Phase 7: CLI & Publishing | Not Started | 0% |

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
