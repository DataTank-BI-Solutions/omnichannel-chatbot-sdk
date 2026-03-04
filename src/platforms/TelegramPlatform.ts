import { Bot, type Context as GrammyContext, webhookCallback } from 'grammy';
import type { IChatbot } from '../types/index.js';
import type {
  IncomingMessage,
  MessageResult,
  OutgoingMessage,
  TelegramConfig,
} from '../types/index.js';
import { BasePlatform } from './BasePlatform.js';

/**
 * Telegram platform adapter using grammY
 *
 * @remarks
 * This adapter provides Telegram integration with support for both
 * webhook and polling modes.
 *
 * @example
 * ```typescript
 * const telegram = new TelegramPlatform({
 *   enabled: true,
 *   token: process.env.TELEGRAM_TOKEN!,
 *   useWebhook: false,
 * });
 *
 * telegram.setLogger(logger);
 * telegram.setChatbot(chatbot);
 * await telegram.initialize();
 * ```
 */
export class TelegramPlatform extends BasePlatform {
  public readonly name = 'telegram' as const;
  public readonly version = '1.0.0';

  private readonly _config: TelegramConfig;
  private _bot?: Bot;
  private _chatbot?: IChatbot;

  constructor(config: TelegramConfig) {
    super();
    this._config = config;
  }

  /**
   * Set the chatbot instance for message handling
   */
  setChatbot(chatbot: IChatbot): void {
    this._chatbot = chatbot;
  }

  /**
   * Get the webhook callback for Express/HTTP servers
   */
  getWebhookCallback() {
    if (!this._bot) {
      throw new Error('Telegram bot not initialized');
    }
    return webhookCallback(this._bot, 'express');
  }

  /**
   * Initialize the Telegram bot
   */
  protected async onInitialize(): Promise<void> {
    this._bot = new Bot(this._config.token);

    // Set up message handler
    this._bot.on('message', async (ctx) => {
      await this._handleIncomingMessage(ctx);
    });

    // Start bot in appropriate mode
    if (this._config.useWebhook && this._config.webhookUrl) {
      await this._bot.api.setWebhook(this._config.webhookUrl);
      this._logger?.info('Telegram webhook set', {
        url: this._config.webhookUrl,
      });
    } else {
      // Start polling
      this._bot.start({
        onStart: () => {
          this._logger?.info('Telegram polling started');
        },
      });
    }
  }

  /**
   * Shutdown the Telegram bot
   */
  protected async onShutdown(): Promise<void> {
    if (this._bot) {
      await this._bot.stop();
      this._bot = undefined;
      this._logger?.info('Telegram bot stopped');
    }
  }

  /**
   * Send a message to a Telegram user
   */
  async sendMessage(userId: string, message: OutgoingMessage): Promise<MessageResult> {
    if (!this._bot) {
      return {
        success: false,
        error: new Error('Telegram bot not initialized'),
      };
    }

    try {
      const chatId = Number.parseInt(userId, 10);

      switch (message.type) {
        case 'text': {
          const result = await this._bot.api.sendMessage(chatId, message.text || '', {
            reply_markup: message.buttons ? this._buildKeyboard(message.buttons) : undefined,
          });
          return {
            success: true,
            messageId: result.message_id.toString(),
          };
        }

        case 'image': {
          if (!message.media?.url) {
            return {
              success: false,
              error: new Error('Image URL is required'),
            };
          }
          const result = await this._bot.api.sendPhoto(chatId, message.media.url, {
            caption: message.text,
            reply_markup: message.buttons ? this._buildKeyboard(message.buttons) : undefined,
          });
          return {
            success: true,
            messageId: result.message_id.toString(),
          };
        }

        case 'video': {
          if (!message.media?.url) {
            return {
              success: false,
              error: new Error('Video URL is required'),
            };
          }
          const result = await this._bot.api.sendVideo(chatId, message.media.url, {
            caption: message.text,
            reply_markup: message.buttons ? this._buildKeyboard(message.buttons) : undefined,
          });
          return {
            success: true,
            messageId: result.message_id.toString(),
          };
        }

        case 'document': {
          if (!message.media?.url) {
            return {
              success: false,
              error: new Error('Document URL is required'),
            };
          }
          const result = await this._bot.api.sendDocument(chatId, message.media.url, {
            caption: message.text,
            reply_markup: message.buttons ? this._buildKeyboard(message.buttons) : undefined,
          });
          return {
            success: true,
            messageId: result.message_id.toString(),
          };
        }

        case 'audio': {
          if (!message.media?.url) {
            return {
              success: false,
              error: new Error('Audio URL is required'),
            };
          }
          const result = await this._bot.api.sendAudio(chatId, message.media.url, {
            caption: message.text,
            reply_markup: message.buttons ? this._buildKeyboard(message.buttons) : undefined,
          });
          return {
            success: true,
            messageId: result.message_id.toString(),
          };
        }

        case 'location': {
          if (!message.location) {
            return {
              success: false,
              error: new Error('Location is required'),
            };
          }
          const result = await this._bot.api.sendLocation(
            chatId,
            message.location.latitude,
            message.location.longitude
          );
          return {
            success: true,
            messageId: result.message_id.toString(),
          };
        }

        default:
          return {
            success: false,
            error: new Error(`Unsupported message type: ${message.type}`),
          };
      }
    } catch (error) {
      this._logger?.error('Failed to send Telegram message', { error, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Handle incoming Telegram messages
   */
  private async _handleIncomingMessage(ctx: GrammyContext): Promise<void> {
    if (!this._chatbot || !ctx.message || !ctx.from) {
      return;
    }

    try {
      const message = this._normalizeMessage(ctx);
      // handleMessage is not in IChatbot interface but exists in Chatbot class
      await (this._chatbot as any).handleMessage(message, this);
    } catch (error) {
      this._logger?.error('Error handling Telegram message', { error });
    }
  }

  /**
   * Normalize Telegram message to SDK format
   */
  private _normalizeMessage(ctx: GrammyContext): IncomingMessage {
    const msg = ctx.message;
    const from = ctx.from;

    if (!msg || !from) {
      throw new Error('Invalid Telegram message context');
    }

    const baseMessage: IncomingMessage = {
      id: msg.message_id.toString(),
      platform: 'telegram',
      userId: from.id.toString(),
      chatId: msg.chat.id.toString(),
      type: 'text',
      timestamp: new Date(msg.date * 1000),
      raw: msg,
    };

    // Handle text messages
    if ('text' in msg && msg.text) {
      return {
        ...baseMessage,
        type: 'text',
        text: msg.text,
      };
    }

    // Handle photo messages
    if ('photo' in msg && msg.photo && msg.photo.length > 0) {
      const photo = msg.photo[msg.photo.length - 1];
      return {
        ...baseMessage,
        type: 'image',
        text: msg.caption,
        media: {
          type: 'image',
          url: photo?.file_id,
          mimeType: 'image/jpeg',
        },
      };
    }

    // Handle video messages
    if ('video' in msg && msg.video) {
      return {
        ...baseMessage,
        type: 'video',
        text: msg.caption,
        media: {
          type: 'video',
          url: msg.video.file_id,
          mimeType: msg.video.mime_type,
        },
      };
    }

    // Handle document messages
    if ('document' in msg && msg.document) {
      return {
        ...baseMessage,
        type: 'document',
        text: msg.caption,
        media: {
          type: 'document',
          url: msg.document.file_id,
          mimeType: msg.document.mime_type,
          filename: msg.document.file_name,
        },
      };
    }

    // Handle audio messages
    if ('audio' in msg && msg.audio) {
      return {
        ...baseMessage,
        type: 'audio',
        text: msg.caption,
        media: {
          type: 'audio',
          url: msg.audio.file_id,
          mimeType: msg.audio.mime_type,
        },
      };
    }

    // Handle location messages
    if ('location' in msg && msg.location) {
      return {
        ...baseMessage,
        type: 'location',
        location: {
          latitude: msg.location.latitude,
          longitude: msg.location.longitude,
        },
      };
    }

    // Handle contact messages
    if ('contact' in msg && msg.contact) {
      return {
        ...baseMessage,
        type: 'contact',
        contact: {
          name: `${msg.contact.first_name} ${msg.contact.last_name || ''}`.trim(),
          phoneNumber: msg.contact.phone_number,
        },
      };
    }

    // Default to text message
    return {
      ...baseMessage,
      type: 'text',
      text: msg.caption || '',
    };
  }

  /**
   * Build Telegram keyboard from buttons
   */
  private _buildKeyboard(buttons: Array<{ text: string; url?: string; data?: string }>) {
    return {
      inline_keyboard: [
        buttons.map((btn) => {
          if (btn.url) {
            return { text: btn.text, url: btn.url };
          }
          return { text: btn.text, callback_data: btn.data || btn.text };
        }),
      ],
    } as any; // Type is complex, cast to any
  }
}
