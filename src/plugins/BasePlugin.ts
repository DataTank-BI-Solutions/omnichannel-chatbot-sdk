import type { IChatbot, ILogger, IPlugin } from '../types/index.js';

/**
 * Base plugin class that provides common functionality for all plugins
 */
export abstract class BasePlugin implements IPlugin {
  public abstract readonly name: string;
  public abstract readonly version: string;

  protected _chatbot: IChatbot | undefined;
  protected _logger: ILogger | undefined;

  /**
   * Get the chatbot instance (throws if not installed)
   */
  protected get chatbot(): IChatbot {
    if (!this._chatbot) {
      throw new Error(`Plugin ${this.name} is not installed`);
    }
    return this._chatbot;
  }

  /**
   * Get the logger instance (throws if not installed)
   */
  protected get logger(): ILogger {
    if (!this._logger) {
      throw new Error(`Plugin ${this.name} is not installed`);
    }
    return this._logger;
  }

  /**
   * Install the plugin into a chatbot instance
   */
  install(chatbot: IChatbot): void | Promise<void> {
    this._chatbot = chatbot;
    this._logger = chatbot.logger.child({ plugin: this.name });
    this._logger.debug(`Installing plugin ${this.name}@${this.version}`);

    return this.onInstall();
  }

  /**
   * Uninstall the plugin
   */
  uninstall(): void | Promise<void> {
    this._logger?.debug(`Uninstalling plugin ${this.name}`);

    const result = this.onUninstall();

    this._chatbot = undefined;
    this._logger = undefined;

    return result;
  }

  /**
   * Override this method to perform plugin-specific installation logic
   */
  protected onInstall(): void | Promise<void> {
    // Default: no-op
  }

  /**
   * Override this method to perform plugin-specific cleanup logic
   */
  protected onUninstall(): void | Promise<void> {
    // Default: no-op
  }
}
