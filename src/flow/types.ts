/**
 * Conversation flow types
 */

import type { IContext } from '../types/index.js';

/**
 * Flow context with navigation methods
 */
export interface FlowContext extends IContext {
  /**
   * Enter a specific scene
   * @param sceneId - Scene identifier to enter
   */
  enterScene(sceneId: string): Promise<void>;

  /**
   * Leave the current scene and return to normal routing
   */
  leaveScene(): Promise<void>;

  /**
   * Get the current scene ID
   */
  getCurrentScene(): string | undefined;

  /**
   * Get flow-specific state
   */
  flowState: FlowState;
}

/**
 * Flow state management
 */
export interface FlowState {
  /**
   * Get a value from flow state
   */
  get<T = unknown>(key: string): T | undefined;

  /**
   * Set a value in flow state
   */
  set<T = unknown>(key: string, value: T): void;

  /**
   * Delete a key from flow state
   */
  delete(key: string): void;

  /**
   * Clear all flow state
   */
  clear(): void;
}

/**
 * Scene handler function
 */
export type SceneHandler = (ctx: FlowContext) => Promise<void> | void;

/**
 * Scene leave handler function
 */
export type SceneLeaveHandler = (ctx: FlowContext) => Promise<void> | void;

/**
 * Scene configuration
 */
export interface SceneConfig {
  /** Scene unique identifier */
  id: string;

  /** Scene enter handler - called when entering the scene */
  onEnter?: SceneHandler;

  /** Scene message handler - called for every message in this scene */
  onMessage?: SceneHandler;

  /** Scene leave handler - called when leaving the scene */
  onLeave?: SceneLeaveHandler;

  /** TTL for scene in seconds (optional) */
  ttl?: number;
}

/**
 * Flow configuration
 */
export interface FlowConfig {
  /** Flow name/identifier */
  name: string;

  /** Initial scene to enter when flow starts */
  initialScene?: string;

  /** Default TTL for all scenes in seconds */
  defaultSceneTTL?: number;
}

/**
 * Active scene state
 */
export interface ActiveScene {
  /** Scene ID */
  sceneId: string;

  /** When the scene was entered */
  enteredAt: Date;

  /** When the scene expires (optional) */
  expiresAt?: Date;

  /** Scene-specific data */
  data: Record<string, unknown>;
}
