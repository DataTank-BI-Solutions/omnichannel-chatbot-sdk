import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SupabaseAuthProvider,
  createAuthMiddleware,
  requirePermission,
  requireRole,
} from './auth.js';
import type { SupabaseAuthConfig } from './auth.js';
import type { Permission, UserRole } from './types.js';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    getUser: vi.fn(),
    admin: {
      createUser: vi.fn(),
      updateUserById: vi.fn(),
      deleteUser: vi.fn(),
      getUserById: vi.fn(),
      listUsers: vi.fn(),
    },
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('SupabaseAuthProvider', () => {
  let authProvider: SupabaseAuthProvider;
  let config: SupabaseAuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-service-key',
    };
    authProvider = new SupabaseAuthProvider(config);
  });

  describe('Constructor', () => {
    it('should create provider instance', () => {
      expect(authProvider).toBeInstanceOf(SupabaseAuthProvider);
    });

    it('should initialize with custom config', () => {
      const customConfig: SupabaseAuthConfig = {
        ...config,
        rolesTable: 'custom_admin_users',
      };
      const provider = new SupabaseAuthProvider(customConfig);
      expect(provider).toBeInstanceOf(SupabaseAuthProvider);
    });
  });

  describe('login', () => {
    it('should return error for invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const result = await authProvider.login({
        email: 'test@example.com',
        password: 'wrong',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return success for valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        user_metadata: { role: 'admin' },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
          },
        },
        error: null,
      });

      const result = await authProvider.login({
        email: 'test@example.com',
        password: 'correct',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should call signOut', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await authProvider.logout('mock-token');

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      });

      // Logout doesn't throw, it just logs the error
      await authProvider.logout('mock-token');
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should throw error for invalid token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      await expect(authProvider.verifyToken('invalid-token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should return token payload for valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'admin' },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authProvider.verifyToken('valid-token');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('refreshToken', () => {
    it('should return error for invalid refresh token', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid refresh token' },
      });

      const result = await authProvider.refreshToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return new tokens for valid refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        user_metadata: { role: 'admin' },
      };

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          user: mockUser,
          session: {
            access_token: 'new-token',
            refresh_token: 'new-refresh',
          },
        },
        error: null,
      });

      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authProvider.refreshToken('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  // getUserRole is private, so we test it indirectly through verifyToken
  describe('Role Management', () => {
    it('should handle role in token verification', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'agent' },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authProvider.verifyToken('valid-token');

      expect(result).toBeDefined();
      expect(result?.role).toBe('agent');
    });
  });

  describe('createAdminUser', () => {
    it('should create new admin user', async () => {
      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        created_at: new Date().toISOString(),
        user_metadata: { role: 'admin' },
      };

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authProvider.createAdminUser(
        'newuser@example.com',
        'password123',
        'admin'
      );

      expect(result.id).toBe('new-user-123');
      expect(result.email).toBe('newuser@example.com');
      expect(result.role).toBe('admin');
    });

    it('should handle creation errors', async () => {
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      await expect(
        authProvider.createAdminUser('existing@example.com', 'password', 'admin')
      ).rejects.toThrow();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await authProvider.updateUserRole('user-123', 'agent');

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          user_metadata: { role: 'agent' },
        })
      );
    });
  });

  describe('deleteAdminUser', () => {
    it('should delete admin user', async () => {
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      await authProvider.deleteAdminUser('user-123');

      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('listAdminUsers', () => {
    it('should list all admin users', async () => {
      const mockUsers = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          role: 'admin',
          name: 'User 1',
        },
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          role: 'agent',
          name: 'User 2',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
      };

      // Temporarily replace the from mock for this test
      const originalFrom = mockSupabaseClient.from;
      mockSupabaseClient.from = vi.fn(() => mockQuery as any);

      const result = await authProvider.listAdminUsers();

      // Restore original mock
      mockSupabaseClient.from = originalFrom;

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user1@example.com');
    });
  });
});

describe('createAuthMiddleware', () => {
  let authProvider: SupabaseAuthProvider;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    authProvider = new SupabaseAuthProvider({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
    });

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it('should return 401 when no authorization header', async () => {
    const middleware = createAuthMiddleware(authProvider);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid token format', async () => {
    mockReq.headers = { authorization: 'InvalidFormat' };
    const middleware = createAuthMiddleware(authProvider);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() for valid token', async () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    const middleware = createAuthMiddleware(authProvider);

    const mockPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'admin' as UserRole,
      permissions: ['conversations.view'] as Permission[],
    };

    vi.spyOn(authProvider, 'verifyToken').mockResolvedValue(mockPayload);

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as any).user).toEqual(mockPayload);
  });
});

describe('requirePermission', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'agent' as UserRole,
        permissions: ['conversations.view', 'conversations.assign'] as Permission[],
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it('should call next() when user has required permission', () => {
    const middleware = requirePermission('conversations.view');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 403 when user lacks permission', () => {
    const middleware = requirePermission('users.delete');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when no user in request', () => {
    mockReq.user = undefined;
    const middleware = requirePermission('conversations.view');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should require all permissions (AND logic)', () => {
    // User has: conversations.view, conversations.assign
    // Middleware requires: conversations.view, conversations.assign
    const middleware = requirePermission('conversations.view', 'conversations.assign');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny when missing one of multiple permissions', () => {
    // User has: conversations.view, conversations.assign
    // Middleware requires: conversations.view, users.view (user doesn't have users.view)
    const middleware = requirePermission('conversations.view', 'users.view');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'agent' as UserRole,
        permissions: [] as Permission[],
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it('should call next() when user has required role', () => {
    const middleware = requireRole('agent');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 403 when user has different role', () => {
    const middleware = requireRole('admin');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when no user in request', () => {
    mockReq.user = undefined;
    const middleware = requireRole('agent');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should check multiple roles (OR logic)', () => {
    const middleware = requireRole('admin', 'agent');

    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
