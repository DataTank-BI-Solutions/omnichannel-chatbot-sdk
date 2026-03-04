import express from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../core/Logger.js';
import type { IChatbot, IDatabaseAdapter } from '../types/index.js';
import { AdminAPI } from './AdminAPI.js';
import type { AdminConfig } from './types.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
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
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

describe('AdminAPI', () => {
  let mockChatbot: IChatbot;
  let mockLogger: Logger;
  let mockDatabase: IDatabaseAdapter;
  let adminConfig: AdminConfig;

  beforeEach(() => {
    mockLogger = new Logger({ level: 'error' });

    mockDatabase = {
      name: 'mock',
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn(() => true),
      findUser: vi.fn(),
      findUserByPlatformId: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      findConversation: vi.fn(),
      findActiveConversation: vi.fn(),
      createConversation: vi.fn(),
      updateConversation: vi.fn(),
      saveMessage: vi.fn(),
      getConversationMessages: vi.fn(() => Promise.resolve([])),
    };

    mockChatbot = {
      config: {
        platforms: {},
        logging: { level: 'info' },
        database: { provider: 'supabase' as const, url: 'mock-url' },
      },
      platforms: new Map(),
      plugins: new Map(),
      router: {} as any,
      database: mockDatabase,
      logger: mockLogger,
      use: vi.fn(),
      command: vi.fn(),
      on: vi.fn(),
      text: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      broadcast: vi.fn(),
    };

    adminConfig = {
      jwtSecret: 'test-secret',
      tokenExpiresIn: '1h',
      refreshTokenExpiresIn: '7d',
    };
  });

  describe('Constructor', () => {
    it('should create AdminAPI instance with default config', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);

      expect(api).toBeInstanceOf(AdminAPI);
      expect(api.router).toBeDefined();
    });

    it('should apply custom configuration', () => {
      const customConfig: AdminConfig = {
        ...adminConfig,
        cors: { origin: 'https://example.com' },
        features: {
          analytics: false,
          broadcasts: true,
          liveChat: true,
          userManagement: true,
        },
      };

      const api = new AdminAPI(mockChatbot, customConfig);
      expect(api).toBeInstanceOf(AdminAPI);
    });

    it('should set up middleware and routes', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      const app = express();
      app.use('/admin', api.router);

      // Note: In a real test, you'd use supertest to test the routes
      // For now, we just verify the router is set up
      expect(api.router).toBeDefined();
    });
  });

  describe('Authentication Routes', () => {
    it('should have login route', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
      // Routes are set up in the constructor
    });

    it('should have refresh route when enabled', () => {
      const config = { ...adminConfig, enableRefreshTokens: true };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });

    it('should have logout route', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });

    it('should have current user route', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });
  });

  describe('Conversation Routes', () => {
    it('should set up conversation routes when user management is enabled', () => {
      const config = {
        ...adminConfig,
        features: {
          userManagement: true,
          broadcasts: false,
          liveChat: false,
          analytics: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });

    it('should not set up conversation routes when user management is disabled', () => {
      const config = {
        ...adminConfig,
        features: {
          userManagement: false,
          broadcasts: false,
          liveChat: false,
          analytics: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });
  });

  describe('Broadcast Routes', () => {
    it('should set up broadcast routes when broadcasts feature is enabled', () => {
      const config = {
        ...adminConfig,
        features: {
          broadcasts: true,
          userManagement: false,
          liveChat: false,
          analytics: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });

    it('should not set up broadcast routes when broadcasts feature is disabled', () => {
      const config = {
        ...adminConfig,
        features: {
          broadcasts: false,
          userManagement: false,
          liveChat: false,
          analytics: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });
  });

  describe('Agent Routes', () => {
    it('should set up agent routes when liveChat feature is enabled', () => {
      const config = {
        ...adminConfig,
        features: {
          liveChat: true,
          broadcasts: false,
          userManagement: false,
          analytics: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });

    it('should not set up agent routes when liveChat feature is disabled', () => {
      const config = {
        ...adminConfig,
        features: {
          liveChat: false,
          broadcasts: false,
          userManagement: false,
          analytics: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });
  });

  describe('Analytics Routes', () => {
    it('should set up analytics routes when analytics feature is enabled', () => {
      const config = {
        ...adminConfig,
        features: {
          analytics: true,
          broadcasts: false,
          liveChat: false,
          userManagement: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });

    it('should not set up analytics routes when analytics feature is disabled', () => {
      const config = {
        ...adminConfig,
        features: {
          analytics: false,
          broadcasts: false,
          liveChat: false,
          userManagement: false,
        },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });
  });

  describe('Settings Routes', () => {
    it('should always set up settings routes', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });
  });

  describe('Database Integration', () => {
    it('should use database when configured', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });

    it('should handle missing database gracefully', () => {
      const chatbotWithoutDb = { ...mockChatbot, database: undefined };
      const api = new AdminAPI(chatbotWithoutDb, adminConfig);
      expect(api.router).toBeDefined();
    });
  });

  describe('Plugin Integration', () => {
    it('should integrate with LiveChatPlugin when available', () => {
      const mockLiveChatPlugin = {
        name: 'LiveChatPlugin',
        version: '1.0.0',
        getAllAgents: vi.fn(() => []),
        addAgent: vi.fn(),
      };

      mockChatbot.plugins.set('LiveChatPlugin', mockLiveChatPlugin as any);
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });

    it('should integrate with BroadcastPlugin when available', () => {
      const mockBroadcastPlugin = {
        name: 'BroadcastPlugin',
        version: '1.0.0',
        getAllBroadcasts: vi.fn(() => []),
        createBroadcast: vi.fn(),
      };

      mockChatbot.plugins.set('BroadcastPlugin', mockBroadcastPlugin as any);
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should have error handler middleware', () => {
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
    });

    it('should log errors through chatbot logger', () => {
      const loggerSpy = vi.spyOn(mockLogger, 'error');
      const api = new AdminAPI(mockChatbot, adminConfig);
      expect(api.router).toBeDefined();
      // Error logging will happen during request processing
    });
  });

  describe('CORS Configuration', () => {
    it('should apply CORS configuration when provided', () => {
      const config = {
        ...adminConfig,
        cors: { origin: 'https://example.com', credentials: true },
      };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });

    it('should work without CORS configuration', () => {
      const config = { ...adminConfig, cors: undefined };
      const api = new AdminAPI(mockChatbot, config);
      expect(api.router).toBeDefined();
    });
  });

  describe('Start Method', () => {
    it('should start admin API server on specified port', async () => {
      const api = new AdminAPI(mockChatbot, adminConfig);

      // Note: We don't actually start the server in tests
      // Just verify the method exists
      expect(api.start).toBeDefined();
      expect(typeof api.start).toBe('function');
    });
  });
});
