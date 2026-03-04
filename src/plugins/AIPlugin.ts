import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IContext } from '../types/index.js';
import { BasePlugin } from './BasePlugin.js';

/**
 * AI provider type
 */
export type AIProvider = 'gemini' | 'openai' | 'anthropic';

/**
 * Conversation turn
 */
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Intent definition
 */
export interface Intent {
  name: string;
  keywords: string[];
  description: string;
}

/**
 * AI response
 */
export interface AIResponse {
  text: string;
  intent?: string;
  confidence?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI plugin configuration
 */
export interface AIPluginConfig {
  /**
   * Feature toggle key
   * @default 'ai_responses'
   */
  featureKey?: string;

  /**
   * AI provider
   * @default 'gemini'
   */
  provider?: AIProvider;

  /**
   * API key for the AI provider
   */
  apiKey: string;

  /**
   * Model to use
   * @default 'gemini-2.0-flash-exp' for Gemini
   */
  model?: string;

  /**
   * Maximum tokens to generate
   * @default 1000
   */
  maxTokens?: number;

  /**
   * Temperature for response generation (0-1)
   * @default 0.7
   */
  temperature?: number;

  /**
   * System prompt for the AI
   */
  systemPrompt?: string;

  /**
   * Intent detection configuration
   */
  intents?: {
    enabled?: boolean;
    builtIn?: string[];
    custom?: Intent[];
  };

  /**
   * Response formatting
   */
  formatting?: {
    maxLength?: number;
    includeEmoji?: boolean;
    tone?: 'friendly' | 'professional' | 'casual';
  };

  /**
   * Conversation memory configuration
   */
  memory?: {
    enabled?: boolean;
    maxTurns?: number;
    ttlMinutes?: number;
  };

  /**
   * Fallback configuration
   */
  fallback?: {
    message?: string;
    enabled?: boolean;
  };
}

/**
 * AI plugin for intelligent response generation
 *
 * @remarks
 * This plugin enables AI-powered responses using various AI providers.
 * Currently supports Gemini, with OpenAI and Anthropic support planned.
 *
 * @example
 * ```typescript
 * const ai = new AIPlugin({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY,
 *   model: 'gemini-2.0-flash-exp',
 *   systemPrompt: 'You are a helpful assistant.',
 *   memory: {
 *     enabled: true,
 *     maxTurns: 10,
 *   },
 * });
 *
 * bot.use(ai);
 * ```
 */
export class AIPlugin extends BasePlugin {
  public readonly name = 'AIPlugin';
  public readonly version = '1.0.0';

  private readonly _config: Required<AIPluginConfig>;
  private _geminiClient?: GoogleGenerativeAI;
  private readonly _conversationHistory: Map<string, ConversationTurn[]> = new Map();
  private readonly _builtInIntents: Intent[] = [
    {
      name: 'greeting',
      keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      description: 'User greeting',
    },
    {
      name: 'farewell',
      keywords: ['bye', 'goodbye', 'see you', 'take care', 'farewell'],
      description: 'User saying goodbye',
    },
    {
      name: 'human_support',
      keywords: ['agent', 'human', 'support', 'help', 'talk to person', 'representative'],
      description: 'User requesting human support',
    },
    {
      name: 'general_inquiry',
      keywords: ['what', 'how', 'when', 'where', 'why', 'who', 'tell me', 'explain'],
      description: 'General question or inquiry',
    },
  ];

  constructor(config: AIPluginConfig) {
    super();
    this._config = {
      featureKey: config.featureKey ?? 'ai_responses',
      provider: config.provider ?? 'gemini',
      apiKey: config.apiKey,
      model: config.model ?? 'gemini-2.0-flash-exp',
      maxTokens: config.maxTokens ?? 1000,
      temperature: config.temperature ?? 0.7,
      systemPrompt: config.systemPrompt ?? 'You are a helpful and friendly AI assistant.',
      intents: {
        enabled: config.intents?.enabled ?? true,
        builtIn: config.intents?.builtIn ?? [
          'greeting',
          'farewell',
          'human_support',
          'general_inquiry',
        ],
        custom: config.intents?.custom ?? [],
      },
      formatting: {
        maxLength: config.formatting?.maxLength ?? 1000,
        includeEmoji: config.formatting?.includeEmoji ?? false,
        tone: config.formatting?.tone ?? 'friendly',
      },
      memory: {
        enabled: config.memory?.enabled ?? true,
        maxTurns: config.memory?.maxTurns ?? 10,
        ttlMinutes: config.memory?.ttlMinutes ?? 30,
      },
      fallback: {
        message:
          config.fallback?.message ??
          'I apologize, but I am unable to process your request at the moment. Please try again later.',
        enabled: config.fallback?.enabled ?? true,
      },
    };
  }

  /**
   * Generate a response for a user message
   */
  async generateResponse(ctx: IContext): Promise<AIResponse> {
    const userMessage = ctx.message.text ?? '';

    if (!userMessage) {
      return {
        text: 'I did not receive a message. Please try again.',
      };
    }

    try {
      // Detect intent if enabled
      let intent: string | undefined;
      let confidence: number | undefined;

      if (this._config.intents.enabled) {
        const detected = this._detectIntent(userMessage);
        intent = detected.intent;
        confidence = detected.confidence;
      }

      // Get conversation history
      const history = this._getConversationHistory(ctx.conversation.id);

      // Generate response based on provider
      let response: AIResponse;

      switch (this._config.provider) {
        case 'gemini':
          response = await this._generateGeminiResponse(userMessage, history);
          break;
        case 'openai':
          throw new Error('OpenAI provider not yet implemented');
        case 'anthropic':
          throw new Error('Anthropic provider not yet implemented');
        default:
          throw new Error(`Unknown AI provider: ${this._config.provider}`);
      }

      // Add intent and confidence to response
      response.intent = intent;
      response.confidence = confidence;

      // Store in conversation history
      if (this._config.memory.enabled) {
        this._addToHistory(ctx.conversation.id, 'user', userMessage);
        this._addToHistory(ctx.conversation.id, 'assistant', response.text);
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to generate AI response', {
        error,
        userId: ctx.user.id,
      });

      if (this._config.fallback.enabled) {
        return {
          text:
            this._config.fallback.message ??
            'I apologize, but I am unable to process your request at the moment.',
        };
      }

      throw error;
    }
  }

  /**
   * Generate a streaming response (not fully implemented yet)
   */
  async generateStreamingResponse(
    ctx: IContext,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    const userMessage = ctx.message.text ?? '';

    if (!userMessage) {
      return {
        text: 'I did not receive a message. Please try again.',
      };
    }

    try {
      const history = this._getConversationHistory(ctx.conversation.id);

      if (this._config.provider === 'gemini') {
        return await this._generateGeminiStreamingResponse(userMessage, history, onChunk);
      }

      // For now, fall back to regular generation for other providers
      return await this.generateResponse(ctx);
    } catch (error) {
      this.logger.error('Failed to generate streaming response', {
        error,
        userId: ctx.user.id,
      });

      if (this._config.fallback.enabled) {
        return {
          text:
            this._config.fallback.message ??
            'I apologize, but I am unable to process your request at the moment.',
        };
      }

      throw error;
    }
  }

  /**
   * Clear conversation history for a conversation
   */
  clearHistory(conversationId: string): void {
    this._conversationHistory.delete(conversationId);
    this.logger.debug('Cleared conversation history', { conversationId });
  }

  /**
   * Get conversation history for a conversation
   */
  getHistory(conversationId: string): ConversationTurn[] {
    return this._conversationHistory.get(conversationId) ?? [];
  }

  /**
   * Detect intent from user message
   */
  private _detectIntent(message: string): {
    intent?: string;
    confidence: number;
  } {
    const messageLower = message.toLowerCase();

    // Get all intents (built-in + custom)
    const allIntents = [
      ...this._builtInIntents.filter((intent) =>
        this._config.intents.builtIn?.includes(intent.name)
      ),
      ...(this._config.intents.custom ?? []),
    ];

    // Find matching intents
    let bestMatch: { intent: string; score: number } | undefined;

    for (const intent of allIntents) {
      let score = 0;

      for (const keyword of intent.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (messageLower.includes(keywordLower)) {
          // Calculate score based on keyword match
          score += keywordLower.length / messageLower.length;
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { intent: intent.name, score };
      }
    }

    if (bestMatch) {
      return {
        intent: bestMatch.intent,
        confidence: Math.min(bestMatch.score, 1.0),
      };
    }

    return { confidence: 0 };
  }

  /**
   * Get conversation history
   */
  private _getConversationHistory(conversationId: string): ConversationTurn[] {
    return this._conversationHistory.get(conversationId) ?? [];
  }

  /**
   * Add turn to conversation history
   */
  private _addToHistory(conversationId: string, role: 'user' | 'assistant', content: string): void {
    const history = this._conversationHistory.get(conversationId) ?? [];

    history.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Limit history size
    const maxTurns = this._config.memory.maxTurns ?? 10;
    if (history.length > maxTurns * 2) {
      // Keep only recent turns
      history.splice(0, history.length - maxTurns * 2);
    }

    this._conversationHistory.set(conversationId, history);

    // Schedule cleanup
    this._scheduleHistoryCleanup(conversationId);
  }

  /**
   * Schedule history cleanup based on TTL
   */
  private _scheduleHistoryCleanup(conversationId: string): void {
    const ttlMs = (this._config.memory.ttlMinutes ?? 30) * 60 * 1000;

    setTimeout(() => {
      const history = this._conversationHistory.get(conversationId);
      if (!history || history.length === 0) {
        return;
      }

      const lastTurn = history[history.length - 1];
      if (!lastTurn) {
        return;
      }

      const age = Date.now() - lastTurn.timestamp.getTime();

      if (age >= ttlMs) {
        this._conversationHistory.delete(conversationId);
        this.logger.debug('Cleaned up conversation history', {
          conversationId,
        });
      }
    }, ttlMs);
  }

  /**
   * Generate response using Gemini
   */
  private async _generateGeminiResponse(
    prompt: string,
    history: ConversationTurn[]
  ): Promise<AIResponse> {
    if (!this._geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    const model = this._geminiClient.getGenerativeModel({
      model: this._config.model,
    });

    // Build conversation context
    const conversationContext = history.map((turn) => `${turn.role}: ${turn.content}`).join('\n');

    // Build system prompt with formatting instructions
    let systemPrompt = this._config.systemPrompt ?? '';

    if (this._config.formatting.tone) {
      systemPrompt += `\n\nTone: ${this._config.formatting.tone}`;
    }

    if (this._config.formatting.maxLength) {
      systemPrompt += `\n\nKeep responses under ${this._config.formatting.maxLength} characters.`;
    }

    if (!this._config.formatting.includeEmoji) {
      systemPrompt += '\n\nDo not use emojis in responses.';
    }

    // Build final prompt
    const fullPrompt = `${systemPrompt}\n\n${
      conversationContext ? `Conversation history:\n${conversationContext}\n\n` : ''
    }User: ${prompt}\n\nAssistant:`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // Extract usage information if available
    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined;

    return {
      text: text.trim(),
      usage,
    };
  }

  /**
   * Generate streaming response using Gemini
   */
  private async _generateGeminiStreamingResponse(
    prompt: string,
    history: ConversationTurn[],
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    if (!this._geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    const model = this._geminiClient.getGenerativeModel({
      model: this._config.model,
    });

    // Build conversation context
    const conversationContext = history.map((turn) => `${turn.role}: ${turn.content}`).join('\n');

    // Build system prompt
    let systemPrompt = this._config.systemPrompt ?? '';

    if (this._config.formatting.tone) {
      systemPrompt += `\n\nTone: ${this._config.formatting.tone}`;
    }

    if (this._config.formatting.maxLength) {
      systemPrompt += `\n\nKeep responses under ${this._config.formatting.maxLength} characters.`;
    }

    // Build final prompt
    const fullPrompt = `${systemPrompt}\n\n${
      conversationContext ? `Conversation history:\n${conversationContext}\n\n` : ''
    }User: ${prompt}\n\nAssistant:`;

    const result = await model.generateContentStream(fullPrompt);

    let fullText = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;

      if (onChunk) {
        onChunk(chunkText);
      }
    }

    const finalResponse = await result.response;

    const usage = finalResponse.usageMetadata
      ? {
          promptTokens: finalResponse.usageMetadata.promptTokenCount ?? 0,
          completionTokens: finalResponse.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: finalResponse.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined;

    return {
      text: fullText.trim(),
      usage,
    };
  }

  protected override onInstall(): void {
    // Initialize AI provider client
    if (this._config.provider === 'gemini') {
      this._geminiClient = new GoogleGenerativeAI(this._config.apiKey);
      this.logger.info('Gemini client initialized');
    }

    this.logger.info('AIPlugin installed', {
      provider: this._config.provider,
      model: this._config.model,
    });
  }

  protected override onUninstall(): void {
    this._conversationHistory.clear();
    this._geminiClient = undefined;
    this.logger.info('AIPlugin uninstalled');
  }
}
