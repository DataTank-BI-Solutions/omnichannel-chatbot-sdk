# Plugins

The SDK includes three built-in plugins for common chatbot features.

## Live Chat Plugin

Enables human agent handoff for customer support scenarios.

### Features
- Transfer conversations to human agents
- Business hours configuration
- Automatic handoff triggers (commands, keywords, intents)
- Session management (pending, active, resolved)
- Admin notifications

### Configuration

```javascript
const { LiveChatPlugin } = require('@code-alchemist/omnichannel-chatbot-sdk');

bot.use(new LiveChatPlugin({
  // Feature toggle key (for subscription control)
  featureKey: 'live_chat',
  
  // Business hours
  businessHours: {
    enabled: true,
    timezone: 'Africa/Johannesburg',
    schedule: {
      weekdays: { start: 8, end: 17 },   // Mon-Fri 8am-5pm
      saturday: { start: 9, end: 13 },   // Sat 9am-1pm
      sunday: null                        // Closed
    }
  },
  
  // Handoff triggers
  triggers: {
    // Commands that trigger handoff
    commands: ['/human', '/support', '/agent'],
    
    // Keywords in messages
    keywords: ['speak to human', 'real person', 'talk to agent'],
    
    // AI-detected intents (if AI plugin is enabled)
    intents: ['human_support', 'frustrated', 'angry'],
    
    // Auto-handoff after N bot responses without resolution
    maxBotTurns: 5
  },
  
  // Customizable messages
  messages: {
    handoffInitiated: 'Connecting you to a support advisor. Please hold...',
    outsideHours: 'Our team is available Mon-Fri 8am-5pm SAST. Please leave a message and we\'ll get back to you.',
    featureDisabled: 'Live chat is currently unavailable. Please email support@example.com',
    sessionClosed: 'This support session has been closed. Start a new conversation anytime!'
  },
  
  // Callbacks
  onSessionCreated: async (session) => {
    // Send Slack notification, log to analytics, etc.
    await notifySlack(`New support request from ${session.userIdentifier}`);
  },
  
  onSessionClosed: async (session) => {
    // Send satisfaction survey, log metrics, etc.
    await sendSatisfactionSurvey(session.userIdentifier);
  }
}));
```

### Database Tables

The plugin creates these tables:
- `support_sessions` - Session tracking
- `support_messages` - Message history

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/support/sessions` | List all sessions |
| GET | `/api/admin/support/sessions/:id` | Get session details |
| GET | `/api/admin/support/sessions/:id/messages` | Get session messages |
| POST | `/api/admin/support/sessions/:id/reply` | Send reply to user |
| POST | `/api/admin/support/sessions/:id/claim` | Claim session (assign to agent) |
| POST | `/api/admin/support/sessions/:id/resolve` | Mark as resolved |

---

## Broadcast Plugin

Send announcements and updates to all contacts.

### Features
- Contact registry with opt-in/opt-out
- Rate-limited message delivery
- Delivery status tracking
- Platform-specific handling (Telegram vs WhatsApp)
- WhatsApp template support

### Configuration

```javascript
const { BroadcastPlugin } = require('@code-alchemist/omnichannel-chatbot-sdk');

bot.use(new BroadcastPlugin({
  featureKey: 'broadcast',
  
  // Rate limiting (messages per second)
  rateLimit: {
    telegram: 25,
    whatsapp: 10
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoffMs: 1000
  },
  
  // WhatsApp-specific settings
  whatsapp: {
    // Enable only after Meta template approval
    enabled: false,
    
    // Template ID for messages outside 24h window
    templateId: null,
    
    // Require templates for messages outside session window
    requireTemplateOutside24h: true
  },
  
  // Contact management
  contacts: {
    // Auto-sync contacts from live chat sessions
    autoSyncFromSessions: true,
    
    // Capture display names from platforms
    captureDisplayNames: true
  },
  
  messages: {
    featureDisabled: 'Broadcast messaging is currently unavailable.'
  }
}));
```

### Database Tables

- `broadcast_contacts` - Contact registry
- `broadcasts` - Campaign definitions
- `broadcast_recipients` - Per-recipient delivery tracking

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/broadcast/contacts` | List contacts |
| POST | `/api/admin/broadcast/contacts` | Add contact manually |
| POST | `/api/admin/broadcast/contacts/sync` | Sync from sessions |
| DELETE | `/api/admin/broadcast/contacts/:id` | Remove contact |
| GET | `/api/admin/broadcast` | List broadcasts |
| POST | `/api/admin/broadcast` | Create broadcast |
| POST | `/api/admin/broadcast/:id/send` | Queue for sending |
| POST | `/api/admin/broadcast/:id/cancel` | Cancel broadcast |
| GET | `/api/admin/broadcast/:id/recipients` | Delivery status |

---

## AI Plugin

AI-powered intent detection and response generation.

### Features
- Intent detection from user messages
- Knowledge base search
- Response formatting with context
- Multiple AI provider support
- Fallback handling

### Configuration

```javascript
const { AIPlugin } = require('@code-alchemist/omnichannel-chatbot-sdk');

bot.use(new AIPlugin({
  featureKey: 'ai_responses',
  
  // AI Provider
  provider: 'gemini',  // 'gemini' | 'openai' | 'anthropic'
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.5-flash',
  
  // Knowledge base configuration
  knowledgeBase: {
    table: 'faqs',
    searchFields: ['question', 'response', 'keywords'],
    categoryField: 'category',
    
    // Enable vector search (if configured)
    vectorSearch: false
  },
  
  // Intent detection
  intents: {
    enabled: true,
    
    // Built-in intents
    builtIn: ['greeting', 'farewell', 'human_support', 'general_inquiry'],
    
    // Custom intents
    custom: [
      { 
        name: 'pricing', 
        keywords: ['cost', 'price', 'fee', 'how much'],
        description: 'User asking about pricing'
      },
      { 
        name: 'registration', 
        keywords: ['register', 'sign up', 'enroll', 'join'],
        description: 'User wants to register'
      }
    ]
  },
  
  // Response formatting
  formatting: {
    maxLength: 1000,
    includeEmoji: true,
    tone: 'friendly',  // 'friendly' | 'professional' | 'casual'
    
    // System prompt additions
    systemPrompt: `You are a helpful assistant for Audrey Academy.
                   Always be polite and informative.`
  },
  
  // Fallback when AI is disabled
  fallback: {
    message: 'Our AI assistant is currently unavailable. Please contact support.',
    useFaqKeywordSearch: true  // Fall back to basic FAQ matching
  },
  
  // Conversation memory
  memory: {
    enabled: true,
    maxTurns: 10,
    ttlMinutes: 30
  }
}));
```

### Database Tables

- `faqs` / `knowledge_base` - FAQ content
- `conversation_logs` - Message history
- `intents` - Custom intent definitions

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/faqs` | List FAQs |
| POST | `/api/admin/faqs` | Create FAQ |
| PUT | `/api/admin/faqs/:id` | Update FAQ |
| DELETE | `/api/admin/faqs/:id` | Delete FAQ |
| GET | `/api/admin/conversations` | List conversations |
| GET | `/api/admin/analytics/intents` | Intent analytics |

---

## Plugin Load Order

Plugins are executed in the order they are registered:

```javascript
bot.use(new AIPlugin());       // 1. AI processes message first
bot.use(new LiveChatPlugin()); // 2. Live chat checks for handoff
bot.use(new BroadcastPlugin()); // 3. Broadcast (no message handling)
```

Recommended order:
1. **AIPlugin** - Detect intents first
2. **LiveChatPlugin** - Handle support requests
3. **BroadcastPlugin** - No message handling, just background features

---

## Disabling Plugins at Runtime

Plugins respect feature toggles controlled via the Service API:

```bash
# Disable AI responses
curl -X POST https://your-bot.com/api/service/features/ai_responses/toggle \
  -H "X-Service-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

When disabled, each plugin returns its configured fallback message.
