# Admin Panel Setup Guide

This guide will help you set up the Admin Panel API for managing your chatbot system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Supabase Setup](#supabase-setup)
- [Database Configuration](#database-configuration)
- [Admin API Configuration](#admin-api-configuration)
- [Creating Admin Users](#creating-admin-users)
- [Usage Example](#usage-example)
- [API Reference](#api-reference)

## Prerequisites

- A Supabase project ([Create one here](https://supabase.com))
- Node.js 20 or higher
- PostgreSQL database (provided by Supabase)

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details
4. Wait for the project to be created (this may take a few minutes)

### 2. Get Your Credentials

Once your project is ready:

1. Go to **Project Settings** > **API**
2. Copy the following values:
   - **Project URL** (`SUPABASE_URL`)
   - **Service Role Key** (`SUPABASE_SERVICE_KEY`) - Keep this secret!

### 3. Set Up Environment Variables

Create a `.env` file in your project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT Secret for Admin API
ADMIN_JWT_SECRET=your-secret-key-here

# Database Configuration (for chatbot database)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

## Database Configuration

### Create Admin Users Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_role CHECK (role IN ('admin', 'agent', 'viewer'))
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_admin_users_timestamp
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();
```

## Admin API Configuration

### 1. Install the SDK

```bash
npm install @code-alchemist/omnichannel-chatbot-sdk
```

### 2. Set Up the Admin API

```typescript
import express from "express";
import { Chatbot, AdminAPI } from "@code-alchemist/omnichannel-chatbot-sdk";

// Initialize your chatbot
const bot = new Chatbot({
  platforms: {
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN!,
    },
  },
  database: {
    provider: "supabase",
    url: process.env.DATABASE_URL!,
  },
});

// Initialize Admin API
const adminAPI = new AdminAPI(bot, {
  jwtSecret: process.env.ADMIN_JWT_SECRET!,
  cors: {
    origin: process.env.ADMIN_UI_URL || "http://localhost:3000",
    credentials: true,
  },
  features: {
    analytics: true,
    broadcasts: true,
    liveChat: true,
    userManagement: true,
  },
});

// Create Express app
const app = express();

// Mount admin API
app.use("/api/admin", adminAPI.router);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Admin API running on http://localhost:${PORT}`);
});

// Start chatbot
await bot.start();
```

## Creating Admin Users

### Using the SupabaseAuthProvider

```typescript
import { SupabaseAuthProvider } from "@code-alchemist/omnichannel-chatbot-sdk";

const authProvider = new SupabaseAuthProvider({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
});

// Create an admin user
const adminUser = await authProvider.createAdminUser(
  "admin@example.com",
  "secure-password",
  "admin" // role: 'admin' | 'agent' | 'viewer'
);

console.log("Admin user created:", adminUser);
```

### Using the Supabase Dashboard

1. Go to **Authentication** > **Users** in your Supabase dashboard
2. Click **Add User**
3. Fill in the email and password
4. Click **Create User**
5. Run this SQL to assign a role:

```sql
INSERT INTO admin_users (user_id, email, name, role)
VALUES (
  'user-id-from-auth-users',
  'admin@example.com',
  'Admin User',
  'admin'
);
```

## Usage Example

### Login

```typescript
// Client-side login request
const response = await fetch("http://localhost:3001/api/admin/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@example.com",
    password: "your-password",
  }),
});

const { success, token, refreshToken, user } = await response.json();

if (success) {
  // Store tokens securely
  localStorage.setItem("accessToken", token);
  localStorage.setItem("refreshToken", refreshToken);
  console.log("Logged in as:", user);
}
```

### Making Authenticated Requests

```typescript
// List conversations
const response = await fetch("http://localhost:3001/api/admin/conversations", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const { success, data, pagination } = await response.json();
console.log("Conversations:", data);
```

## API Reference

### Authentication Endpoints

| Method | Endpoint        | Description               | Auth Required |
| ------ | --------------- | ------------------------- | ------------- |
| POST   | `/auth/login`   | Login with email/password | No            |
| POST   | `/auth/refresh` | Refresh access token      | No            |
| POST   | `/auth/logout`  | Logout (invalidate token) | No            |
| GET    | `/auth/me`      | Get current user info     | Yes           |

### Conversation Endpoints

| Method | Endpoint                    | Description              | Permission Required    |
| ------ | --------------------------- | ------------------------ | ---------------------- |
| GET    | `/conversations`            | List conversations       | `conversations.view`   |
| GET    | `/conversations/:id`        | Get conversation details | `conversations.view`   |
| POST   | `/conversations/:id/assign` | Assign to agent          | `conversations.assign` |
| POST   | `/conversations/:id/close`  | Close conversation       | `conversations.close`  |

### User Endpoints

| Method | Endpoint     | Description        | Permission Required |
| ------ | ------------ | ------------------ | ------------------- |
| GET    | `/users`     | List chatbot users | `users.view`        |
| GET    | `/users/:id` | Get user details   | `users.view`        |

### Broadcast Endpoints

| Method | Endpoint               | Description      | Permission Required |
| ------ | ---------------------- | ---------------- | ------------------- |
| GET    | `/broadcasts`          | List broadcasts  | `broadcasts.view`   |
| POST   | `/broadcasts`          | Create broadcast | `broadcasts.create` |
| POST   | `/broadcasts/:id/send` | Send broadcast   | `broadcasts.send`   |

### Agent Endpoints

| Method | Endpoint  | Description   | Permission Required |
| ------ | --------- | ------------- | ------------------- |
| GET    | `/agents` | List agents   | `agents.view`       |
| POST   | `/agents` | Add new agent | `agents.manage`     |

### Analytics Endpoints

| Method | Endpoint     | Description           | Permission Required |
| ------ | ------------ | --------------------- | ------------------- |
| GET    | `/analytics` | Get dashboard metrics | `analytics.view`    |

### Settings Endpoints

| Method | Endpoint    | Description         | Permission Required |
| ------ | ----------- | ------------------- | ------------------- |
| GET    | `/settings` | Get system settings | `settings.view`     |

## Roles and Permissions

### Admin Role

Full access to all features:

- All conversation permissions
- All user permissions
- All broadcast permissions
- All agent permissions
- All analytics permissions
- All settings permissions

### Agent Role

Limited access for support agents:

- `conversations.view`
- `conversations.assign`
- `conversations.close`
- `users.view`
- `broadcasts.view`
- `agents.view`
- `analytics.view`

### Viewer Role

Read-only access:

- `conversations.view`
- `users.view`
- `broadcasts.view`
- `analytics.view`

## Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Use HTTPS in production** - Encrypt all API traffic
3. **Rotate JWT secrets** - Change secrets periodically
4. **Implement rate limiting** - Protect against brute force attacks
5. **Enable CORS properly** - Only allow trusted origins
6. **Use strong passwords** - Enforce password complexity
7. **Monitor login attempts** - Track failed login attempts
8. **Keep Supabase updated** - Stay on latest stable version

## Troubleshooting

### Common Issues

**Issue: "Invalid or expired token"**

- Solution: Refresh your access token using the refresh endpoint

**Issue: "403 Forbidden"**

- Solution: Check that your user has the required permissions for the endpoint

**Issue: "Database adapter not configured"**

- Solution: Ensure the chatbot is initialized with a database configuration

**Issue: "LiveChat plugin not installed"**

- Solution: Install the LiveChatPlugin before using agent endpoints

**Issue: "Broadcast plugin not installed"**

- Solution: Install the BroadcastPlugin before using broadcast endpoints

## Next Steps

- Build a custom admin UI using React, Vue, or your preferred framework
- Implement WebSocket support for real-time updates
- Add custom analytics and reporting
- Integrate with your existing authentication system

## Support

For issues or questions:

- GitHub Issues: [https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk/issues](https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk/issues)
- Documentation: [https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk/tree/main/docs](https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk/tree/main/docs)
