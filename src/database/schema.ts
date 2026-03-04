import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Enum for conversation status
 */
export const conversationStatusEnum = pgEnum('conversation_status', [
  'active',
  'waiting',
  'assigned',
  'resolved',
  'closed',
]);

/**
 * Enum for message direction
 */
export const messageDirectionEnum = pgEnum('message_direction', ['incoming', 'outgoing']);

/**
 * Enum for message type
 */
export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'location',
  'contact',
  'sticker',
  'button_click',
]);

/**
 * Users table - stores user information across all platforms
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformId: varchar('platform_id', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  username: varchar('username', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 50 }),
  email: varchar('email', { length: 255 }),
  language: varchar('language', { length: 10 }),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Conversations table - stores conversation sessions
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: varchar('platform', { length: 50 }).notNull(),
  chatId: varchar('chat_id', { length: 255 }).notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: conversationStatusEnum('status').notNull().default('active'),
  assignedAgentId: varchar('assigned_agent_id', { length: 255 }),
  metadata: jsonb('metadata').notNull().default('{}'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Messages table - stores all messages in conversations
 */
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  direction: messageDirectionEnum('direction').notNull(),
  type: messageTypeEnum('type').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Broadcasts table - stores broadcast campaigns
 */
export const broadcasts = pgTable('broadcasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  message: jsonb('message').notNull(),
  filter: jsonb('filter').notNull().default('{}'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  totalRecipients: varchar('total_recipients', { length: 50 }).default('0'),
  successCount: varchar('success_count', { length: 50 }).default('0'),
  failureCount: varchar('failure_count', { length: 50 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Export types inferred from schema
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = typeof broadcasts.$inferInsert;
