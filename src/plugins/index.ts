/**
 * Plugins module - built-in plugins for the chatbot SDK
 */

// Export plugin interfaces and base class
export { BasePlugin } from './BasePlugin.js';

// Export built-in plugins
export {
  LiveChatPlugin,
  type Agent,
  type AgentStatus,
  type LiveChatConfig,
} from './LiveChatPlugin.js';
export {
  BroadcastPlugin,
  type Broadcast,
  type BroadcastContact,
  type BroadcastConfig,
  type BroadcastRecipient,
  type BroadcastStats,
  type BroadcastStatus,
  type DeliveryStatus,
  type AudienceFilter,
} from './BroadcastPlugin.js';

// Export AI plugin
export {
  AIPlugin,
  type AIProvider,
  type AIResponse,
  type AIPluginConfig,
  type ConversationTurn,
  type Intent,
} from './AIPlugin.js';
