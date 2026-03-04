import type { SessionManager } from '../session/SessionManager.js';
import type { IContext } from '../types/index.js';
import { Scene } from './Scene.js';
import type { ActiveScene, FlowConfig, FlowContext, FlowState } from './types.js';

/**
 * FlowBuilder creates and manages conversation flows
 *
 * @remarks
 * FlowBuilder manages scenes and handles scene transitions for conversational workflows.
 * It integrates with the session manager to persist scene state across messages.
 *
 * @example
 * ```typescript
 * const flow = new FlowBuilder({
 *   name: 'registration',
 *   initialScene: 'welcome',
 * });
 *
 * flow.scene({
 *   id: 'welcome',
 *   onEnter: async (ctx) => {
 *     await ctx.reply('Welcome! What is your name?');
 *   },
 *   onMessage: async (ctx) => {
 *     ctx.flowState.set('name', ctx.message.text);
 *     await ctx.enterScene('email');
 *   },
 * });
 *
 * flow.scene({
 *   id: 'email',
 *   onEnter: async (ctx) => {
 *     const name = ctx.flowState.get<string>('name');
 *     await ctx.reply(`Hi ${name}, what is your email?`);
 *   },
 *   onMessage: async (ctx) => {
 *     ctx.flowState.set('email', ctx.message.text);
 *     await ctx.reply('Thanks! Registration complete.');
 *     await ctx.leaveScene();
 *   },
 * });
 *
 * bot.command('register', async (ctx) => {
 *   await flow.enter(ctx, sessionManager);
 * });
 * ```
 */
export class FlowBuilder {
  public readonly name: string;
  public readonly initialScene?: string;
  public readonly defaultSceneTTL?: number;

  private readonly _scenes: Map<string, Scene> = new Map();

  constructor(config: FlowConfig) {
    this.name = config.name;
    this.initialScene = config.initialScene;
    this.defaultSceneTTL = config.defaultSceneTTL;
  }

  /**
   * Register a scene in the flow
   *
   * @param config - Scene configuration
   * @returns The FlowBuilder instance for chaining
   */
  scene(config: import('./types.js').SceneConfig): this {
    const scene = new Scene({
      ...config,
      ttl: config.ttl ?? this.defaultSceneTTL,
    });
    this._scenes.set(scene.id, scene);
    return this;
  }

  /**
   * Get a scene by ID
   *
   * @param sceneId - Scene identifier
   * @returns Scene instance or undefined
   */
  getScene(sceneId: string): Scene | undefined {
    return this._scenes.get(sceneId);
  }

  /**
   * Check if a scene exists
   *
   * @param sceneId - Scene identifier
   */
  hasScene(sceneId: string): boolean {
    return this._scenes.has(sceneId);
  }

  /**
   * Get all registered scenes
   */
  get scenes(): Scene[] {
    return Array.from(this._scenes.values());
  }

  /**
   * Enter the flow (start from initial scene if defined)
   *
   * @param ctx - Message context
   * @param sessionManager - Session manager instance
   */
  async enter(ctx: IContext, sessionManager: SessionManager): Promise<void> {
    if (!this.initialScene) {
      throw new Error(`Flow "${this.name}" has no initial scene defined`);
    }

    const flowCtx = await this._createFlowContext(ctx, sessionManager);
    await flowCtx.enterScene(this.initialScene);
  }

  /**
   * Handle a message within the flow
   *
   * @param ctx - Message context
   * @param sessionManager - Session manager instance
   */
  async handleMessage(ctx: IContext, sessionManager: SessionManager): Promise<void> {
    // Load current scene
    const sessionKey = this._getSceneSessionKey();
    const activeScene = await sessionManager.get<ActiveScene>(
      ctx.user.id,
      ctx.message.platform,
      sessionKey
    );

    const currentSceneId = activeScene?.sceneId;

    if (!currentSceneId) {
      // No active scene
      return;
    }

    const scene = this.getScene(currentSceneId);
    if (!scene) {
      // Scene not found, clear it
      await sessionManager.deleteKey(ctx.user.id, ctx.message.platform, sessionKey);
      return;
    }

    // Check if scene has expired
    if (activeScene?.expiresAt && new Date(activeScene.expiresAt) < new Date()) {
      await sessionManager.deleteKey(ctx.user.id, ctx.message.platform, sessionKey);
      return;
    }

    // Create flow context with loaded state
    const flowCtx = await this._createFlowContext(ctx, sessionManager);

    // Handle the message in the current scene
    await scene.handleMessage(flowCtx);
  }

  /**
   * Create a flow context wrapper
   *
   * @param ctx - Base context
   * @param sessionManager - Session manager
   * @returns Flow context with navigation methods
   */
  private async _createFlowContext(
    ctx: IContext,
    sessionManager: SessionManager
  ): Promise<FlowContext> {
    const sessionKey = this._getSceneSessionKey();
    const flowStateKey = this._getFlowStateKey();

    const flowCtx = ctx as FlowContext;

    // Add scene navigation methods
    flowCtx.enterScene = async (sceneId: string): Promise<void> => {
      const scene = this.getScene(sceneId);
      if (!scene) {
        throw new Error(`Scene "${sceneId}" not found in flow "${this.name}"`);
      }

      // Leave current scene if any
      const currentSceneId = flowCtx.getCurrentScene();
      if (currentSceneId) {
        const currentScene = this.getScene(currentSceneId);
        if (currentScene) {
          await currentScene.leave(flowCtx);
        }
      }

      // Set new active scene
      const now = new Date();
      const activeScene: ActiveScene = {
        sceneId,
        enteredAt: now,
        expiresAt: scene.ttl ? new Date(now.getTime() + scene.ttl * 1000) : undefined,
        data: {},
      };

      await sessionManager.set(ctx.user.id, ctx.message.platform, sessionKey, activeScene);

      // Enter new scene
      await scene.enter(flowCtx);
    };

    flowCtx.leaveScene = async (): Promise<void> => {
      const currentSceneId = flowCtx.getCurrentScene();
      if (currentSceneId) {
        const scene = this.getScene(currentSceneId);
        if (scene) {
          await scene.leave(flowCtx);
        }
      }

      // Clear active scene and flow state
      await sessionManager.deleteKey(ctx.user.id, ctx.message.platform, sessionKey);
      await sessionManager.deleteKey(ctx.user.id, ctx.message.platform, flowStateKey);
    };

    flowCtx.getCurrentScene = (): string | undefined => {
      // This is a synchronous method, so we can't await
      // The value is cached in the flowCtx during handleMessage
      return (flowCtx as any)._currentSceneId;
    };

    // Create flow state manager
    flowCtx.flowState = {
      get: <T = unknown>(key: string): T | undefined => {
        const state = (flowCtx as any)._flowState || {};
        return state[key] as T | undefined;
      },

      set: <T = unknown>(key: string, value: T): void => {
        if (!(flowCtx as any)._flowState) {
          (flowCtx as any)._flowState = {};
        }
        (flowCtx as any)._flowState[key] = value;

        // Persist to session (async, but we don't await)
        sessionManager.set(
          ctx.user.id,
          ctx.message.platform,
          flowStateKey,
          (flowCtx as any)._flowState
        );
      },

      delete: (key: string): void => {
        if ((flowCtx as any)._flowState) {
          delete (flowCtx as any)._flowState[key];

          // Persist to session
          sessionManager.set(
            ctx.user.id,
            ctx.message.platform,
            flowStateKey,
            (flowCtx as any)._flowState
          );
        }
      },

      clear: (): void => {
        (flowCtx as any)._flowState = {};
        sessionManager.deleteKey(ctx.user.id, ctx.message.platform, flowStateKey);
      },
    };

    // Load current scene and flow state from session
    const activeScene = await sessionManager.get<ActiveScene>(
      ctx.user.id,
      ctx.message.platform,
      sessionKey
    );

    const flowState = await sessionManager.get<Record<string, unknown>>(
      ctx.user.id,
      ctx.message.platform,
      flowStateKey
    );

    (flowCtx as any)._currentSceneId = activeScene?.sceneId;
    (flowCtx as any)._flowState = flowState || {};

    return flowCtx;
  }

  /**
   * Load flow state from session
   *
   * @param flowCtx - Flow context
   * @param sessionManager - Session manager
   */
  private async _loadFlowState(
    flowCtx: FlowContext,
    sessionManager: SessionManager
  ): Promise<void> {
    const sessionKey = this._getSceneSessionKey();
    const flowStateKey = this._getFlowStateKey();

    const activeScene = await sessionManager.get<ActiveScene>(
      (flowCtx as IContext).user.id,
      (flowCtx as IContext).message.platform,
      sessionKey
    );

    const flowState = await sessionManager.get<Record<string, unknown>>(
      (flowCtx as IContext).user.id,
      (flowCtx as IContext).message.platform,
      flowStateKey
    );

    (flowCtx as any)._currentSceneId = activeScene?.sceneId;
    (flowCtx as any)._flowState = flowState || {};
  }

  /**
   * Get session key for active scene
   */
  private _getSceneSessionKey(): string {
    return `flow:${this.name}:scene`;
  }

  /**
   * Get session key for flow state
   */
  private _getFlowStateKey(): string {
    return `flow:${this.name}:state`;
  }
}
