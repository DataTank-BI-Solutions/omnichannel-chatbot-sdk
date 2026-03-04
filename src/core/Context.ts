import { nanoid } from 'nanoid';
import type {
  ContextState,
  Conversation,
  IContext,
  IPlatform,
  IncomingMessage,
  MediaAttachment,
  MessageButton,
  MessageResult,
  OutgoingMessage,
  User,
} from '../types/index.js';

/**
 * Simple state container for context
 */
class StateContainer implements ContextState {
  private readonly _data: Map<string, unknown> = new Map();

  get<T>(key: string): T | undefined {
    return this._data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this._data.set(key, value);
  }

  delete(key: string): void {
    this._data.delete(key);
  }

  clear(): void {
    this._data.clear();
  }
}

/**
 * Context class representing a single message interaction
 */
export class Context implements IContext {
  public readonly id: string;
  public readonly message: IncomingMessage;
  public readonly platform: IPlatform;
  public readonly user: User;
  public readonly conversation: Conversation;
  public readonly state: ContextState;

  constructor(
    message: IncomingMessage,
    platform: IPlatform,
    user: User,
    conversation: Conversation
  ) {
    this.id = nanoid();
    this.message = message;
    this.platform = platform;
    this.user = user;
    this.conversation = conversation;
    this.state = new StateContainer();
  }

  /**
   * Reply to the user with a text message or structured message
   */
  async reply(message: string | OutgoingMessage): Promise<MessageResult> {
    const outgoing: OutgoingMessage =
      typeof message === 'string' ? { type: 'text', text: message } : message;

    return this.platform.sendMessage(this.user.platformId, outgoing);
  }

  /**
   * Reply with a media attachment
   */
  async replyWithMedia(media: MediaAttachment): Promise<MessageResult> {
    return this.platform.sendMessage(this.user.platformId, {
      type: media.type,
      media,
    });
  }

  /**
   * Reply with buttons/inline keyboard
   */
  async replyWithButtons(text: string, buttons: MessageButton[]): Promise<MessageResult> {
    return this.platform.sendMessage(this.user.platformId, {
      type: 'text',
      text,
      buttons,
    });
  }
}
