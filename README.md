# 🤖 Omnichannel Chatbot SDK

<div align="center">

[![npm version](https://badge.fury.io/js/@code-alchemist%2Fomnichannel-chatbot-sdk.svg)](https://www.npmjs.com/package/@code-alchemist/omnichannel-chatbot-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-471%20passing-brightgreen)](.)

**A comprehensive Node.js SDK for building production-ready chatbots with multi-platform support, live chat handoff, broadcast messaging, and AI-powered responses.**

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Examples](#-examples)

</div>

---

## ✨ Features

- 🚀 **Multi-Platform** - Telegram, WhatsApp (more coming soon)
- 🎯 **Built-in Plugins** - Live Chat, Broadcast, AI Assistant
- 🔐 **Admin Panel** - REST API with Supabase Auth & RBAC
- 📊 **Database** - Supabase/PostgreSQL with Drizzle ORM
- 🧪 **Type-Safe** - Full TypeScript with 471 passing tests
- 🛠️ **CLI Tool** - Scaffold projects instantly
- 🔌 **Extensible** - Plugin & middleware architecture

---

## 📦 Installation

```bash
npm install @code-alchemist/omnichannel-chatbot-sdk
```

Or create a new project with CLI:

```bash
npx @code-alchemist/omnichannel-chatbot-sdk init my-bot
```

---

## 🚀 Quick Start

```typescript
import { Chatbot } from "@code-alchemist/omnichannel-chatbot-sdk";

const bot = new Chatbot({
  platforms: {
    telegram: { token: process.env.TELEGRAM_BOT_TOKEN! },
  },
});

bot.command("start", async (ctx) => {
  await ctx.reply("👋 Welcome!");
});

await bot.start();
```

### With Plugins

```typescript
import {
  Chatbot,
  LiveChatPlugin,
  BroadcastPlugin,
  AIPlugin,
} from "@code-alchemist/omnichannel-chatbot-sdk";

const bot = new Chatbot({
  platforms: { telegram: { token: process.env.TELEGRAM_BOT_TOKEN! } },
  database: { provider: "supabase", url: process.env.DATABASE_URL! },
});

// Add live chat support
bot.use(new LiveChatPlugin({ autoAssign: true }));

// Add broadcast messaging
bot.use(new BroadcastPlugin());

// Add AI responses
bot.use(
  new AIPlugin({
    provider: "gemini",
    apiKey: process.env.GEMINI_API_KEY!,
  })
);

await bot.start();
```

---

## 📖 Documentation

### Platform Support

| Platform | Status | Features                           |
| -------- | ------ | ---------------------------------- |
| Telegram | ✅     | Messages, Commands, Media, Buttons |
| WhatsApp | ✅     | Messages, Media, Templates         |
| Discord  | 🚧     | Planned                            |
| Facebook | 🚧     | Planned                            |

### Plugins

#### Live Chat

Human agent handoff with queue management.

```typescript
const liveChat = new LiveChatPlugin({
  autoAssign: true,
  maxConversationsPerAgent: 5,
});

liveChat.addAgent({
  id: "agent-1",
  name: "Alice",
  email: "alice@example.com",
  status: "online",
  maxConversations: 5,
});
```

#### Broadcast

Mass messaging with rate limiting.

```typescript
const broadcast = new BroadcastPlugin();

const campaign = broadcast.createBroadcast("Announcement", {
  text: "🎉 New feature!",
});

await broadcast.sendBroadcast(campaign.id);
```

#### AI Assistant

Gemini AI integration.

```typescript
const ai = new AIPlugin({
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
  enableIntentDetection: true,
});
```

### Admin Panel

Setup admin API for managing your chatbot:

```typescript
import express from "express";
import { AdminAPI } from "@code-alchemist/omnichannel-chatbot-sdk";

const app = express();
const adminAPI = new AdminAPI(bot, {
  jwtSecret: process.env.ADMIN_JWT_SECRET!,
});

app.use("/api/admin", adminAPI.router);
```

**Endpoints**: Login, Conversations, Users, Broadcasts, Agents, Analytics

See [Admin Panel Setup Guide](./docs/admin-panel-setup.md) for details.

---

## 💡 Examples

- [Basic Bot](./examples/test-plugins.cjs)
- [Admin API](./examples/admin-api.ts)
- [Full Documentation](./docs)

---

## 🏗️ CLI

```bash
# Create project
omnichannel-chatbot init my-bot

# Run migrations
omnichannel-chatbot migrate

# Generate templates
omnichannel-chatbot generate plugin
omnichannel-chatbot generate platform
```

---

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

**471 tests passing** | **80%+ coverage**

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

MIT © [Code Alchemist Dev](https://github.com/code-alchemist-dev)

---

<div align="center">

Made with ❤️ by Code Alchemist Dev

⭐ Star us if this project helped you!

</div>
