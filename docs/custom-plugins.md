# Custom Plugins

Extend the SDK with your own plugins.

## Plugin Interface

All plugins must implement the `Plugin` interface:

```typescript
interface Plugin {
  // Required
  name: string;
  version: string;
  
  // Lifecycle hooks
  onInit(bot: Chatbot): Promise<void>;
  onStart(bot: Chatbot): Promise<void>;
  onStop(bot: Chatbot): Promise<void>;
  
  // Optional: Message handling
  onMessage?(ctx: Context, next: NextFunction): Promise<void>;
  
  // Optional: Admin routes
  getAdminRoutes?(): Router;
  
  // Optional: Service API routes
  getServiceRoutes?(): Router;
  
  // Optional: Database migrations
  getMigrations?(): string[];
}
```

## Basic Example

```javascript
const { Plugin } = require('@code-alchemist/omnichannel-chatbot-sdk');

class GreetingPlugin extends Plugin {
  name = 'greeting';
  version = '1.0.0';
  
  constructor(config = {}) {
    super();
    this.greetings = config.greetings || ['hello', 'hi', 'hey'];
    this.response = config.response || 'Hello! How can I help you today?';
  }
  
  async onInit(bot) {
    console.log('GreetingPlugin initialized');
  }
  
  async onStart(bot) {
    console.log('GreetingPlugin started');
  }
  
  async onStop(bot) {
    console.log('GreetingPlugin stopped');
  }
  
  async onMessage(ctx, next) {
    const text = ctx.body.toLowerCase().trim();
    
    if (this.greetings.includes(text)) {
      await ctx.reply(this.response);
      return; // Don't call next() - we handled the message
    }
    
    // Pass to next plugin/handler
    await next();
  }
}

// Usage
bot.use(new GreetingPlugin({
  greetings: ['hello', 'hi', 'good morning'],
  response: 'Welcome to Acme Corp! How can I assist you?'
}));
```

## Plugin with Database

```javascript
const { Plugin } = require('@code-alchemist/omnichannel-chatbot-sdk');

class AnalyticsPlugin extends Plugin {
  name = 'analytics';
  version = '1.0.0';
  
  constructor(config) {
    super();
    this.retentionDays = config.retentionDays || 30;
  }
  
  // Database migrations
  getMigrations() {
    return [
      `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        user_identifier VARCHAR(255),
        platform VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
      `
    ];
  }
  
  async onInit(bot) {
    this.db = bot.database;
  }
  
  async onMessage(ctx, next) {
    const startTime = Date.now();
    
    // Track message received
    await this.trackEvent('message_received', ctx);
    
    // Continue to next handler
    await next();
    
    // Track message processed
    await this.trackEvent('message_processed', ctx, {
      duration: Date.now() - startTime
    });
  }
  
  async trackEvent(eventType, ctx, metadata = {}) {
    await this.db.insert('analytics_events', {
      event_type: eventType,
      user_identifier: ctx.from,
      platform: ctx.platform,
      metadata: {
        ...metadata,
        messageLength: ctx.body.length
      }
    });
  }
  
  // Admin routes
  getAdminRoutes() {
    const router = require('express').Router();
    
    router.get('/analytics/events', async (req, res) => {
      const events = await this.db.query('analytics_events', {
        limit: 100,
        orderBy: { created_at: 'desc' }
      });
      res.json({ events });
    });
    
    router.get('/analytics/summary', async (req, res) => {
      const summary = await this.db.raw(`
        SELECT 
          event_type,
          COUNT(*) as count,
          DATE_TRUNC('day', created_at) as date
        FROM analytics_events
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY event_type, DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `);
      res.json({ summary });
    });
    
    return router;
  }
}

// Usage
bot.use(new AnalyticsPlugin({
  retentionDays: 90
}));
```

## Plugin with Feature Toggle

```javascript
const { Plugin } = require('@code-alchemist/omnichannel-chatbot-sdk');

class PremiumFeaturesPlugin extends Plugin {
  name = 'premium-features';
  version = '1.0.0';
  featureKey = 'premium_features';
  
  async onMessage(ctx, next) {
    // Check if feature is enabled
    const isEnabled = await ctx.isFeatureEnabled(this.featureKey);
    
    if (!isEnabled) {
      // Feature disabled - check if user is requesting premium feature
      if (this.isPremiumRequest(ctx.body)) {
        await ctx.reply('This is a premium feature. Please upgrade your subscription.');
        return;
      }
    }
    
    // Handle premium features
    if (isEnabled && this.isPremiumRequest(ctx.body)) {
      await this.handlePremiumRequest(ctx);
      return;
    }
    
    await next();
  }
  
  isPremiumRequest(text) {
    const premiumKeywords = ['export', 'analytics', 'report', 'bulk'];
    return premiumKeywords.some(kw => text.toLowerCase().includes(kw));
  }
  
  async handlePremiumRequest(ctx) {
    // Handle premium feature
    await ctx.reply('Processing your premium request...');
  }
  
  // Service API routes for managing this feature
  getServiceRoutes() {
    const router = require('express').Router();
    
    router.get('/premium/status', async (req, res) => {
      const isEnabled = await this.bot.features.isEnabled(this.featureKey);
      res.json({ enabled: isEnabled });
    });
    
    return router;
  }
}
```

## Plugin with External Service

```javascript
const { Plugin } = require('@code-alchemist/omnichannel-chatbot-sdk');
const Slack = require('@slack/web-api');

class SlackNotificationPlugin extends Plugin {
  name = 'slack-notifications';
  version = '1.0.0';
  
  constructor(config) {
    super();
    this.slack = new Slack.WebClient(config.token);
    this.channel = config.channel;
    this.events = config.events || ['support_session_created'];
  }
  
  async onInit(bot) {
    // Subscribe to bot events
    bot.on('support:session:created', (session) => {
      this.notifySlack('New Support Request', {
        user: session.userIdentifier,
        platform: session.platform,
        reason: session.handoffReason
      });
    });
    
    bot.on('support:session:resolved', (session) => {
      this.notifySlack('Support Session Resolved', {
        user: session.userIdentifier,
        duration: session.duration
      });
    });
  }
  
  async notifySlack(title, data) {
    try {
      await this.slack.chat.postMessage({
        channel: this.channel,
        text: title,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${title}*\n${JSON.stringify(data, null, 2)}`
            }
          }
        ]
      });
    } catch (err) {
      console.error('Slack notification failed:', err);
    }
  }
}

// Usage
bot.use(new SlackNotificationPlugin({
  token: process.env.SLACK_TOKEN,
  channel: '#support-alerts'
}));
```

## Best Practices

### 1. Always Call `next()`
Unless you fully handle the message, always call `next()` to pass control:

```javascript
async onMessage(ctx, next) {
  // Do something
  await next(); // Don't forget this!
}
```

### 2. Use Feature Toggles
Make your plugin respect feature toggles:

```javascript
async onMessage(ctx, next) {
  if (!await ctx.isFeatureEnabled('my_feature')) {
    await next();
    return;
  }
  // Feature-specific logic
}
```

### 3. Handle Errors Gracefully

```javascript
async onMessage(ctx, next) {
  try {
    await this.doSomething(ctx);
  } catch (err) {
    console.error('Plugin error:', err);
    // Don't crash - let other plugins handle
  }
  await next();
}
```

### 4. Clean Up Resources

```javascript
async onStop(bot) {
  await this.connection.close();
  clearInterval(this.timer);
}
```

### 5. Document Your Plugin

```javascript
/**
 * MyPlugin - Does amazing things
 * 
 * @param {Object} config
 * @param {string} config.apiKey - API key for external service
 * @param {number} config.timeout - Timeout in milliseconds (default: 5000)
 * 
 * @example
 * bot.use(new MyPlugin({ apiKey: 'xxx' }));
 */
class MyPlugin extends Plugin {
  // ...
}
```
