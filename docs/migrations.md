# Database Migrations

The SDK requires certain database tables to function. This guide covers how to set up and manage the database schema.

## Automatic Migrations

Run migrations automatically on startup:

```javascript
const bot = new Chatbot({
  database: {
    provider: 'supabase',
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // Auto-run migrations
    autoMigrate: true
  }
});
```

## Manual Migrations

### Using CLI

```bash
# Run all pending migrations
npx omnichannel-chatbot migrate

# Check migration status
npx omnichannel-chatbot migrate:status

# Rollback last migration
npx omnichannel-chatbot migrate:rollback

# Generate SQL without executing
npx omnichannel-chatbot migrate:sql > schema.sql
```

### Programmatically

```javascript
const bot = new Chatbot({ /* config */ });

// Run migrations
await bot.runMigrations();

// Check status
const status = await bot.getMigrationStatus();
console.log(status);

// Get SQL for manual execution
const sql = bot.getMigrationSQL();
console.log(sql);
```

## Core Tables

### feature_settings

Stores feature toggle states.

```sql
CREATE TABLE feature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default features
INSERT INTO feature_settings (feature_key, feature_name, is_enabled, config) VALUES
  ('ai_responses', 'AI-Powered Responses', true, '{"model": "gemini-2.5-flash"}'),
  ('live_chat', 'Live Chat / Human Support', true, '{}'),
  ('broadcast', 'Broadcast Messaging', true, '{}');
```

### admin_users

Admin panel users.

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'support',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Live Chat Tables

### support_sessions

Tracks support conversations.

```sql
CREATE TABLE support_sessions (
  id SERIAL PRIMARY KEY,
  user_identifier VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_admin UUID REFERENCES admin_users(id),
  trigger_message TEXT,
  handoff_reason VARCHAR(100),
  topic_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'resolved', 'abandoned'))
);

CREATE INDEX idx_support_sessions_user ON support_sessions(user_identifier);
CREATE INDEX idx_support_sessions_status ON support_sessions(status);
CREATE INDEX idx_support_sessions_admin ON support_sessions(assigned_admin);
```

### support_messages

Messages within support sessions.

```sql
CREATE TABLE support_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES support_sessions(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_sender_type CHECK (sender_type IN ('user', 'admin', 'bot'))
);

CREATE INDEX idx_support_messages_session ON support_messages(session_id);
```

## Broadcast Tables

### broadcast_contacts

Contact registry for broadcasts.

```sql
CREATE TABLE broadcast_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  display_name VARCHAR(255),
  opted_in BOOLEAN DEFAULT true,
  source VARCHAR(100) DEFAULT 'manual',
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_identifier, platform)
);

CREATE INDEX idx_broadcast_contacts_platform ON broadcast_contacts(platform);
CREATE INDEX idx_broadcast_contacts_opted_in ON broadcast_contacts(opted_in);
```

### broadcasts

Broadcast campaign definitions.

```sql
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  message_content TEXT NOT NULL,
  target_platforms JSONB DEFAULT '["telegram", "whatsapp"]',
  target_filters JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES admin_users(id),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'queued', 'sending', 'completed', 'cancelled'))
);
```

### broadcast_recipients

Per-recipient delivery tracking.

```sql
CREATE TABLE broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES broadcast_contacts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  platform VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed'))
);

CREATE INDEX idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_status ON broadcast_recipients(status);
```

## AI/FAQ Tables

### faqs

Knowledge base content.

```sql
CREATE TABLE faqs (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  keywords TEXT[],
  intent VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('active', 'draft', 'archived'))
);

CREATE INDEX idx_faqs_category ON faqs(category);
CREATE INDEX idx_faqs_intent ON faqs(intent);
CREATE INDEX idx_faqs_status ON faqs(status);
```

### conversation_logs

Message history for analytics.

```sql
CREATE TABLE conversation_logs (
  id SERIAL PRIMARY KEY,
  user_identifier VARCHAR(255) NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT,
  detected_intent VARCHAR(100),
  matched_faq_id INTEGER REFERENCES faqs(id),
  confidence DECIMAL(3,2),
  response_time_ms INTEGER,
  platform VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_logs_user ON conversation_logs(user_identifier);
CREATE INDEX idx_conversation_logs_intent ON conversation_logs(detected_intent);
CREATE INDEX idx_conversation_logs_created ON conversation_logs(created_at);
```

## Plugin Migrations

Plugins can define their own migrations:

```javascript
class MyPlugin extends Plugin {
  getMigrations() {
    return [
      `
      CREATE TABLE my_plugin_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) NOT NULL,
        value JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      `
    ];
  }
}
```

Plugin migrations run after core migrations.

## Row Level Security (RLS)

For Supabase, enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE feature_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS
CREATE POLICY "service_role_all" ON feature_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Admin users can manage their own data
CREATE POLICY "admins_manage_sessions" ON support_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );
```

## Backup and Restore

```bash
# Backup (using Supabase CLI)
supabase db dump -f backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Migration Best Practices

1. **Always backup before migrating** in production
2. **Test migrations** on a staging database first
3. **Use transactions** for multi-statement migrations
4. **Make migrations idempotent** (safe to run multiple times)
5. **Never delete columns** without a deprecation period
