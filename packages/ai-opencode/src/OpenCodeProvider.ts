import {
  AIProvider,
  type AIProviderConfig,
  type ChatOptions,
  type ContentBlock,
  type Message,
  type StreamChunk,
} from '@clippyjs/ai';
import {
  createOpencode,
  createOpencodeClient,
} from '@opencode-ai/sdk';

interface OpenCodeResult<T> {
  data?: T;
}

interface OpenCodeSession {
  id: string;
}

interface OpenCodePart {
  type: string;
  text?: string;
}

interface OpenCodePromptResult {
  parts?: OpenCodePart[];
}

interface OpenCodeClient {
  global?: {
    health: () => Promise<unknown>;
  };
  session: {
    create: (options: {
      body: { title: string };
    }) => Promise<OpenCodeSession | OpenCodeResult<OpenCodeSession>>;
    prompt: (options: {
      path: { id: string };
      body: {
        model?: {
          providerID: string;
          modelID: string;
        };
        parts: Array<{
          type: 'text';
          text: string;
        }>;
      };
    }) => Promise<OpenCodePromptResult | OpenCodeResult<OpenCodePromptResult>>;
    delete?: (options: {
      path: { id: string };
    }) => Promise<unknown>;
  };
}

interface ManagedOpenCodeServer {
  url: string;
  close: () => void | Promise<void>;
}

/**
 * OpenCode-specific initialization options.
 *
 * These values can be passed alongside the standard AIProviderConfig fields.
 */
export interface OpenCodeProviderConfig extends AIProviderConfig {
  /** Host used when this provider starts a managed OpenCode server. */
  hostname?: string;
  /** Port used when this provider starts a managed OpenCode server. */
  port?: number;
  /** Maximum time to wait for a managed server to start. */
  serverStartTimeout?: number;
  /** Abort signal used while starting a managed server. */
  signal?: AbortSignal;
  /** Optional fetch implementation for an existing server client. */
  fetch?: typeof globalThis.fetch;
  /** Title assigned to ephemeral OpenCode sessions. */
  sessionTitle?: string;
}

/**
 * AI provider backed by the type-safe OpenCode server SDK.
 *
 * If endpoint is supplied, the provider connects to that existing OpenCode
 * server. Otherwise it starts a local managed server through createOpencode.
 * Each chat uses an isolated session so callers can continue passing complete
 * ClippyJS conversation histories without duplicating state in OpenCode.
 */
export class OpenCodeProvider extends AIProvider {
  private client: OpenCodeClient | null = null;
  private managedServer: ManagedOpenCodeServer | null = null;
  private config: OpenCodeProviderConfig | null = null;

  /**
   * Configure the SDK client and optionally start a local OpenCode server.
   */
  async initialize(config: OpenCodeProviderConfig): Promise<void> {
    this.destroy();
    this.config = config;

    if (config.endpoint) {
      this.client = createOpencodeClient({
        baseUrl: config.endpoint,
        throwOnError: true,
        ...(config.fetch ? { fetch: config.fetch } : {}),
      }) as OpenCodeClient;

      if (this.client.global?.health) {
        await this.client.global.health();
      }
      return;
    }

    const instance = await createOpencode({
      hostname: config.hostname ?? '127.0.0.1',
      port: config.port ?? 4096,
      timeout: config.serverStartTimeout ?? 5_000,
      ...(config.signal ? { signal: config.signal } : {}),
      ...(config.model ? { config: { model: config.model } } : {}),
    });

    this.client = instance.client as OpenCodeClient;
    this.managedServer = instance.server;
  }

  /**
   * Send a complete ClippyJS conversation through an isolated OpenCode session.
   */
  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    if (!this.client || !this.config) {
      throw new Error('OpenCodeProvider not initialized');
    }

    let sessionId: string | undefined;

    try {
      const created = await this.client.session.create({
        body: {
          title: this.config.sessionTitle ?? 'ClippyJS conversation',
        },
      });
      const session = this.unwrap(created);

      if (!session?.id) {
        throw new Error('OpenCode server did not return a session ID');
      }
      sessionId = session.id;

      const result = await this.client.session.prompt({
        path: { id: sessionId },
        body: {
          ...(this.config.model
            ? { model: this.parseModel(this.config.model) }
            : {}),
          parts: [{
            type: 'text',
            text: this.formatPrompt(messages, options?.systemPrompt),
          }],
        },
      });

      const response = this.unwrap(result);
      const textParts = response?.parts?.filter(
        (part) => part.type === 'text' && typeof part.text === 'string'
      ) ?? [];

      if (textParts.length === 0) {
        throw new Error('OpenCode server returned no text response');
      }

      for (const part of textParts) {
        if (part.text) {
          yield {
            type: 'content_delta',
            delta: part.text,
          };
        }
      }

      yield { type: 'complete' };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown OpenCode error',
      };
    } finally {
      if (sessionId && this.client.session.delete) {
        try {
          await this.client.session.delete({
            path: { id: sessionId },
          });
        } catch {
          // Session cleanup must not hide a completed response or original error.
        }
      }
    }
  }

  /**
   * OpenCode owns its own tool execution loop; ClippyJS tools are not forwarded.
   */
  supportsTools(): boolean {
    return false;
  }

  /**
   * Image parts are represented as context labels, not native image inputs.
   */
  supportsVision(): boolean {
    return false;
  }

  /**
   * Close a managed server. Existing servers supplied via endpoint are left
   * running because the provider does not own their lifecycle.
   */
  destroy(): void {
    if (this.managedServer) {
      void this.managedServer.close();
    }

    this.managedServer = null;
    this.client = null;
    this.config = null;
  }

  private unwrap<T>(result: T | OpenCodeResult<T>): T {
    if (
      result &&
      typeof result === 'object' &&
      'data' in result &&
      (result as OpenCodeResult<T>).data !== undefined
    ) {
      return (result as OpenCodeResult<T>).data as T;
    }

    return result as T;
  }

  private parseModel(model: string): {
    providerID: string;
    modelID: string;
  } {
    const separator = model.indexOf('/');

    if (separator <= 0 || separator === model.length - 1) {
      throw new Error(
        'OpenCode model must use the "provider/model" format'
      );
    }

    return {
      providerID: model.slice(0, separator),
      modelID: model.slice(separator + 1),
    };
  }

  private formatPrompt(
    messages: Message[],
    systemPrompt?: string
  ): string {
    const sections: string[] = [];

    if (systemPrompt) {
      sections.push(`SYSTEM:\n${systemPrompt}`);
    }

    for (const message of messages) {
      sections.push(
        `${message.role.toUpperCase()}:\n${this.formatContent(message.content)}`
      );
    }

    return sections.join('\n\n');
  }

  private formatContent(content: string | ContentBlock[]): string {
    if (typeof content === 'string') {
      return content;
    }

    return content.map((block) => {
      switch (block.type) {
        case 'text':
          return block.text;
        case 'image':
          return block.source.url
            ? `[Image: ${block.source.url}]`
            : `[Image: ${block.source.mediaType} base64 data]`;
        case 'tool_use':
          return `[Tool use: ${block.name} ${JSON.stringify(block.input)}]`;
        case 'tool_result':
          return `[Tool result: ${block.content}]`;
      }
    }).join('\n');
  }
}
