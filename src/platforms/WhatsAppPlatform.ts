import type { IChatbot, MessageResult, OutgoingMessage, WhatsAppConfig } from '../types/index.js';
import { BasePlatform } from './BasePlatform.js';

/**
 * WhatsApp platform adapter placeholder
 *
 * @remarks
 * This is a placeholder implementation. Full WhatsApp integration
 * with Baileys or Twilio will be implemented in a future update.
 */
export class WhatsAppPlatform extends BasePlatform {
  public readonly name = 'whatsapp' as const;
  public readonly version = '1.0.0';

  private readonly _config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    super();
    this._config = config;
  }

  protected async onInitialize(): Promise<void> {
    this._logger?.info('WhatsApp platform initialization - placeholder');
  }

  protected async onShutdown(): Promise<void> {
    this._logger?.info('WhatsApp platform shutdown - placeholder');
  }

  async sendMessage(_userId: string, _message: OutgoingMessage): Promise<MessageResult> {
    return {
      success: false,
      error: new Error('WhatsApp platform not yet implemented'),
    };
  }
}
