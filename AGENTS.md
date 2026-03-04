# AGENTS.md - Guidelines for AI Coding Agents

This document provides guidelines for AI coding agents working on the Omnichannel Chatbot SDK project.

## Project Overview

A comprehensive Node.js SDK for building production-ready chatbots with multi-platform support, live chat handoff, broadcast messaging, and AI-powered responses.

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.6+ (strict mode) |
| Module Format | ESM (with CJS fallback) |
| Bundler | tsup (esbuild) |
| Linter/Formatter | Biome |
| Testing | Vitest |
| Validation | Zod |
| ORM | Drizzle ORM |

## Development Commands

### Build Commands
```bash
npm run build          # Bundle with tsup (ESM + CJS)
npm run dev            # Watch mode bundling
npm run typecheck      # Type check without emitting
```

### Test Commands
```bash
npm test               # Run all tests with Vitest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report

# Run a single test file
npx vitest src/core/Router.test.ts

# Run tests matching a pattern
npx vitest --testNamePattern="should handle"

# Run tests for a specific file with watch mode
npx vitest src/__tests__/Chatbot.test.ts --watch
```

### Linting & Formatting
```bash
npm run lint           # Check with Biome
npm run lint:fix       # Fix lint issues
npm run format         # Format code with Biome
npm run check          # Lint, format, and typecheck
```

### Database Commands
```bash
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio
```

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Module: ESNext (bundled to ESM + CJS)
- Strict mode enabled with additional checks
- Path aliases: `@/`, `@/core/`, `@/plugins/`, etc.

### File Organization
```
src/
├── index.ts                # Main entry point
├── core/                   # Core functionality
│   ├── Chatbot.ts         # Main chatbot class
│   ├── Context.ts         # Message context
│   ├── Router.ts          # Message routing
│   ├── Middleware.ts      # Middleware system
│   ├── ChatbotError.ts    # Custom errors
│   └── Logger.ts          # Winston logger
├── platforms/             # Platform adapters
│   ├── index.ts
│   ├── BasePlatform.ts
│   ├── TelegramPlatform.ts
│   └── WhatsAppPlatform.ts
├── plugins/               # Built-in plugins
│   ├── index.ts
│   ├── BasePlugin.ts
│   ├── LiveChatPlugin.ts
│   ├── BroadcastPlugin.ts
│   └── AIPlugin.ts
├── database/              # Database adapters
│   └── SupabaseAdapter.ts
├── admin/                 # Admin panel
├── types/                 # Type definitions
│   └── index.ts
├── utils/                 # Utility functions
└── __tests__/            # Test files
```

### Import/Export Style
```typescript
// External dependencies first
import { Bot } from 'grammy';
import express from 'express';

// Internal imports with .js extension (ESM requirement)
import { Context } from './core/Context.js';
import type { IPlatform } from './types/index.js';

// Use path aliases for cross-directory imports
import { ChatbotError } from '@/core/ChatbotError.js';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `Chatbot`, `TelegramPlatform` |
| Interfaces | PascalCase with 'I' prefix | `IPlugin`, `IPlatform` |
| Types | PascalCase | `MessageType`, `PlatformType` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PORT`, `ERROR_CODES` |
| Functions | camelCase | `handleMessage`, `sendBroadcast` |
| Variables | camelCase | `messageCount`, `isStarted` |
| Private members | _camelCase (underscore prefix) | `_config`, `_started` |
| Enum members | UPPER_SNAKE_CASE | `MessageType.TEXT` |

### Error Handling

```typescript
import { ChatbotError, ErrorCodes } from '@/core/ChatbotError.js';

// Always handle errors explicitly
try {
  await this._platform.sendMessage(userId, message);
} catch (error) {
  this._logger.error('Failed to send message', { error, userId });
  throw new ChatbotError(
    ErrorCodes.MESSAGE_SEND_FAILED,
    'Failed to send message to user',
    { userId, originalError: error }
  );
}

// Use ChatbotError.from() to wrap unknown errors
catch (error) {
  throw ChatbotError.from(error, ErrorCodes.UNKNOWN_ERROR);
}
```

### Testing Guidelines

**Test file naming**: `*.test.ts` or `*.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chatbot } from '../core/Chatbot.js';

describe('Chatbot', () => {
  let bot: Chatbot;
  
  beforeEach(() => {
    bot = new Chatbot(mockConfig);
  });
  
  describe('start()', () => {
    it('should initialize all platforms', async () => {
      await bot.start();
      expect(bot.platforms.size).toBe(2);
    });
    
    it('should throw error when already started', async () => {
      await bot.start();
      await expect(bot.start()).rejects.toThrow(ChatbotError);
    });
  });
});
```

**Mock external dependencies**
```typescript
vi.mock('grammy');
vi.mock('twilio');
```

### Plugin Development

```typescript
import { BasePlugin } from '@/plugins/BasePlugin.js';
import type { IChatbot } from '@/types/index.js';

export class MyPlugin extends BasePlugin {
  public readonly name = 'MyPlugin';
  public readonly version = '1.0.0';

  protected onInstall(): void {
    // Register handlers
    this.chatbot.command('mycommand', async (ctx) => {
      await ctx.reply('Hello from MyPlugin!');
    });
  }

  protected onUninstall(): void {
    // Cleanup
  }
}
```

### Platform Development

```typescript
import { BasePlatform } from '@/platforms/BasePlatform.js';
import type { PlatformType, OutgoingMessage, MessageResult } from '@/types/index.js';

export class MyPlatform extends BasePlatform {
  public readonly name: PlatformType = 'telegram';
  public readonly version = '1.0.0';

  protected async onInitialize(): Promise<void> {
    // Initialize platform client
  }

  protected async onShutdown(): Promise<void> {
    // Cleanup
  }

  async sendMessage(userId: string, message: OutgoingMessage): Promise<MessageResult> {
    // Send message implementation
  }
}
```

### Documentation

```typescript
/**
 * Sends a message to the specified user
 * @param userId - Unique identifier for the user
 * @param message - Message content to send
 * @returns Promise that resolves with message result
 * @throws {ChatbotError} If message sending fails
 */
async sendMessage(userId: string, message: OutgoingMessage): Promise<MessageResult> {
  // Implementation
}
```

### Git Conventions

**Branch naming**: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`

**Commit messages**: Follow conventional commits
```bash
git commit -m "feat: add Discord platform support"
git commit -m "fix: resolve webhook signature validation"
git commit -m "docs: update API reference for plugins"
git commit -m "refactor: extract platform interface"
git commit -m "test: add coverage for broadcast plugin"
```

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Error handling is comprehensive
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No secrets or credentials in code
- [ ] Uses `.js` extension for imports (ESM)
- [ ] Breaking changes documented

## Additional Resources

- [ROADMAP.md](./ROADMAP.md) - Development phases and progress
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [docs/](./docs/) - Detailed documentation
