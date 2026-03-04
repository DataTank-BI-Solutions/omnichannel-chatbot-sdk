import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../core/Logger.js';
import type { IChatbot, ILogger } from '../types/index.js';
import { BasePlugin } from './BasePlugin.js';

// Concrete implementation for testing
class TestPlugin extends BasePlugin {
  public readonly name = 'TestPlugin';
  public readonly version = '1.0.0';
  public installCalled = false;
  public uninstallCalled = false;

  protected onInstall(): void {
    this.installCalled = true;
  }

  protected onUninstall(): void {
    this.uninstallCalled = true;
  }

  // Expose protected getters for testing
  public getChatbot(): IChatbot {
    return this.chatbot;
  }

  public getLogger(): ILogger {
    return this.logger;
  }
}

// Async plugin for testing async lifecycle
class AsyncPlugin extends BasePlugin {
  public readonly name = 'AsyncPlugin';
  public readonly version = '1.0.0';
  public installDelay = 0;
  public uninstallDelay = 0;

  protected async onInstall(): Promise<void> {
    if (this.installDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.installDelay));
    }
  }

  protected async onUninstall(): Promise<void> {
    if (this.uninstallDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.uninstallDelay));
    }
  }
}

describe('BasePlugin', () => {
  let plugin: TestPlugin;
  let mockChatbot: IChatbot;
  let mockLogger: ILogger;

  beforeEach(() => {
    plugin = new TestPlugin();

    mockLogger = new Logger({ level: 'info' });
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'child').mockReturnValue(mockLogger);

    mockChatbot = {
      config: {
        platforms: {},
      },
      platforms: new Map(),
      plugins: new Map(),
      router: {} as any,
      logger: mockLogger,
      use: vi.fn(),
      command: vi.fn(),
      on: vi.fn(),
      text: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      broadcast: vi.fn(),
    };
  });

  describe('properties', () => {
    it('should have name and version', () => {
      expect(plugin.name).toBe('TestPlugin');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('install', () => {
    it('should install plugin', () => {
      plugin.install(mockChatbot);

      expect(plugin.installCalled).toBe(true);
    });

    it('should set chatbot instance', () => {
      plugin.install(mockChatbot);

      expect(plugin.getChatbot()).toBe(mockChatbot);
    });

    it('should create child logger with plugin metadata', () => {
      plugin.install(mockChatbot);

      expect(mockLogger.child).toHaveBeenCalledWith({ plugin: 'TestPlugin' });
      expect(plugin.getLogger()).toBe(mockLogger);
    });

    it('should log installation', () => {
      plugin.install(mockChatbot);

      expect(mockLogger.debug).toHaveBeenCalledWith('Installing plugin TestPlugin@1.0.0');
    });

    it('should call onInstall hook', () => {
      const onInstallSpy = vi.spyOn(plugin as any, 'onInstall');

      plugin.install(mockChatbot);

      expect(onInstallSpy).toHaveBeenCalledOnce();
    });

    it('should support async onInstall', async () => {
      const asyncPlugin = new AsyncPlugin();
      asyncPlugin.installDelay = 10;

      const promise = asyncPlugin.install(mockChatbot);

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  describe('uninstall', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should uninstall plugin', () => {
      plugin.uninstall();

      expect(plugin.uninstallCalled).toBe(true);
    });

    it('should log uninstallation', () => {
      plugin.uninstall();

      expect(mockLogger.debug).toHaveBeenCalledWith('Uninstalling plugin TestPlugin');
    });

    it('should call onUninstall hook', () => {
      const onUninstallSpy = vi.spyOn(plugin as any, 'onUninstall');

      plugin.uninstall();

      expect(onUninstallSpy).toHaveBeenCalledOnce();
    });

    it('should clear chatbot instance', () => {
      plugin.uninstall();

      expect(() => plugin.getChatbot()).toThrow('Plugin TestPlugin is not installed');
    });

    it('should clear logger instance', () => {
      plugin.uninstall();

      expect(() => plugin.getLogger()).toThrow('Plugin TestPlugin is not installed');
    });

    it('should support async onUninstall', async () => {
      const asyncPlugin = new AsyncPlugin();
      asyncPlugin.install(mockChatbot);
      asyncPlugin.uninstallDelay = 10;

      const promise = asyncPlugin.uninstall();

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  describe('chatbot getter', () => {
    it('should throw error if plugin not installed', () => {
      expect(() => plugin.getChatbot()).toThrow('Plugin TestPlugin is not installed');
    });

    it('should return chatbot instance after install', () => {
      plugin.install(mockChatbot);

      expect(plugin.getChatbot()).toBe(mockChatbot);
    });

    it('should throw error after uninstall', () => {
      plugin.install(mockChatbot);
      plugin.uninstall();

      expect(() => plugin.getChatbot()).toThrow('Plugin TestPlugin is not installed');
    });
  });

  describe('logger getter', () => {
    it('should throw error if plugin not installed', () => {
      expect(() => plugin.getLogger()).toThrow('Plugin TestPlugin is not installed');
    });

    it('should return logger instance after install', () => {
      plugin.install(mockChatbot);

      expect(plugin.getLogger()).toBeDefined();
    });

    it('should throw error after uninstall', () => {
      plugin.install(mockChatbot);
      plugin.uninstall();

      expect(() => plugin.getLogger()).toThrow('Plugin TestPlugin is not installed');
    });
  });

  describe('lifecycle hooks', () => {
    it('should have default no-op onInstall', () => {
      class MinimalPlugin extends BasePlugin {
        public readonly name = 'MinimalPlugin';
        public readonly version = '1.0.0';
        // No onInstall override
      }

      const minimal = new MinimalPlugin();

      expect(() => minimal.install(mockChatbot)).not.toThrow();
    });

    it('should have default no-op onUninstall', () => {
      class MinimalPlugin extends BasePlugin {
        public readonly name = 'MinimalPlugin';
        public readonly version = '1.0.0';
        // No onUninstall override
      }

      const minimal = new MinimalPlugin();
      minimal.install(mockChatbot);

      expect(() => minimal.uninstall()).not.toThrow();
    });

    it('should support returning void from hooks', () => {
      class SyncPlugin extends BasePlugin {
        public readonly name = 'SyncPlugin';
        public readonly version = '1.0.0';

        protected onInstall(): void {
          // Synchronous install
        }

        protected onUninstall(): void {
          // Synchronous uninstall
        }
      }

      const sync = new SyncPlugin();

      const installResult = sync.install(mockChatbot);
      expect(installResult).toBeUndefined();

      const uninstallResult = sync.uninstall();
      expect(uninstallResult).toBeUndefined();
    });

    it('should support returning Promise from hooks', async () => {
      class AsyncPlugin extends BasePlugin {
        public readonly name = 'AsyncPlugin';
        public readonly version = '1.0.0';

        protected async onInstall(): Promise<void> {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }

        protected async onUninstall(): Promise<void> {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      const async = new AsyncPlugin();

      const installResult = async.install(mockChatbot);
      expect(installResult).toBeInstanceOf(Promise);
      await installResult;

      const uninstallResult = async.uninstall();
      expect(uninstallResult).toBeInstanceOf(Promise);
      await uninstallResult;
    });
  });

  describe('multiple install/uninstall cycles', () => {
    it('should support reinstalling plugin', () => {
      plugin.install(mockChatbot);
      plugin.uninstall();
      plugin.install(mockChatbot);

      expect(plugin.getChatbot()).toBe(mockChatbot);
      expect(plugin.getLogger()).toBeDefined();
    });

    it('should increment install/uninstall call counts', () => {
      plugin.install(mockChatbot);
      plugin.uninstall();
      plugin.install(mockChatbot);
      plugin.uninstall();

      expect(plugin.installCalled).toBe(true);
      expect(plugin.uninstallCalled).toBe(true);
    });
  });
});
