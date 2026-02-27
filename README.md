# Omnichannel Chatbot SDK

A comprehensive Node.js SDK for building production-ready chatbots with multi-platform support, live chat handoff, broadcast messaging, and AI-powered responses.

## Features

- **Multi-Platform Support** - Telegram and WhatsApp out of the box
- **Live Chat Handoff** - Seamlessly transfer conversations to human agents
- **Broadcast Messaging** - Send announcements to all contacts with rate limiting
- **AI-Powered Responses** - Integrate with Gemini, OpenAI, or other LLMs
- **Feature Toggles** - Subscription-based feature control via Service API
- **Admin Panel** - Built-in admin dashboard for managing conversations
- **Plugin Architecture** - Extend functionality with custom plugins

## Quick Start

```bash
npm install @code-alchemist/omnichannel-chatbot-sdk
```

```javascript
const { Chatbot, LiveChatPlugin, BroadcastPlugin, AIPlugin } = require('@code-alchemist/omnichannel-chatbot-sdk');

const bot = new Chatbot({
  database: {
    provider: 'supabase',
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  platforms: {
    telegram: { token: process.env.TELEGRAM_BOT_TOKEN },
    whatsapp: {
      provider: 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      number: process.env.TWILIO_WHATSAPP_NUMBER
    }
  }
});

// Add features
bot.use(new LiveChatPlugin());
bot.use(new BroadcastPlugin());
bot.use(new AIPlugin({ provider: 'gemini', apiKey: process.env.GEMINI_API_KEY }));

// Serve admin panel
bot.serveAdmin({ port: 3000 });

// Start
bot.start();
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Plugins](docs/plugins.md)
- [Admin Panel](docs/admin-panel.md)
- [Service API](docs/service-api.md)
- [Custom Plugins](docs/custom-plugins.md)
- [Database Migrations](docs/migrations.md)
- [API Reference](docs/api-reference.md)

## Architecture

```
@code-alchemist/omnichannel-chatbot-sdk/
├── src/
│   ├── Chatbot.ts              # Main entry point
│   ├── core/                   # Core functionality
│   │   ├── Context.ts          # Message context
│   │   ├── Router.ts           # Message routing
│   │   └── Middleware.ts       # Middleware system
│   ├── platforms/              # Platform adapters
│   │   ├── TelegramPlatform.ts
│   │   └── WhatsAppPlatform.ts
│   ├── plugins/                # Built-in plugins
│   │   ├── LiveChatPlugin.ts
│   │   ├── BroadcastPlugin.ts
│   │   └── AIPlugin.ts
│   ├── database/               # Database adapters
│   │   └── SupabaseAdapter.ts
│   └── admin/                  # Admin panel
└── migrations/                 # Database setup scripts
```

## Supported Platforms

| Platform | Provider | Status |
|----------|----------|--------|
| Telegram | Telegram Bot API | Supported |
| WhatsApp | Twilio | Supported |
| WhatsApp | whatsapp-web.js | Supported |
| Discord | - | Planned |
| Facebook Messenger | - | Planned |

## Supported AI Providers

| Provider | Status |
|----------|--------|
| Google Gemini | Supported |
| OpenAI | Planned |
| Anthropic Claude | Planned |

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
