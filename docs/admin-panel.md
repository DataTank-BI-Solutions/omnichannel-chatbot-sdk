# Admin Panel

The SDK includes a built-in admin panel for managing your chatbot.

## Enabling the Admin Panel

```javascript
const bot = new Chatbot({ /* config */ });

bot.serveAdmin({
  port: 3000,
  path: '/admin'
});
```

The admin panel will be available at `http://localhost:3000/admin`

## Configuration

```javascript
bot.serveAdmin({
  // Port to serve on
  port: 3000,
  
  // URL path prefix
  path: '/admin',
  
  // Authentication configuration
  auth: {
    // Auth provider ('supabase' or 'custom')
    provider: 'supabase',
    
    // Table containing admin users
    table: 'admin_users',
    
    // Required fields in admin_users table
    // id, email, role, is_active
    
    // Allowed roles (users with these roles can access)
    roles: ['admin', 'support']
  },
  
  // Customize visible sections
  sections: {
    dashboard: true,      // Overview stats
    knowledgeBase: true,  // FAQ management
    liveChat: true,       // Support sessions
    broadcast: true,      // Broadcast messaging
    settings: false       // Feature settings (hide from admins)
  },
  
  // Custom branding
  branding: {
    title: 'My Chatbot Admin',
    logo: '/images/logo.png',
    primaryColor: '#3B82F6'
  }
});
```

## Authentication

### Supabase Auth (Default)

The admin panel uses Supabase Auth by default. Admin users are stored in the `admin_users` table:

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'support',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Users log in with their Supabase credentials (email/password or OAuth).

### Custom Authentication

```javascript
const { AdminAuth } = require('@code-alchemist/omnichannel-chatbot-sdk');

class MyCustomAuth extends AdminAuth {
  async verify(token) {
    // Verify token and return user info
    const user = await myAuthService.verifyToken(token);
    
    if (!user) {
      throw new Error('Invalid token');
    }
    
    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }
  
  async login(email, password) {
    // Return token on successful login
    return myAuthService.login(email, password);
  }
}

bot.serveAdmin({
  auth: {
    provider: 'custom',
    handler: new MyCustomAuth()
  }
});
```

## Admin Panel Sections

### Dashboard

Overview of chatbot activity:
- Total conversations today/week/month
- Active support sessions
- Broadcast statistics
- Platform breakdown (Telegram vs WhatsApp)

### Knowledge Base

Manage FAQ content:
- Create, edit, delete FAQs
- Organize by category
- Set status (active/draft)
- Preview responses

### Live Chat

Manage support sessions:
- View pending sessions
- Claim and respond to users
- View conversation history
- Resolve or transfer sessions

### Broadcast

Send announcements:
- View contacts by platform
- Compose and send broadcasts
- Track delivery status
- View broadcast history

## Role-Based Access

Control what each role can do:

```javascript
bot.serveAdmin({
  auth: {
    roles: ['admin', 'support'],
    
    permissions: {
      admin: {
        knowledgeBase: ['read', 'write', 'delete'],
        liveChat: ['read', 'write'],
        broadcast: ['read', 'write'],
        settings: ['read', 'write']
      },
      support: {
        knowledgeBase: ['read'],
        liveChat: ['read', 'write'],
        broadcast: ['read'],
        settings: []
      }
    }
  }
});
```

## Embedding in Existing Express App

```javascript
const express = require('express');
const { Chatbot } = require('@code-alchemist/omnichannel-chatbot-sdk');

const app = express();
const bot = new Chatbot({ /* config */ });

// Get admin router
const adminRouter = bot.getAdminRouter({
  auth: { provider: 'supabase' }
});

// Mount at custom path
app.use('/my-admin', adminRouter);

// Your other routes
app.get('/', (req, res) => {
  res.send('Welcome to my app');
});

app.listen(3000);
bot.start();
```

## Customizing the Admin Panel

### Custom CSS

```javascript
bot.serveAdmin({
  customCss: `
    .header { background: #1a1a2e; }
    .btn-primary { background: #e94560; }
  `
});
```

### Custom JavaScript

```javascript
bot.serveAdmin({
  customJs: `
    console.log('Admin panel loaded');
    
    // Add custom functionality
    window.myCustomFunction = () => {
      alert('Hello!');
    };
  `
});
```

### Adding Custom Pages

```javascript
bot.serveAdmin({
  customPages: [
    {
      path: '/reports',
      title: 'Reports',
      icon: 'chart',
      component: '/custom/reports.html'
    }
  ]
});
```

## API Endpoints

The admin panel exposes these API endpoints:

### Authentication
- `POST /api/admin/login` - Login
- `POST /api/admin/verify` - Verify token
- `POST /api/admin/logout` - Logout

### Dashboard
- `GET /api/admin/stats` - Get statistics

### Knowledge Base
- `GET /api/admin/faqs` - List FAQs
- `POST /api/admin/faqs` - Create FAQ
- `PUT /api/admin/faqs/:id` - Update FAQ
- `DELETE /api/admin/faqs/:id` - Delete FAQ

### Live Chat
- `GET /api/admin/support/sessions` - List sessions
- `GET /api/admin/support/sessions/:id` - Get session
- `POST /api/admin/support/sessions/:id/reply` - Send reply
- `POST /api/admin/support/sessions/:id/claim` - Claim session
- `POST /api/admin/support/sessions/:id/resolve` - Resolve session

### Broadcast
- `GET /api/admin/broadcast/contacts` - List contacts
- `POST /api/admin/broadcast` - Create broadcast
- `POST /api/admin/broadcast/:id/send` - Send broadcast

### Features (if enabled)
- `GET /api/admin/features` - List features
- `POST /api/admin/features/:key/toggle` - Toggle feature
