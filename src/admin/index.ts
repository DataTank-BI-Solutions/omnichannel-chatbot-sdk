/**
 * Admin Panel Module
 *
 * Exports admin API components for managing the chatbot system
 *
 * @example
 * ```typescript
 * import { AdminAPI, SupabaseAuthProvider } from '@/admin';
 *
 * const adminAPI = new AdminAPI(chatbot, {
 *   jwtSecret: process.env.JWT_SECRET!,
 *   supabaseUrl: process.env.SUPABASE_URL!,
 *   supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
 * });
 *
 * app.use('/api/admin', adminAPI.router);
 * ```
 */

export { AdminAPI } from './AdminAPI.js';
export {
  SupabaseAuthProvider,
  createAuthMiddleware,
  requirePermission,
  requireRole,
} from './auth.js';
export type { SupabaseAuthConfig } from './auth.js';
export type {
  AdminConfig,
  AdminUser,
  UserRole,
  Permission,
  TokenPayload,
  LoginCredentials,
  AuthResponse,
  AuthenticatedRequest,
  PaginationQuery,
  PaginatedResponse,
  ApiResponse,
  ConversationFilters,
  ConversationDetails,
  AssignConversationRequest,
  UserFilters,
  UserDetails,
  BroadcastFilters,
  BroadcastDetails,
  CreateBroadcastRequest,
  AnalyticsMetrics,
  AgentMetrics,
  DateRange,
  WebSocketEvent,
  WebSocketMessage,
  AdminRoutes,
} from './types.js';
