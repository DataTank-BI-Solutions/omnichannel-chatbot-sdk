# Configuration

Complete reference for all configuration options.

## Chatbot Configuration

```typescript
interface ChatbotConfig {
  // Database configuration (required)
  database: DatabaseConfig;
  
  // Platform configurations (at least one required)
  platforms: PlatformConfigs;
  
  // Service API for billing integration (optional)
  serviceApi?: ServiceApiConfig;
  
  // Logging configuration (optional)
  logger?: LoggerConfig;
}
```

## Database Configuration

### Supabase (Recommended)

```javascript
const bot = new Chatbot({
  database: {
    provider: 'supabase',
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // Optional: Auto-run migrations on start
    autoMigrate: false
  }
});
```

### Custom Database Adapter

```javascript
const { DatabaseAdapter } = require('@code-alchemist/omnichannel-chatbot-sdk');

class MyCustomAdapter extends DatabaseAdapter {
  // Implement required methods
}

const bot = new Chatbot({
  database: {
    provider: 'custom',
    adapter: new MyCustomAdapter()
  }
});
```

## Platform Configurations

### Telegram

```javascript
{
  platforms: {
    telegram: {
      // Required
      token: process.env.TELEGRAM_BOT_TOKEN,
      
      // Optional: Use polling (default) or webhook
      polling: true,
      
      // Optional: Webhook configuration
      webhook: {
        url: 'https://your-domain.com/webhook/telegram',
        secretToken: 'your-secret'
      }
    }
  }
}
```

### WhatsApp (Twilio)

```javascript
{
  platforms: {
    whatsapp: {
      provider: 'twilio',
      
      // Required
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      number: process.env.TWILIO_WHATSAPP_NUMBER, // e.g., 'whatsapp:+14155238886'
      
      // Optional: Webhook path
      webhookPath: '/webhook/whatsapp'
    }
  }
}
```

### WhatsApp (whatsapp-web.js)

```javascript
{
  platforms: {
    whatsapp: {
      provider: 'whatsapp-web',
      
      // Optional: Session storage path
      sessionPath: './whatsapp-session',
      
      // Optional: Headless browser
      headless: true
    }
  }
}
```

## Service API Configuration

The Service API allows external systems (like billing) to control feature toggles.

```javascript
{
  serviceApi: {
    // Enable the service API
    enabled: true,
    
    // Secret key for authentication
    key: process.env.SERVICE_API_KEY,
    
    // Optional: Custom endpoint prefix
    prefix: '/api/service'
  }
}
```

## Logger Configuration

```javascript
{
  logger: {
    // Log level: 'debug' | 'info' | 'warn' | 'error'
    level: 'info',
    
    // Pretty print in development
    pretty: process.env.NODE_ENV !== 'production',
    
    // Optional: Custom logger instance
    instance: myCustomLogger
  }
}
```

## Admin Panel Configuration

```javascript
bot.serveAdmin({
  // Server port
  port: 3000,
  
  // URL path for admin panel
  path: '/admin',
  
  // Authentication
  auth: {
    provider: 'supabase',
    table: 'admin_users',      // Table with admin users
    roles: ['admin', 'support'] // Allowed roles
  },
  
  // Optional: Customize available sections
  sections: {
    dashboard: true,
    knowledgeBase: true,
    liveChat: true,
    broadcast: true,
    settings: false
  }
});
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `TELEGRAM_BOT_TOKEN` | If using Telegram | Bot token from @BotFather |
| `TWILIO_ACCOUNT_SID` | If using Twilio | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | If using Twilio | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | If using Twilio | WhatsApp number with prefix |
| `GEMINI_API_KEY` | If using AI | Google Gemini API key |
| `SERVICE_API_KEY` | If using Service API | Secret key for billing integration |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
