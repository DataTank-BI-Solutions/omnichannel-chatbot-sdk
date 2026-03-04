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
 *
 * @remarks
 * Context provides access to the incoming message, user info, conversation state,
 * and convenient methods for replying to the user.
 *
 * @example
 * ```typescript
 * bot.command('start', async (ctx) => {
 *   // Access message data
 *   console.log(ctx.message.text);
 *   console.log(ctx.user.firstName);
 *
 *   // Use state for session data
 *   ctx.state.set('language', 'en');
 *
 *   // Reply to user
 *   await ctx.reply('Hello!');
 * });
 * ```
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
   *
   * @param message - Text string or structured message object
   * @returns Promise resolving to the message send result
   *
   * @example
   * ```typescript
   * // Simple text reply
   * await ctx.reply('Hello!');
   *
   * // Structured message
   * await ctx.reply({
   *   type: 'text',
   *   text: 'Choose an option:',
   *   buttons: [
   *     { type: 'callback', text: 'Option 1', callbackData: 'opt1' }
   *   ]
   * });
   * ```
   */
  async reply(message: string | OutgoingMessage): Promise<MessageResult> {
    const outgoing: OutgoingMessage =
      typeof message === 'string' ? { type: 'text', text: message } : message;

    return this.platform.sendMessage(this.user.platformId, outgoing);
  }

  /**
   * Reply with a media attachment
   *
   * @param media - Media attachment (image, video, audio, or document)
   * @returns Promise resolving to the message send result
   *
   * @example
   * ```typescript
   * await ctx.replyWithMedia({
   *   type: 'image',
   *   url: 'https://example.com/image.jpg',
   *   caption: 'Check this out!'
   * });
   * ```
   */
  async replyWithMedia(media: MediaAttachment): Promise<MessageResult> {
    return this.platform.sendMessage(this.user.platformId, {
      type: media.type,
      media,
    });
  }

  /**
   * Reply with buttons/inline keyboard
   *
   * @param text - Message text to display above buttons
   * @param buttons - Array of button objects
   * @returns Promise resolving to the message send result
   *
   * @example
   * ```typescript
   * await ctx.replyWithButtons('Choose your language:', [
   *   { type: 'callback', text: 'English', callbackData: 'lang_en' },
   *   { type: 'callback', text: 'Español', callbackData: 'lang_es' },
   *   { type: 'url', text: 'Visit Website', url: 'https://example.com' }
   * ]);
   * ```
   */
  async replyWithButtons(text: string, buttons: MessageButton[]): Promise<MessageResult> {
    return this.platform.sendMessage(this.user.platformId, {
      type: 'text',
      text,
      buttons,
    });
  }
}
