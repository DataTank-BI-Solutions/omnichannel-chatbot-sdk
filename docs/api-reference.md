# API Reference

Complete API reference for the Omnichannel Chatbot SDK.

## Chatbot Class

### Constructor

```typescript
new Chatbot(config: ChatbotConfig)
```

**Parameters:**
- `config.database` - Database configuration (required)
- `config.platforms` - Platform configurations (required)
- `config.serviceApi` - Service API configuration (optional)
- `config.logger` - Logger configuration (optional)

**Example:**
```javascript
const bot = new Chatbot({
  database: {
    provider: 'supabase',
    url: 'https://xxx.supabase.co',
    serviceKey: 'xxx'
  },
  platforms: {
    telegram: { token: 'xxx' }
  }
});
```

### Methods

#### `use(plugin: Plugin): Chatbot`

Register a plugin.

```javascript
bot.use(new LiveChatPlugin());
```

#### `start(): Promise<void>`

Start the bot and all platforms.

```javascript
await bot.start();
```

#### `stop(): Promise<void>`

Stop the bot and clean up resources.

```javascript
await bot.stop();
```

#### `onMessage(handler: MessageHandler): void`

Register a default message handler.

```javascript
bot.onMessage(async (ctx) => {
  await ctx.reply('Hello!');
});
```

#### `on(event: string, handler: EventHandler): void`

Register an event listener.

```javascript
bot.on('support:session:created', (session) => {
  console.log('New session:', session.id);
});
```

#### `command(name: string, handler: CommandHandler): void`

Register a command handler.

```javascript
bot.command('help', async (ctx) => {
  await ctx.reply('Available commands: /help, /human');
});
```

#### `serveAdmin(config: AdminConfig): void`

Start the admin panel server.

```javascript
bot.serveAdmin({ port: 3000 });
```

#### `runMigrations(): Promise<void>`

Run database migrations.

```javascript
await bot.runMigrations();
```

---

## Context Object

The context object is passed to all message handlers.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique message ID |
| `from` | `string` | User identifier (e.g., `telegram:123456`) |
| `body` | `string` | Message text |
| `platform` | `string` | Platform name (`telegram` or `whatsapp`) |
| `timestamp` | `Date` | Message timestamp |
| `user` | `object` | User information (if available) |
| `state` | `Map` | Per-request state |
| `session` | `object` | Persistent session data |

### Methods

#### `reply(text: string): Promise<void>`

Send a text reply.

```javascript
await ctx.reply('Hello!');
```

#### `replyWithMarkdown(text: string): Promise<void>`

Send a reply with markdown formatting.

```javascript
await ctx.replyWithMarkdown('**Bold** and _italic_');
```

#### `isFeatureEnabled(key: string): Promise<boolean>`

Check if a feature is enabled.

```javascript
if (await ctx.isFeatureEnabled('ai_responses')) {
  // AI is enabled
}
```

#### `getSession(): Promise<SessionData>`

Get the user's session data.

```javascript
const session = await ctx.getSession();
```

#### `setSession(data: object): Promise<void>`

Update the user's session data.

```javascript
await ctx.setSession({ lastTopic: 'pricing' });
```

---

## Plugin Interface

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Plugin name |
| `version` | `string` | Plugin version |

### Lifecycle Methods

#### `onInit(bot: Chatbot): Promise<void>`

Called when the plugin is registered.

#### `onStart(bot: Chatbot): Promise<void>`

Called when the bot starts.

#### `onStop(bot: Chatbot): Promise<void>`

Called when the bot stops.

### Optional Methods

#### `onMessage(ctx: Context, next: NextFunction): Promise<void>`

Handle incoming messages.

```javascript
async onMessage(ctx, next) {
  // Handle message
  await next(); // Pass to next handler
}
```

#### `getAdminRoutes(): Router`

Return Express router for admin API endpoints.

#### `getServiceRoutes(): Router`

Return Express router for service API endpoints.

#### `getMigrations(): string[]`

Return array of SQL migration statements.

---

## LiveChatPlugin

### Constructor

```typescript
new LiveChatPlugin(config?: LiveChatConfig)
```

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `featureKey` | `string` | `'live_chat'` | Feature toggle key |
| `businessHours.enabled` | `boolean` | `true` | Enable business hours |
| `businessHours.timezone` | `string` | `'UTC'` | Timezone |
| `businessHours.schedule` | `object` | - | Hours per day |
| `triggers.commands` | `string[]` | `['/human']` | Commands that trigger handoff |
| `triggers.keywords` | `string[]` | `[]` | Keywords that trigger handoff |
| `triggers.maxBotTurns` | `number` | `5` | Auto-handoff after N turns |
| `messages.handoffInitiated` | `string` | - | Message when handoff starts |
| `messages.outsideHours` | `string` | - | Message outside business hours |
| `messages.featureDisabled` | `string` | - | Message when feature disabled |

---

## BroadcastPlugin

### Constructor

```typescript
new BroadcastPlugin(config?: BroadcastConfig)
```

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `featureKey` | `string` | `'broadcast'` | Feature toggle key |
| `rateLimit.telegram` | `number` | `25` | Messages per second |
| `rateLimit.whatsapp` | `number` | `10` | Messages per second |
| `retry.maxAttempts` | `number` | `3` | Max retry attempts |
| `retry.backoffMs` | `number` | `1000` | Backoff delay |
| `whatsapp.enabled` | `boolean` | `false` | Enable WhatsApp broadcasts |
| `contacts.autoSyncFromSessions` | `boolean` | `true` | Auto-sync contacts |
| `contacts.captureDisplayNames` | `boolean` | `true` | Capture user names |

---

## AIPlugin

### Constructor

```typescript
new AIPlugin(config: AIConfig)
```

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `featureKey` | `string` | `'ai_responses'` | Feature toggle key |
| `provider` | `string` | - | AI provider (`gemini`, `openai`) |
| `apiKey` | `string` | - | API key |
| `model` | `string` | - | Model name |
| `knowledgeBase.table` | `string` | `'faqs'` | FAQ table name |
| `intents.enabled` | `boolean` | `true` | Enable intent detection |
| `intents.custom` | `array` | `[]` | Custom intent definitions |
| `formatting.maxLength` | `number` | `1000` | Max response length |
| `formatting.tone` | `string` | `'friendly'` | Response tone |
| `fallback.message` | `string` | - | Message when AI disabled |

---

## Events

### Bot Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `Context` | New message received |
| `error` | `Error` | Error occurred |
| `start` | - | Bot started |
| `stop` | - | Bot stopped |

### Live Chat Events

| Event | Payload | Description |
|-------|---------|-------------|
| `support:session:created` | `Session` | New support session |
| `support:session:claimed` | `Session` | Session claimed by admin |
| `support:session:resolved` | `Session` | Session resolved |
| `support:message:received` | `Message` | User message in session |
| `support:message:sent` | `Message` | Admin reply sent |

### Broadcast Events

| Event | Payload | Description |
|-------|---------|-------------|
| `broadcast:created` | `Broadcast` | Broadcast created |
| `broadcast:started` | `Broadcast` | Broadcast sending started |
| `broadcast:completed` | `Broadcast` | Broadcast completed |
| `broadcast:message:sent` | `Recipient` | Message sent to recipient |
| `broadcast:message:failed` | `Recipient` | Message delivery failed |

---

## Service API

### Endpoints

#### `GET /api/service/features`

List all features.

**Response:**
```json
{
  "success": true,
  "features": [
    { "key": "ai_responses", "name": "AI Responses", "enabled": true }
  ]
}
```

#### `POST /api/service/features/:key/toggle`

Toggle a feature.

**Request:**
```json
{ "enabled": false }
```

**Response:**
```json
{
  "success": true,
  "feature": { "key": "ai_responses", "enabled": false }
}
```

#### `POST /api/service/features/bulk`

Bulk toggle features.

**Request:**
```json
{
  "features": {
    "ai_responses": true,
    "live_chat": false
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CONFIG` | Invalid configuration provided |
| `PLATFORM_ERROR` | Platform connection error |
| `DATABASE_ERROR` | Database operation failed |
| `FEATURE_DISABLED` | Feature is disabled |
| `AUTH_REQUIRED` | Authentication required |
| `AUTH_INVALID` | Invalid authentication |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMITED` | Rate limit exceeded |
