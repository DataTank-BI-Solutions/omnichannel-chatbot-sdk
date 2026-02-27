# Getting Started

This guide will help you set up your first chatbot using the Omnichannel Chatbot SDK.

## Prerequisites

- Node.js 18 or higher
- A Supabase project (for database)
- At least one messaging platform configured:
  - Telegram Bot Token (from [@BotFather](https://t.me/botfather))
  - Twilio Account (for WhatsApp)

## Installation

```bash
# Using npm
npm install @code-alchemist/omnichannel-chatbot-sdk

# Using yarn
yarn add @code-alchemist/omnichannel-chatbot-sdk

# From GitHub (private)
npm install github:code-alchemist-dev/omnichannel-chatbot-sdk
```

## Environment Setup

Create a `.env` file in your project root:

```env
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token

# WhatsApp (Twilio) - Optional
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# AI (Optional)
GEMINI_API_KEY=your-gemini-api-key

# Service API (for billing integration)
SERVICE_API_KEY=your-secret-key

# Server
PORT=3000
```

## Database Setup

Run the database migrations to set up required tables:

```bash
# Using CLI
npx omnichannel-chatbot migrate

# Or programmatically
const { Chatbot } = require('@code-alchemist/omnichannel-chatbot-sdk');

const bot = new Chatbot({ /* config */ });
await bot.runMigrations();
```

## Basic Example

```javascript
require('dotenv').config();
const { Chatbot } = require('@code-alchemist/omnichannel-chatbot-sdk');

// Create bot instance
const bot = new Chatbot({
  database: {
    provider: 'supabase',
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  platforms: {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN
    }
  }
});

// Simple message handler
bot.onMessage(async (ctx) => {
  await ctx.reply(`You said: ${ctx.body}`);
});

// Start the bot
bot.start().then(() => {
  console.log('Bot is running!');
});
```

## Adding Plugins

Enhance your bot with built-in plugins:

```javascript
const { 
  Chatbot, 
  LiveChatPlugin, 
  BroadcastPlugin, 
  AIPlugin 
} = require('@code-alchemist/omnichannel-chatbot-sdk');

const bot = new Chatbot({ /* config */ });

// Live chat handoff to human agents
bot.use(new LiveChatPlugin({
  businessHours: {
    timezone: 'Africa/Johannesburg',
    schedule: {
      weekdays: { start: 8, end: 17 }
    }
  }
}));

// Broadcast messaging
bot.use(new BroadcastPlugin({
  rateLimit: { telegram: 25, whatsapp: 10 }
}));

// AI-powered responses
bot.use(new AIPlugin({
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY
}));

bot.start();
```

## Serving the Admin Panel

```javascript
// Serve admin panel on port 3000
bot.serveAdmin({
  port: 3000,
  auth: {
    provider: 'supabase'
  }
});

// Admin panel will be available at http://localhost:3000/admin
```

## Next Steps

- [Configuration Reference](configuration.md) - All configuration options
- [Plugins](plugins.md) - Detailed plugin documentation
- [Custom Plugins](custom-plugins.md) - Build your own plugins
- [Service API](service-api.md) - Integrate with billing systems
