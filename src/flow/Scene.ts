import type { FlowContext, SceneConfig, SceneHandler, SceneLeaveHandler } from './types.js';

/**
 * Scene represents a step in a conversation flow
 *
 * @remarks
 * Scenes are individual states in a conversation that have their own
 * enter, message, and leave handlers. Users can navigate between scenes
 * to create multi-step conversational workflows.
 *
 * @example
 * ```typescript
 * const welcomeScene = new Scene({
 *   id: 'welcome',
 *   onEnter: async (ctx) => {
 *     await ctx.reply('Welcome! What is your name?');
 *   },
 *   onMessage: async (ctx) => {
 *     const name = ctx.message.text;
 *     ctx.flowState.set('name', name);
 *     await ctx.reply(`Nice to meet you, ${name}!`);
 *     await ctx.enterScene('email');
 *   },
 * });
 * ```
 */
export class Scene {
  public readonly id: string;
  public readonly ttl?: number;

  private readonly _onEnter?: SceneHandler;
  private readonly _onMessage?: SceneHandler;
  private readonly _onLeave?: SceneLeaveHandler;

  constructor(config: SceneConfig) {
    this.id = config.id;
    this.ttl = config.ttl;
    this._onEnter = config.onEnter;
    this._onMessage = config.onMessage;
    this._onLeave = config.onLeave;
  }

  /**
   * Execute the enter handler
   * @param ctx - Flow context
   */
  async enter(ctx: FlowContext): Promise<void> {
    if (this._onEnter) {
      await this._onEnter(ctx);
    }
  }

  /**
   * Execute the message handler
   * @param ctx - Flow context
   */
  async handleMessage(ctx: FlowContext): Promise<void> {
    if (this._onMessage) {
      await this._onMessage(ctx);
    }
  }

  /**
   * Execute the leave handler
   * @param ctx - Flow context
   */
  async leave(ctx: FlowContext): Promise<void> {
    if (this._onLeave) {
      await this._onLeave(ctx);
    }
  }

  /**
   * Check if scene has an enter handler
   */
  get hasEnterHandler(): boolean {
    return this._onEnter !== undefined;
  }

  /**
   * Check if scene has a message handler
   */
  get hasMessageHandler(): boolean {
    return this._onMessage !== undefined;
  }

  /**
   * Check if scene has a leave handler
   */
  get hasLeaveHandler(): boolean {
    return this._onLeave !== undefined;
  }
}
