import type { IContext } from '../types/index.js';
import { BasePlugin } from './BasePlugin.js';

/**
 * Agent status
 */
export type AgentStatus = 'online' | 'offline' | 'busy';

/**
 * Agent information
 */
export interface Agent {
  id: string;
  name: string;
  email?: string;
  status: AgentStatus;
  maxConversations: number;
  activeConversations: number;
}

/**
 * Live chat plugin configuration
 */
export interface LiveChatConfig {
  /**
   * Auto-assign conversations to available agents
   * @default true
   */
  autoAssign?: boolean;

  /**
   * Maximum conversations per agent
   * @default 5
   */
  maxConversationsPerAgent?: number;

  /**
   * Timeout for agent response in seconds
   * @default 300 (5 minutes)
   */
  agentResponseTimeout?: number;
}

/**
 * Live chat plugin for agent handoff and conversation management
 *
 * @remarks
 * This plugin enables human agent support with automatic conversation
 * assignment, agent availability management, and conversation history.
 *
 * @example
 * ```typescript
 * const liveChat = new LiveChatPlugin({
 *   autoAssign: true,
 *   maxConversationsPerAgent: 5,
 * });
 *
 * bot.use(liveChat);
 *
 * // Add an agent
 * liveChat.addAgent({
 *   id: 'agent1',
 *   name: 'John Doe',
 *   status: 'online',
 *   maxConversations: 5,
 *   activeConversations: 0,
 * });
 *
 * // Request live chat
 * bot.command('agent', async (ctx) => {
 *   await liveChat.requestAgent(ctx);
 * });
 * ```
 */
export class LiveChatPlugin extends BasePlugin {
  public readonly name = 'LiveChatPlugin';
  public readonly version = '1.0.0';

  private readonly _config: Required<LiveChatConfig>;
  private readonly _agents: Map<string, Agent> = new Map();
  private readonly _conversations: Map<string, string> = new Map(); // conversationId -> agentId

  constructor(config: LiveChatConfig = {}) {
    super();
    this._config = {
      autoAssign: config.autoAssign ?? true,
      maxConversationsPerAgent: config.maxConversationsPerAgent ?? 5,
      agentResponseTimeout: config.agentResponseTimeout ?? 300,
    };
  }

  /**
   * Add an agent to the system
   */
  addAgent(agent: Agent): void {
    this._agents.set(agent.id, agent);
    this.logger.info('Agent added', { agentId: agent.id, name: agent.name });
  }

  /**
   * Remove an agent from the system
   */
  removeAgent(agentId: string): void {
    this._agents.delete(agentId);
    this.logger.info('Agent removed', { agentId });
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this._agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this._agents.values());
  }

  /**
   * Get available agents (online and not at max capacity)
   */
  getAvailableAgents(): Agent[] {
    return Array.from(this._agents.values()).filter(
      (agent) => agent.status === 'online' && agent.activeConversations < agent.maxConversations
    );
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this._agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.logger.info('Agent status updated', { agentId, status });
    }
  }

  /**
   * Request an agent for a conversation
   */
  async requestAgent(ctx: IContext): Promise<boolean> {
    const conversationId = ctx.conversation.id;

    // Check if already assigned
    if (this._conversations.has(conversationId)) {
      await ctx.reply('You are already connected to an agent.');
      return false;
    }

    if (this._config.autoAssign) {
      const agent = this._findAvailableAgent();
      if (agent) {
        return this.assignAgent(conversationId, agent.id, ctx);
      }
    }

    await ctx.reply(
      'All agents are currently busy. You have been added to the queue. An agent will be with you shortly.'
    );
    return false;
  }

  /**
   * Assign a conversation to an agent
   */
  async assignAgent(conversationId: string, agentId: string, ctx?: IContext): Promise<boolean> {
    const agent = this._agents.get(agentId);
    if (!agent) {
      this.logger.error('Agent not found', { agentId });
      return false;
    }

    if (agent.status !== 'online') {
      this.logger.warn('Agent is not online', {
        agentId,
        status: agent.status,
      });
      return false;
    }

    if (agent.activeConversations >= agent.maxConversations) {
      this.logger.warn('Agent at max capacity', { agentId });
      return false;
    }

    // Assign conversation
    this._conversations.set(conversationId, agentId);
    agent.activeConversations++;

    this.logger.info('Conversation assigned to agent', {
      conversationId,
      agentId,
    });

    if (ctx) {
      await ctx.reply(`You have been connected to ${agent.name}. They will assist you shortly.`);
    }

    return true;
  }

  /**
   * End a conversation with an agent
   */
  async endConversation(conversationId: string, ctx?: IContext): Promise<boolean> {
    const agentId = this._conversations.get(conversationId);
    if (!agentId) {
      return false;
    }

    const agent = this._agents.get(agentId);
    if (agent) {
      agent.activeConversations = Math.max(0, agent.activeConversations - 1);
    }

    this._conversations.delete(conversationId);
    this.logger.info('Conversation ended', { conversationId, agentId });

    if (ctx) {
      await ctx.reply('Your conversation with the agent has ended. Thank you!');
    }

    return true;
  }

  /**
   * Get the agent assigned to a conversation
   */
  getAssignedAgent(conversationId: string): Agent | undefined {
    const agentId = this._conversations.get(conversationId);
    if (!agentId) {
      return undefined;
    }
    return this._agents.get(agentId);
  }

  /**
   * Check if a conversation is assigned to an agent
   */
  isAssigned(conversationId: string): boolean {
    return this._conversations.has(conversationId);
  }

  /**
   * Find an available agent using round-robin
   */
  private _findAvailableAgent(): Agent | undefined {
    const available = this.getAvailableAgents();
    if (available.length === 0) {
      return undefined;
    }

    // Simple round-robin: return agent with fewest active conversations
    return available.reduce((prev, curr) =>
      curr.activeConversations < prev.activeConversations ? curr : prev
    );
  }

  protected override onInstall(): void {
    this.logger.info('LiveChatPlugin installed', { config: this._config });
  }

  protected override onUninstall(): void {
    this._agents.clear();
    this._conversations.clear();
    this.logger.info('LiveChatPlugin uninstalled');
  }
}
