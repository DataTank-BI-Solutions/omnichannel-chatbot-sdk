import type { IContext, IMiddleware, MiddlewareFunction, NextFunction } from '../types/index.js';

/**
 * Compose multiple middleware functions into a single function
 */
export function compose(middlewares: MiddlewareFunction[]): MiddlewareFunction {
  return async (ctx: IContext, next: NextFunction): Promise<void> => {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      const middleware = middlewares[i];

      if (!middleware) {
        await next();
        return;
      }

      await middleware(ctx, () => dispatch(i + 1));
    };

    await dispatch(0);
  };
}

/**
 * Base middleware class for creating named middlewares
 */
export abstract class Middleware implements IMiddleware {
  public abstract readonly name: string;

  abstract process(ctx: IContext, next: NextFunction): Promise<void>;
}

/**
 * Logging middleware - logs all incoming messages
 */
export class LoggingMiddleware extends Middleware {
  public readonly name = 'LoggingMiddleware';

  async process(ctx: IContext, next: NextFunction): Promise<void> {
    const start = Date.now();

    console.log(`[${ctx.message.platform}] Incoming message from ${ctx.user.platformId}`);

    await next();

    const duration = Date.now() - start;
    console.log(`[${ctx.message.platform}] Processed in ${duration}ms`);
  }
}

/**
 * Error handling middleware - catches and handles errors
 */
export class ErrorHandlingMiddleware extends Middleware {
  public readonly name = 'ErrorHandlingMiddleware';

  private readonly _onError: ((ctx: IContext, error: Error) => Promise<void>) | undefined;

  constructor(onError?: (ctx: IContext, error: Error) => Promise<void>) {
    super();
    this._onError = onError;
  }

  async process(ctx: IContext, next: NextFunction): Promise<void> {
    try {
      await next();
    } catch (error) {
      if (this._onError && error instanceof Error) {
        await this._onError(ctx, error);
      } else {
        console.error('Unhandled error:', error);
        await ctx.reply('An error occurred. Please try again.');
      }
    }
  }
}

/**
 * Rate limiting middleware - limits messages per user
 */
export class RateLimitMiddleware extends Middleware {
  public readonly name = 'RateLimitMiddleware';

  private readonly _limit: number;
  private readonly _windowMs: number;
  private readonly _requests: Map<string, number[]> = new Map();

  constructor(options: { limit?: number; windowMs?: number } = {}) {
    super();
    this._limit = options.limit ?? 10;
    this._windowMs = options.windowMs ?? 60000; // 1 minute default
  }

  async process(ctx: IContext, next: NextFunction): Promise<void> {
    const userId = ctx.user.id;
    const now = Date.now();

    // Get or create request timestamps for user
    let timestamps = this._requests.get(userId) ?? [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter((ts) => now - ts < this._windowMs);

    if (timestamps.length >= this._limit) {
      await ctx.reply('Too many requests. Please slow down.');
      return;
    }

    // Add current timestamp
    timestamps.push(now);
    this._requests.set(userId, timestamps);

    await next();
  }
}
