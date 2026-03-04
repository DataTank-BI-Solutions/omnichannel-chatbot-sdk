/**
 * Admin Authentication Middleware
 *
 * Supabase Auth integration for admin panel
 */

import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import type {
  AdminUser,
  AuthResponse,
  AuthenticatedRequest,
  LoginCredentials,
  Permission,
  TokenPayload,
  UserRole,
} from './types.js';

/**
 * Supabase Auth configuration
 */
export interface SupabaseAuthConfig {
  /** Supabase project URL */
  supabaseUrl: string;

  /** Supabase service role key (for admin operations) */
  supabaseServiceKey: string;

  /** Supabase anon key (for client operations) */
  supabaseAnonKey?: string;

  /** Custom roles table name (default: admin_users) */
  rolesTable?: string;

  /** Enable detailed logging */
  debug?: boolean;
}

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'conversations.view',
    'conversations.assign',
    'conversations.close',
    'conversations.export',
    'users.view',
    'users.edit',
    'users.delete',
    'broadcasts.view',
    'broadcasts.create',
    'broadcasts.send',
    'broadcasts.delete',
    'analytics.view',
    'settings.view',
    'settings.edit',
    'agents.view',
    'agents.manage',
  ],
  agent: [
    'conversations.view',
    'conversations.assign',
    'conversations.close',
    'users.view',
    'broadcasts.view',
    'analytics.view',
  ],
  viewer: ['conversations.view', 'users.view', 'broadcasts.view', 'analytics.view'],
};

/**
 * Supabase Auth Provider
 *
 * Uses Supabase Authentication for admin users
 */
export class SupabaseAuthProvider {
  private readonly supabase: SupabaseClient;
  private readonly serviceSupabase: SupabaseClient;
  private readonly config: Required<SupabaseAuthConfig>;

  constructor(config: SupabaseAuthConfig) {
    this.config = {
      supabaseUrl: config.supabaseUrl,
      supabaseServiceKey: config.supabaseServiceKey,
      supabaseAnonKey: config.supabaseAnonKey || config.supabaseServiceKey,
      rolesTable: config.rolesTable || 'admin_users',
      debug: config.debug || false,
    };

    // Client for user operations (uses anon key)
    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);

    // Client for admin operations (uses service role key)
    this.serviceSupabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.log('SupabaseAuthProvider initialized');
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      this.log('Login attempt', { email: credentials.email });

      // Sign in with Supabase Auth
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        this.log('Login failed', { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Get user role and permissions from metadata or database
      const role = await this.getUserRole(data.user.id);
      const permissions = ROLE_PERMISSIONS[role];

      // Build admin user object
      const userEmail = data.user.email || '';
      const userName =
        (data.user.user_metadata?.['name'] as string) || userEmail.split('@')[0] || 'admin';

      const adminUser: Omit<AdminUser, 'password'> = {
        id: data.user.id,
        email: userEmail,
        name: userName,
        role,
        permissions,
        createdAt: new Date(data.user.created_at),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      this.log('Login successful', { userId: data.user.id, role });

      return {
        success: true,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: adminUser,
        expiresIn: data.session.expires_in,
      };
    } catch (error: any) {
      this.log('Login error', { error: error.message });
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      this.log('Logout successful');
    } catch (error: any) {
      this.log('Logout error', { error: error.message });
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Verify JWT token and extract payload
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      // Get user from token
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new Error('Invalid token');
      }

      // Get role and permissions
      const role = await this.getUserRole(user.id);
      const permissions = ROLE_PERMISSIONS[role];

      return {
        userId: user.id,
        email: user.email!,
        role,
        permissions,
      };
    } catch (error: any) {
      this.log('Token verification failed', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      const role = await this.getUserRole(data.user.id);
      const permissions = ROLE_PERMISSIONS[role];

      const userEmail = data.user.email || '';
      const userName =
        (data.user.user_metadata?.['name'] as string) || userEmail.split('@')[0] || 'admin';

      const adminUser: Omit<AdminUser, 'password'> = {
        id: data.user.id,
        email: userEmail,
        name: userName,
        role,
        permissions,
        createdAt: new Date(data.user.created_at),
        updatedAt: new Date(),
      };

      return {
        success: true,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: adminUser,
        expiresIn: data.session.expires_in,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Token refresh failed',
      };
    }
  }

  /**
   * Get user role from database or metadata
   */
  private async getUserRole(userId: string): Promise<UserRole> {
    try {
      // Try to get role from admin_users table
      const { data, error } = await this.serviceSupabase
        .from(this.config.rolesTable)
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!error && data?.role) {
        return data.role as UserRole;
      }

      // Fallback to user metadata
      const {
        data: { user },
      } = await this.serviceSupabase.auth.admin.getUserById(userId);

      const roleFromMetadata = user?.user_metadata?.['role'];
      if (roleFromMetadata && typeof roleFromMetadata === 'string') {
        return roleFromMetadata as UserRole;
      }

      // Default role
      return 'viewer';
    } catch (error) {
      this.log('Failed to get user role, defaulting to viewer', { userId });
      return 'viewer';
    }
  }

  /**
   * Create admin user (requires service role)
   */
  async createAdminUser(email: string, password: string, role: UserRole): Promise<AdminUser> {
    try {
      // Create auth user
      const { data, error } = await this.serviceSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
        },
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Failed to create user');
      }

      // Store role in admin_users table
      await this.serviceSupabase.from(this.config.rolesTable).insert({
        user_id: data.user.id,
        email: data.user.email,
        role,
        created_at: new Date().toISOString(),
      });

      return {
        id: data.user.id,
        email: data.user.email!,
        name: email.split('@')[0] || 'admin',
        role,
        permissions: ROLE_PERMISSIONS[role],
        createdAt: new Date(data.user.created_at),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      throw new Error(`Failed to create admin user: ${error.message}`);
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      // Update in admin_users table
      await this.serviceSupabase
        .from(this.config.rolesTable)
        .update({ role, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      // Update user metadata
      await this.serviceSupabase.auth.admin.updateUserById(userId, {
        user_metadata: { role },
      });

      this.log('User role updated', { userId, role });
    } catch (error: any) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  }

  /**
   * Delete admin user
   */
  async deleteAdminUser(userId: string): Promise<void> {
    try {
      // Delete from admin_users table
      await this.serviceSupabase.from(this.config.rolesTable).delete().eq('user_id', userId);

      // Delete auth user
      await this.serviceSupabase.auth.admin.deleteUser(userId);

      this.log('Admin user deleted', { userId });
    } catch (error: any) {
      throw new Error(`Failed to delete admin user: ${error.message}`);
    }
  }

  /**
   * List all admin users
   */
  async listAdminUsers(): Promise<AdminUser[]> {
    try {
      const { data, error } = await this.serviceSupabase
        .from(this.config.rolesTable)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map((row: any) => ({
        id: row.user_id,
        email: row.email,
        name: row.name || row.email.split('@')[0],
        role: row.role,
        permissions: ROLE_PERMISSIONS[row.role as UserRole],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at || row.created_at),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      }));
    } catch (error: any) {
      throw new Error(`Failed to list admin users: ${error.message}`);
    }
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[SupabaseAuth] ${message}`, data || '');
    }
  }
}

/**
 * Express middleware to authenticate requests
 */
export function createAuthMiddleware(authProvider: SupabaseAuthProvider) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token and get user info
      const user = await authProvider.verifyToken(token);

      // Attach user to request
      req.user = user;

      next();
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        error: error.message || 'Unauthorized',
      });
    }
  };
}

/**
 * Express middleware to check permissions
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Check if user has all required permissions
    const hasPermissions = permissions.every((permission) =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: permissions,
        current: req.user.permissions,
      });
    }

    next();
  };
}

/**
 * Express middleware to check role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
}
