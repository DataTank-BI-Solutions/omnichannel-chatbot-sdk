import type {
  IContext,
  IMiddleware,
  IRouter,
  MessageType,
  MiddlewareFunction,
  RouteHandler,
  RouteMatch,
} from '../types/index.js';

interface Route {
  type: 'command' | 'text' | 'event';
  pattern: string | RegExp;
  handler: RouteHandler;
}

/**
 * Router class for handling message routing
 */
export class Router implements IRouter {
  private readonly _routes: Route[] = [];
  private readonly _middlewares: MiddlewareFunction[] = [];

  /**
   * Register a command handler (e.g., /start, /help)
   */
  command(command: string, handler: RouteHandler): void {
    // Normalize command (remove leading slash if present)
    const normalizedCommand = command.startsWith('/') ? command.slice(1) : command;

    this._routes.push({
      type: 'command',
      pattern: normalizedCommand,
      handler,
    });
  }

  /**
   * Register a text pattern handler
   */
  text(pattern: string | RegExp, handler: RouteHandler): void {
    this._routes.push({
      type: 'text',
      pattern,
      handler,
    });
  }

  /**
   * Register an event handler for specific message types
   */
  on(event: MessageType, handler: RouteHandler): void {
    this._routes.push({
      type: 'event',
      pattern: event,
      handler,
    });
  }

  /**
   * Register middleware
   */
  use(middleware: MiddlewareFunction | IMiddleware): void {
    if (typeof middleware === 'function') {
      this._middlewares.push(middleware);
    } else {
      this._middlewares.push(middleware.process.bind(middleware));
    }
  }

  /**
   * Get all registered middlewares
   */
  get middlewares(): MiddlewareFunction[] {
    return [...this._middlewares];
  }

  /**
   * Match a context against registered routes
   */
  match(ctx: IContext): RouteMatch | undefined {
    const message = ctx.message;
    const text = message.text ?? '';

    for (const route of this._routes) {
      const params: Record<string, string> = {};

      if (route.type === 'command') {
        // Check if message starts with /command
        const commandPattern = route.pattern as string;
        if (text.startsWith(`/${commandPattern}`)) {
          // Extract arguments after the command
          const args = text.slice(commandPattern.length + 2).trim();
          if (args) {
            // biome-ignore lint/complexity/useLiteralKeys: TS requires bracket notation for index signatures
            params['args'] = args;
          }
          return { handler: route.handler, params };
        }
      }

      if (route.type === 'text') {
        if (typeof route.pattern === 'string') {
          // Exact match
          if (text === route.pattern) {
            return { handler: route.handler, params };
          }
        } else {
          // Regex match
          const match = text.match(route.pattern);
          if (match) {
            // Add named groups to params
            if (match.groups) {
              Object.assign(params, match.groups);
            }
            // Add numbered groups
            match.slice(1).forEach((value, index) => {
              params[`$${index + 1}`] = value;
            });
            return { handler: route.handler, params };
          }
        }
      }

      if (route.type === 'event') {
        // Match message type
        if (message.type === route.pattern) {
          return { handler: route.handler, params };
        }
      }
    }

    return undefined;
  }
}
