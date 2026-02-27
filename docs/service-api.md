# Service API

The Service API allows external systems (like billing/subscription services) to control feature toggles programmatically.

## Overview

When building a SaaS product, you need to enable/disable features based on subscription status. The Service API provides a secure way for your billing system to toggle features without admin user intervention.

## Authentication

All Service API requests require the `X-Service-Key` header:

```
X-Service-Key: your-secret-service-key
```

The key is configured via the `SERVICE_API_KEY` environment variable.

## Endpoints

### List All Features

Get the current status of all features.

```http
GET /api/service/features
X-Service-Key: your-secret-key
```

**Response:**
```json
{
  "success": true,
  "features": [
    {
      "key": "ai_responses",
      "name": "AI-Powered Responses",
      "enabled": true,
      "description": "Enable Gemini AI for intent detection and response formatting."
    },
    {
      "key": "live_chat",
      "name": "Live Chat / Human Support",
      "enabled": true,
      "description": "Enable live chat handoff to human advisors."
    },
    {
      "key": "broadcast",
      "name": "Broadcast Messaging",
      "enabled": false,
      "description": "Enable broadcast messaging to send messages to multiple contacts."
    }
  ]
}
```

### Toggle Single Feature

Enable or disable a specific feature.

```http
POST /api/service/features/:key/toggle
X-Service-Key: your-secret-key
Content-Type: application/json

{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "feature": {
    "key": "ai_responses",
    "name": "AI-Powered Responses",
    "enabled": true
  }
}
```

### Bulk Toggle Features

Enable or disable multiple features at once.

```http
POST /api/service/features/bulk
X-Service-Key: your-secret-key
Content-Type: application/json

{
  "features": {
    "ai_responses": true,
    "live_chat": true,
    "broadcast": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "key": "ai_responses", "success": true, "enabled": true },
    { "key": "live_chat", "success": true, "enabled": true },
    { "key": "broadcast", "success": true, "enabled": false }
  ]
}
```

## Integration Examples

### Stripe Webhook Handler

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

const app = express();

const CHATBOT_SERVICE_API = 'https://chatbot.example.com/api/service';
const SERVICE_KEY = process.env.CHATBOT_SERVICE_KEY;

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      
      // Enable features based on subscription plan
      const features = getFeaturesByPlan(subscription.items.data[0].price.id);
      
      await axios.post(`${CHATBOT_SERVICE_API}/features/bulk`, {
        features
      }, {
        headers: { 'X-Service-Key': SERVICE_KEY }
      });
      break;

    case 'customer.subscription.deleted':
      // Disable all paid features
      await axios.post(`${CHATBOT_SERVICE_API}/features/bulk`, {
        features: {
          ai_responses: false,
          live_chat: false,
          broadcast: false
        }
      }, {
        headers: { 'X-Service-Key': SERVICE_KEY }
      });
      break;
  }

  res.json({ received: true });
});

function getFeaturesByPlan(priceId) {
  const plans = {
    'price_basic': { ai_responses: true, live_chat: false, broadcast: false },
    'price_pro': { ai_responses: true, live_chat: true, broadcast: false },
    'price_enterprise': { ai_responses: true, live_chat: true, broadcast: true }
  };
  return plans[priceId] || { ai_responses: false, live_chat: false, broadcast: false };
}
```

### Simple Billing Check (Cron Job)

```javascript
const axios = require('axios');
const db = require('./database');

const CHATBOT_SERVICE_API = 'https://chatbot.example.com/api/service';
const SERVICE_KEY = process.env.CHATBOT_SERVICE_KEY;

async function checkSubscriptions() {
  const customers = await db.query('SELECT * FROM customers WHERE chatbot_enabled = true');
  
  for (const customer of customers) {
    const isActive = customer.subscription_end > new Date();
    
    await axios.post(`${CHATBOT_SERVICE_API}/features/bulk`, {
      features: {
        ai_responses: isActive,
        live_chat: isActive && customer.plan !== 'basic',
        broadcast: isActive && customer.plan === 'enterprise'
      }
    }, {
      headers: { 'X-Service-Key': SERVICE_KEY }
    });
  }
}

// Run every hour
setInterval(checkSubscriptions, 60 * 60 * 1000);
```

## Error Responses

### Missing API Key

```json
{
  "error": "Missing X-Service-Key header"
}
```
Status: 401

### Invalid API Key

```json
{
  "error": "Invalid service key"
}
```
Status: 403

### Feature Not Found

```json
{
  "error": "Feature not found"
}
```
Status: 400

### Invalid Request Body

```json
{
  "error": "enabled must be a boolean"
}
```
Status: 400

## Security Best Practices

1. **Keep the SERVICE_API_KEY secret** - Never expose it in client-side code
2. **Use HTTPS** - Always use HTTPS in production
3. **Rotate keys periodically** - Change the key every few months
4. **Restrict IP access** - If possible, whitelist your billing server's IP
5. **Log all changes** - The SDK logs all feature toggles for audit purposes

## Feature Behavior When Disabled

| Feature | User Experience When Disabled |
|---------|------------------------------|
| `ai_responses` | Users see fallback message, no AI processing |
| `live_chat` | Handoff requests return fallback message |
| `broadcast` | Admin API returns 503, cannot send broadcasts |
