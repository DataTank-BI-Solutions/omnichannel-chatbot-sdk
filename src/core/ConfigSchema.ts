import { z } from 'zod';

/**
 * Zod schemas for runtime configuration validation
 */

// ============================================================================
// Logging Configuration Schema
// ============================================================================

export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  format: z.enum(['json', 'pretty']).optional(),
});

// ============================================================================
// Platform Configuration Schemas
// ============================================================================

export const TelegramConfigSchema = z.object({
  enabled: z.boolean(),
  token: z.string().min(1, 'Telegram token is required'),
  webhookUrl: z.string().url().optional(),
  webhookPath: z.string().optional(),
});

export const WhatsAppBaileysConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.literal('baileys'),
  sessionPath: z.string().optional(),
});

export const WhatsAppTwilioConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.literal('twilio'),
  accountSid: z.string().min(1, 'Twilio Account SID is required'),
  authToken: z.string().min(1, 'Twilio Auth Token is required'),
  phoneNumber: z.string().min(1, 'Twilio phone number is required'),
});

export const WhatsAppConfigSchema = z.discriminatedUnion('provider', [
  WhatsAppBaileysConfigSchema,
  WhatsAppTwilioConfigSchema,
]);

export const PlatformsConfigSchema = z.object({
  telegram: TelegramConfigSchema.optional(),
  whatsapp: WhatsAppConfigSchema.optional(),
});

// ============================================================================
// Database Configuration Schema
// ============================================================================

export const DatabaseConfigSchema = z.object({
  provider: z.enum(['supabase', 'postgres', 'memory']),
  url: z.string().url().optional(),
  apiKey: z.string().optional(),
});

// ============================================================================
// AI Configuration Schema
// ============================================================================

export const AIConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'anthropic']),
  apiKey: z.string().min(1, 'AI provider API key is required'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

// ============================================================================
// Main Chatbot Configuration Schema
// ============================================================================

export const ChatbotConfigSchema = z.object({
  platforms: PlatformsConfigSchema,
  database: DatabaseConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
  ai: AIConfigSchema.optional(),
});

// ============================================================================
// Type inference helpers
// ============================================================================

export type ValidatedChatbotConfig = z.infer<typeof ChatbotConfigSchema>;
export type ValidatedLoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type ValidatedTelegramConfig = z.infer<typeof TelegramConfigSchema>;
export type ValidatedWhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;
export type ValidatedDatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type ValidatedAIConfig = z.infer<typeof AIConfigSchema>;

/**
 * Validate chatbot configuration
 * @param config - Configuration object to validate
 * @returns Validated configuration
 * @throws {z.ZodError} If validation fails
 */
export function validateConfig(config: unknown): ValidatedChatbotConfig {
  return ChatbotConfigSchema.parse(config);
}

/**
 * Safely validate chatbot configuration
 * @param config - Configuration object to validate
 * @returns Validation result with success status and data/error
 */
export function safeValidateConfig(
  config: unknown
): z.SafeParseReturnType<unknown, ValidatedChatbotConfig> {
  return ChatbotConfigSchema.safeParse(config);
}
