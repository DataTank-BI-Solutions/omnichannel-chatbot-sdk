/**
 * Admin Panel Types
 *
 * Type definitions for the admin API and authentication system
 */

import type { Request, Response } from 'express';
import type { Broadcast } from '../plugins/BroadcastPlugin.js';
import type { Conversation, User } from '../types/index.js';

// ============================================================================
// Authentication & Authorization Types
// ============================================================================

/**
 * User role for access control
 */
export type UserRole = 'admin' | 'agent' | 'viewer';

/**
 * Admin user (separate from chatbot users)
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Permission for granular access control
 */
export type Permission =
  | 'conversations.view'
  | 'conversations.assign'
  | 'conversations.close'
  | 'conversations.export'
  | 'users.view'
  | 'users.edit'
  | 'users.delete'
  | 'broadcasts.view'
  | 'broadcasts.create'
  | 'broadcasts.send'
  | 'broadcasts.delete'
  | 'analytics.view'
  | 'settings.view'
  | 'settings.edit'
  | 'agents.view'
  | 'agents.manage';

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: Omit<AdminUser, 'password'>;
  expiresIn?: number;
  error?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Authenticated request with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Paginated query parameters
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Standard API response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Conversation Management Types
// ============================================================================

/**
 * Conversation filters
 */
export interface ConversationFilters extends PaginationQuery {
  status?: 'active' | 'closed' | 'pending';
  platform?: string;
  agentId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

/**
 * Extended conversation with additional metadata
 */
export interface ConversationDetails extends Conversation {
  user?: User;
  messageCount?: number;
  lastMessage?: string;
  assignedAgent?: {
    id: string;
    name: string;
  };
  tags?: string[];
}

/**
 * Conversation assignment request
 */
export interface AssignConversationRequest {
  conversationId: string;
  agentId: string;
}

// ============================================================================
// User Management Types
// ============================================================================

/**
 * User filters
 */
export interface UserFilters extends PaginationQuery {
  platform?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Extended user with statistics
 */
export interface UserDetails extends User {
  conversationCount?: number;
  messageCount?: number;
  lastActiveAt?: Date;
  tags?: string[];
}

// ============================================================================
// Broadcast Management Types
// ============================================================================

/**
 * Broadcast filters
 */
export interface BroadcastFilters extends PaginationQuery {
  status?: 'draft' | 'sending' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Extended broadcast with statistics
 */
export interface BroadcastDetails extends Broadcast {
  createdBy?: string;
  completionRate?: number;
  estimatedDeliveryTime?: number;
}

/**
 * Create broadcast request
 */
export interface CreateBroadcastRequest {
  name: string;
  message: {
    type: 'text' | 'image' | 'video';
    text?: string;
    mediaUrl?: string;
    caption?: string;
  };
  targetPlatforms: string[];
  targetTags?: string[];
  scheduledAt?: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Date range for analytics
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Analytics metrics
 */
export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalConversations: number;
  activeConversations: number;
  avgResponseTime: number;
  avgConversationDuration: number;
  totalMessages: number;
  messagesByPlatform: Record<string, number>;
  conversationsByStatus: Record<string, number>;
  userGrowth: Array<{ date: string; count: number }>;
  messageVolume: Array<{ date: string; count: number }>;
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore?: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket event types
 */
export type WebSocketEvent =
  | 'conversation.new'
  | 'conversation.updated'
  | 'conversation.closed'
  | 'message.new'
  | 'agent.status_changed'
  | 'broadcast.started'
  | 'broadcast.completed'
  | 'user.online'
  | 'user.offline';

/**
 * WebSocket message
 */
export interface WebSocketMessage<T = any> {
  event: WebSocketEvent;
  data: T;
  timestamp: Date;
}

// ============================================================================
// Admin Configuration Types
// ============================================================================

/**
 * Admin panel configuration
 */
export interface AdminConfig {
  /** JWT secret for token signing */
  jwtSecret: string;

  /** Token expiration time (default: 24h) */
  tokenExpiresIn?: string;

  /** Refresh token expiration (default: 7d) */
  refreshTokenExpiresIn?: string;

  /** Enable refresh tokens */
  enableRefreshTokens?: boolean;

  /** CORS configuration */
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };

  /** Rate limiting */
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };

  /** WebSocket configuration */
  websocket?: {
    enabled?: boolean;
    path?: string;
  };

  /** UI configuration */
  ui?: {
    enabled?: boolean;
    path?: string;
    theme?: {
      primaryColor?: string;
      logo?: string;
    };
  };

  /** Feature toggles */
  features?: {
    analytics?: boolean;
    broadcasts?: boolean;
    liveChat?: boolean;
    userManagement?: boolean;
  };
}

/**
 * Admin API routes configuration
 */
export interface AdminRoutes {
  /** Base path for admin API */
  basePath?: string;

  /** Authentication routes */
  auth?: {
    login?: string;
    logout?: string;
    refresh?: string;
    me?: string;
  };

  /** Resource routes */
  conversations?: string;
  users?: string;
  broadcasts?: string;
  agents?: string;
  analytics?: string;
  settings?: string;
}
