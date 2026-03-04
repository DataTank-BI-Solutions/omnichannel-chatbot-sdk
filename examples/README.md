# Examples

This directory contains example code demonstrating how to use the Omnichannel Chatbot SDK.

## Quick Test (No API Keys Required)

Test all three plugins locally without any external APIs:

```bash
npm run build
node examples/test-plugins.cjs
```

This will demonstrate:

- ✅ **LiveChatPlugin** - Agent management and conversation assignment
- ✅ **BroadcastPlugin** - Mass messaging campaigns with rate limiting
- ✅ **AIPlugin** - Configuration and intent detection (offline)

## Testing with Real AI (Requires API Key)

1. Get a free Gemini API key from https://ai.google.dev/

2. Run the test with your API key:

```bash
GEMINI_API_KEY=your-api-key-here node examples/test-plugins.cjs
```

## Building a Real Telegram Bot

### Prerequisites

1. **Telegram Bot Token**

   - Open Telegram and message [@BotFather](https://t.me/BotFather)
   - Send `/newbot` and follow the instructions
   - Copy the bot token

2. **Gemini API Key** (for AI responses)
   - Visit https://ai.google.dev/
   - Sign in with your Google account
   - Click "Get API key"
   - Copy your API key

### Example: Simple AI Chatbot

Create a file `my-chatbot.js`:

```javascript
const {
  Chatbot,
  AIPlugin,
} = require("@code-alchemist/omnichannel-chatbot-sdk");

const bot = new Chatbot({
  platforms: {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN,
      useWebhook: false, // Use polling for local development
    },
  },
});

// Add AI plugin
const ai = new AIPlugin({
  apiKey: process.env.GEMINI_API_KEY,
  provider: "gemini",
  model: "gemini-2.0-flash-exp",
  systemPrompt: "You are a helpful assistant.",
  memory: {
    enabled: true,
    maxTurns: 10,
  },
});

bot.use(ai);

// Handle /start command
bot.command("start", async (ctx) => {
  await ctx.reply("Hello! I'm an AI-powered chatbot. Ask me anything!");
});

// Handle all messages with AI
bot.text(/.*/, async (ctx) => {
  const response = await ai.generateResponse(ctx);
  await ctx.reply(response.text);
});

// Start the bot
bot.start().then(() => {
  console.log("Bot is running!");
});
```

Run it:

```bash
TELEGRAM_BOT_TOKEN=your-token GEMINI_API_KEY=your-key node my-chatbot.js
```

### Example: Live Chat + AI Bot

Combine AI with agent handoff:

```javascript
const {
  Chatbot,
  AIPlugin,
  LiveChatPlugin,
} = require("@code-alchemist/omnichannel-chatbot-sdk");

const bot = new Chatbot({
  platforms: {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN,
      useWebhook: false,
    },
  },
});

// Add plugins
const ai = new AIPlugin({
  apiKey: process.env.GEMINI_API_KEY,
  provider: "gemini",
});

const liveChat = new LiveChatPlugin({
  autoAssign: true,
  maxConversationsPerAgent: 5,
});

bot.use(ai);
bot.use(liveChat);

// Add an agent
liveChat.addAgent({
  id: "agent1",
  name: "Support Agent",
  status: "online",
  maxConversations: 5,
  activeConversations: 0,
});

// Request human agent
bot.command("agent", async (ctx) => {
  await liveChat.requestAgent(ctx);
});

// AI handles everything else
bot.text(/.*/, async (ctx) => {
  // Check if user is talking to an agent
  if (liveChat.isAssigned(ctx.conversation.id)) {
    // Forward to agent (you'd implement this)
    return;
  }

  // Use AI
  const response = await ai.generateResponse(ctx);
  await ctx.reply(response.text);
});

bot.start().then(() => {
  console.log("Bot is running with AI + Live Chat!");
});
```

### Example: Broadcast Campaign

Send messages to multiple users:

```javascript
const {
  Chatbot,
  BroadcastPlugin,
} = require("@code-alchemist/omnichannel-chatbot-sdk");

const bot = new Chatbot({
  platforms: {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN,
      useWebhook: false,
    },
  },
});

const broadcast = new BroadcastPlugin({
  rateLimit: {
    telegram: 25, // 25 messages per second
  },
});

bot.use(broadcast);

// When users interact, add them to contacts
bot.command("start", async (ctx) => {
  broadcast.addContact({
    userId: ctx.user.id,
    platform: "telegram",
    chatId: ctx.conversation.chatId,
    firstName: ctx.user.firstName,
    lastName: ctx.user.lastName,
  });

  await ctx.reply("Welcome! You'll receive our updates.");
});

// Admin command to send broadcast
bot.command("broadcast", async (ctx) => {
  // Check if user is admin (implement your auth)
  const campaign = broadcast.createBroadcast({
    name: "Update",
    message: {
      type: "text",
      text: "Hello everyone! Here's our latest update...",
    },
    targetPlatforms: ["telegram"],
    totalRecipients: 0,
  });

  const stats = await broadcast.sendBroadcast(campaign.id);
  await ctx.reply(`Sent to ${stats.sent} users!`);
});

bot.start();
```

## Plugin Combinations

### AI + Live Chat

- AI handles common questions
- Users can request human agents for complex issues
- Agents take over when needed

### AI + Broadcast

- AI for conversations
- Broadcast for announcements
- Collect users automatically

### All Three Plugins

- AI for intelligent responses
- Live chat for support escalation
- Broadcast for marketing campaigns

## Environment Variables

Create a `.env` file in your project root:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Database (optional)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

## Next Steps

1. Check the [main README](../README.md) for full documentation
2. View the [API Reference](../docs/api-reference.md)
3. Read about [Plugin Development](../docs/plugins.md)
4. See the [ROADMAP](../ROADMAP.md) for upcoming features

## Need Help?

- **Issues**: https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk/issues
- **Documentation**: https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk/docs

---

**Happy coding! 🚀**
