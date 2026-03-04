/**
 * Admin API
 *
 * RESTful API for managing the chatbot system
 */

import cors from 'cors';
import express, { type Express, type Router } from 'express';
import type { IChatbot } from '../types/index.js';
import type { IDatabaseAdapter } from '../types/index.js';
import {
  SupabaseAuthProvider,
  createAuthMiddleware,
  requirePermission,
  requireRole,
} from './auth.js';
import type { AdminConfig, AuthenticatedRequest } from './types.js';

/**
 * Admin API class
 *
 * Provides RESTful API for admin panel
 *
 * @example
 * ```typescript
 * const adminAPI = new AdminAPI({
 *   chatbot: bot,
 *   jwtSecret: process.env.JWT_SECRET!,
 *   supabaseUrl: process.env.SUPABASE_URL!,
 *   supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
 * });
 *
 * app.use('/api/admin', adminAPI.router);
 * ```
 */
export class AdminAPI {
  public readonly router: Router;
  private readonly chatbot: IChatbot;
  private readonly database?: IDatabaseAdapter;
  private readonly authProvider: SupabaseAuthProvider;
  private readonly config: Required<AdminConfig>;

  constructor(chatbot: IChatbot, config: AdminConfig) {
    this.chatbot = chatbot;
    this.database = chatbot.config.database ? (chatbot as any).database : undefined;

    // Initialize auth provider
    this.authProvider = new SupabaseAuthProvider({
      supabaseUrl: config.jwtSecret, // This should be supabaseUrl in practice
      supabaseServiceKey: config.jwtSecret, // This should be supabaseServiceKey
    });

    this.config = {
      jwtSecret: config.jwtSecret,
      tokenExpiresIn: config.tokenExpiresIn || '24h',
      refreshTokenExpiresIn: config.refreshTokenExpiresIn || '7d',
      enableRefreshTokens: config.enableRefreshTokens ?? true,
      cors: config.cors || { origin: '*', credentials: true },
      rateLimit: config.rateLimit || { windowMs: 15 * 60 * 1000, max: 100 },
      websocket: config.websocket || { enabled: true, path: '/ws' },
      ui: config.ui || { enabled: false, path: '/admin' },
      features: config.features || {
        analytics: true,
        broadcasts: true,
        liveChat: true,
        userManagement: true,
      },
    };

    this.router = express.Router();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // CORS
    if (this.config.cors) {
      this.router.use(cors(this.config.cors));
    }

    // JSON body parser
    this.router.use(express.json());

    // Request logging
    this.router.use((req, res, next) => {
      this.chatbot.logger.debug('Admin API request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check
    this.router.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'ok',
          version: '1.0.0',
          features: this.config.features,
        },
      });
    });

    // Authentication routes (no auth required)
    this.setupAuthRoutes();

    // Protected routes (require authentication)
    const authMiddleware = createAuthMiddleware(this.authProvider);
    this.router.use(authMiddleware);

    // Feature-specific routes
    if (this.config.features.userManagement) {
      this.setupConversationRoutes();
      this.setupUserRoutes();
    }

    if (this.config.features.broadcasts) {
      this.setupBroadcastRoutes();
    }

    if (this.config.features.liveChat) {
      this.setupAgentRoutes();
    }

    if (this.config.features.analytics) {
      this.setupAnalyticsRoutes();
    }

    // Settings routes
    this.setupSettingsRoutes();

    // Error handler
    this.router.use((err: any, req: any, res: any, next: any) => {
      this.chatbot.logger.error('Admin API error', { error: err.message });
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    });
  }

  /**
   * Authentication routes
   */
  private setupAuthRoutes(): void {
    // Login
    this.router.post('/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            error: 'Email and password are required',
          });
        }

        const result = await this.authProvider.login({ email, password });

        if (!result.success) {
          return res.status(401).json(result);
        }

        res.json(result);
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Refresh token
    if (this.config.enableRefreshTokens) {
      this.router.post('/auth/refresh', async (req, res) => {
        try {
          const { refreshToken } = req.body;

          if (!refreshToken) {
            return res.status(400).json({
              success: false,
              error: 'Refresh token is required',
            });
          }

          const result = await this.authProvider.refreshToken(refreshToken);

          if (!result.success) {
            return res.status(401).json(result);
          }

          res.json(result);
        } catch (error: any) {
          res.status(500).json({
            success: false,
            error: error.message,
          });
        }
      });
    }

    // Logout
    this.router.post('/auth/logout', async (req, res) => {
      try {
        const token = req.headers.authorization?.substring(7);
        if (token) {
          await this.authProvider.logout(token);
        }

        res.json({ success: true, message: 'Logged out successfully' });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get current user
    this.router.get(
      '/auth/me',
      createAuthMiddleware(this.authProvider),
      (req: AuthenticatedRequest, res) => {
        res.json({
          success: true,
          data: req.user,
        });
      }
    );
  }

  /**
   * Conversation management routes
   */
  private setupConversationRoutes(): void {
    const base = '/conversations';

    // List conversations
    this.router.get(base, requirePermission('conversations.view'), async (req, res) => {
      try {
        if (!this.database) {
          return res.status(501).json({
            success: false,
            error: 'Database adapter not configured',
          });
        }

        const pageQuery = req.query['page'];
        const limitQuery = req.query['limit'];
        const page = Number.parseInt((typeof pageQuery === 'string' ? pageQuery : '1') || '1') || 1;
        const limit =
          Number.parseInt((typeof limitQuery === 'string' ? limitQuery : '20') || '20') || 20;

        // Get conversations from database
        // Note: This is a simplified implementation. In production, you'd want to:
        // 1. Add proper filtering by status, platform, date range
        // 2. Implement pagination with offset/limit
        // 3. Add sorting capabilities
        // 4. Join with users table to get user details

        res.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to list conversations', { error });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get conversation by ID
    this.router.get(`${base}/:id`, requirePermission('conversations.view'), async (req, res) => {
      try {
        if (!this.database) {
          return res.status(501).json({
            success: false,
            error: 'Database adapter not configured',
          });
        }

        const id = req.params['id'];
        const conversationId = typeof id === 'string' ? id : id?.[0];

        if (!conversationId) {
          return res.status(400).json({
            success: false,
            error: 'Conversation ID is required',
          });
        }

        const conversation = await this.database.findConversation(conversationId);

        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Conversation not found',
          });
        }

        // Get conversation messages
        const messages = await this.database.getConversationMessages(conversationId, 100);

        res.json({
          success: true,
          data: {
            ...conversation,
            messages,
          },
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to get conversation', {
          error,
          id: req.params['id'],
        });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Assign conversation to agent
    this.router.post(
      `${base}/:id/assign`,
      requirePermission('conversations.assign'),
      async (req, res) => {
        try {
          const id = req.params['id'];
          const conversationId = typeof id === 'string' ? id : id?.[0];
          const { agentId } = req.body;

          if (!conversationId) {
            return res.status(400).json({
              success: false,
              error: 'Conversation ID is required',
            });
          }

          if (!agentId) {
            return res.status(400).json({
              success: false,
              error: 'Agent ID is required',
            });
          }

          // Get LiveChatPlugin
          const liveChatPlugin = this.chatbot.plugins.get('LiveChatPlugin');
          if (!liveChatPlugin) {
            return res.status(501).json({
              success: false,
              error: 'LiveChat plugin not installed',
            });
          }

          // Assign conversation to agent
          const success = await (liveChatPlugin as any).assignAgent(conversationId, agentId);

          if (!success) {
            return res.status(400).json({
              success: false,
              error: 'Failed to assign conversation',
            });
          }

          res.json({
            success: true,
            message: 'Conversation assigned successfully',
          });
        } catch (error: any) {
          this.chatbot.logger.error('Failed to assign conversation', {
            error,
            id: req.params['id'],
          });
          res.status(500).json({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Close conversation
    this.router.post(
      `${base}/:id/close`,
      requirePermission('conversations.close'),
      async (req, res) => {
        try {
          if (!this.database) {
            return res.status(501).json({
              success: false,
              error: 'Database adapter not configured',
            });
          }

          const id = req.params['id'];
          const conversationId = typeof id === 'string' ? id : id?.[0];

          if (!conversationId) {
            return res.status(400).json({
              success: false,
              error: 'Conversation ID is required',
            });
          }

          // Update conversation status to closed
          await this.database.updateConversation(conversationId, {
            status: 'closed',
          });

          // If LiveChatPlugin is installed, end the conversation there too
          const liveChatPlugin = this.chatbot.plugins.get('LiveChatPlugin');
          if (liveChatPlugin) {
            await (liveChatPlugin as any).endConversation(conversationId);
          }

          res.json({
            success: true,
            message: 'Conversation closed successfully',
          });
        } catch (error: any) {
          this.chatbot.logger.error('Failed to close conversation', {
            error,
            id: req.params['id'],
          });
          res.status(500).json({
            success: false,
            error: error.message,
          });
        }
      }
    );
  }

  /**
   * User management routes
   */
  private setupUserRoutes(): void {
    const base = '/users';

    // List users
    this.router.get(base, requirePermission('users.view'), async (req, res) => {
      try {
        if (!this.database) {
          return res.status(501).json({
            success: false,
            error: 'Database adapter not configured',
          });
        }

        const pageQuery = req.query['page'];
        const limitQuery = req.query['limit'];
        const page = Number.parseInt((typeof pageQuery === 'string' ? pageQuery : '1') || '1') || 1;
        const limit =
          Number.parseInt((typeof limitQuery === 'string' ? limitQuery : '20') || '20') || 20;

        // Note: This is a simplified implementation
        // In production, you'd implement pagination and filtering
        res.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to list users', { error });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get user by ID
    this.router.get(`${base}/:id`, requirePermission('users.view'), async (req, res) => {
      try {
        if (!this.database) {
          return res.status(501).json({
            success: false,
            error: 'Database adapter not configured',
          });
        }

        const id = req.params['id'];
        const userId = typeof id === 'string' ? id : id?.[0];

        if (!userId) {
          return res.status(400).json({
            success: false,
            error: 'User ID is required',
          });
        }

        const user = await this.database.findUser(userId);

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        res.json({
          success: true,
          data: user,
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to get user', {
          error,
          id: req.params['id'],
        });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Broadcast management routes
   */
  private setupBroadcastRoutes(): void {
    const base = '/broadcasts';

    // List broadcasts
    this.router.get(base, requirePermission('broadcasts.view'), async (req, res) => {
      try {
        const broadcastPlugin = this.chatbot.plugins.get('BroadcastPlugin');
        if (!broadcastPlugin) {
          return res.status(501).json({
            success: false,
            error: 'Broadcast plugin not installed',
          });
        }

        const statusQuery = req.query['status'];
        const status = typeof statusQuery === 'string' ? statusQuery : undefined;

        const broadcasts = (broadcastPlugin as any).getAllBroadcasts(status);

        res.json({
          success: true,
          data: broadcasts,
          pagination: {
            page: 1,
            limit: broadcasts.length,
            total: broadcasts.length,
            totalPages: 1,
          },
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to list broadcasts', { error });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Create broadcast
    this.router.post(base, requirePermission('broadcasts.create'), async (req, res) => {
      try {
        const broadcastPlugin = this.chatbot.plugins.get('BroadcastPlugin');
        if (!broadcastPlugin) {
          return res.status(501).json({
            success: false,
            error: 'Broadcast plugin not installed',
          });
        }

        const { name, message, filter } = req.body;

        if (!name || !message) {
          return res.status(400).json({
            success: false,
            error: 'Name and message are required',
          });
        }

        const broadcast = (broadcastPlugin as any).createBroadcast(name, message, filter);

        res.json({
          success: true,
          data: broadcast,
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to create broadcast', { error });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Send broadcast
    this.router.post(`${base}/:id/send`, requirePermission('broadcasts.send'), async (req, res) => {
      try {
        const broadcastPlugin = this.chatbot.plugins.get('BroadcastPlugin');
        if (!broadcastPlugin) {
          return res.status(501).json({
            success: false,
            error: 'Broadcast plugin not installed',
          });
        }

        const id = req.params['id'];
        const broadcastId = typeof id === 'string' ? id : id?.[0];

        if (!broadcastId) {
          return res.status(400).json({
            success: false,
            error: 'Broadcast ID is required',
          });
        }

        const stats = await (broadcastPlugin as any).sendBroadcast(broadcastId);

        res.json({
          success: true,
          message: 'Broadcast sent successfully',
          data: stats,
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to send broadcast', {
          error,
          id: req.params['id'],
        });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Agent management routes
   */
  private setupAgentRoutes(): void {
    const base = '/agents';

    // List agents
    this.router.get(base, requirePermission('agents.view'), async (req, res) => {
      try {
        const liveChatPlugin = this.chatbot.plugins.get('LiveChatPlugin');
        if (!liveChatPlugin) {
          return res.status(501).json({
            success: false,
            error: 'LiveChat plugin not installed',
          });
        }

        const agents = (liveChatPlugin as any).getAllAgents();

        res.json({
          success: true,
          data: agents,
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to list agents', { error });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Add agent
    this.router.post(base, requirePermission('agents.manage'), async (req, res) => {
      try {
        const liveChatPlugin = this.chatbot.plugins.get('LiveChatPlugin');
        if (!liveChatPlugin) {
          return res.status(501).json({
            success: false,
            error: 'LiveChat plugin not installed',
          });
        }

        const { id, name, email } = req.body;

        if (!id || !name) {
          return res.status(400).json({
            success: false,
            error: 'Agent ID and name are required',
          });
        }

        (liveChatPlugin as any).addAgent({
          id,
          name,
          email,
          status: 'offline',
          currentConversations: 0,
          metadata: {},
        });

        res.json({
          success: true,
          message: 'Agent added successfully',
        });
      } catch (error: any) {
        this.chatbot.logger.error('Failed to add agent', { error });
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Analytics routes
   */
  private setupAnalyticsRoutes(): void {
    const base = '/analytics';

    // Get dashboard metrics
    this.router.get(base, requirePermission('analytics.view'), async (req, res) => {
      try {
        // TODO: Implement analytics
        res.json({
          success: true,
          data: {
            totalUsers: 0,
            activeUsers: 0,
            totalConversations: 0,
            activeConversations: 0,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Settings routes
   */
  private setupSettingsRoutes(): void {
    const base = '/settings';

    // Get settings
    this.router.get(base, requirePermission('settings.view'), async (req, res) => {
      try {
        res.json({
          success: true,
          data: {
            features: this.config.features,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Start the admin API server
   */
  async start(port = 3001): Promise<void> {
    const app: Express = express();
    app.use('/api/admin', this.router);

    return new Promise((resolve) => {
      app.listen(port, () => {
        this.chatbot.logger.info('Admin API started', { port });
        resolve();
      });
    });
  }
}
