import {
  AIProvider,
  type AIProviderConfig,
  type Message,
  type ContentBlock,
  type StreamChunk,
  type ChatOptions,
  type ToolUseBlock,
  type Tool,
} from '@clippyjs/ai';
import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk';
import type { TextPartInput, FilePartInput, EventMessagePartUpdated, GlobalEvent, AssistantMessage } from '@opencode-ai/sdk';

export class OpenCodeProvider extends AIProvider {
  private config: AIProviderConfig | null = null;
  private currentModel = 'gpt-4o';
  private client: OpencodeClient | null = null;
  private sessionId: string | null = null;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    this.currentModel = config.model || 'gpt-4o';

    if (!config.endpoint) {
      if (config.apiKey) {
        throw new Error(
          'Security Error: Direct client-side API key usage is disabled. Please use a secure backend proxy endpoint.'
        );
      }
      throw new Error('Proxy endpoint must be provided');
    }

    this.client = createOpencodeClient({
      baseUrl: config.endpoint,
      headers: {
        'Authorization': `Bearer ${config.apiKey || 'proxy-mode'}`,
      }
    });
    
    // We create a session to chat in
    const sessionRes = await this.client.session.create();
    if (sessionRes.data) {
        this.sessionId = sessionRes.data.id;
    } else {
        throw new Error('Failed to create OpenCode session');
    }
  }

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk> {
    if (!this.client || !this.config || !this.sessionId) {
      throw new Error('OpenCode Provider not initialized');
    }

    // Convert messages to OpenCode prompt format
    const lastUserMessage = messages[messages.length - 1];
    
    // OpenCode's prompt endpoint takes parts. We only send the latest message or combine history?
    // According to standard AIProvider usage, the caller manages history and sends all messages.
    // However, OpenCode SDK is session-based. For now we will assume the SDK maintains history in the session 
    // and we only need to prompt it, or we combine the user's latest request. Let's just combine the messages 
    // into a single prompt for simplicity or find a way to sync history.
    
    // Convert current message content to TextPartInput
    let parts: (TextPartInput | FilePartInput)[] = [];
    if (typeof lastUserMessage.content === 'string') {
        parts.push({
            type: 'text',
            text: lastUserMessage.content
        });
    } else {
        // map content blocks
        for (const block of lastUserMessage.content) {
            if (block.type === 'text') {
                parts.push({
                    type: 'text',
                    text: block.text
                });
            } else if (block.type === 'image') {
                parts.push({
                    type: 'file',
                    mime: block.source.mediaType,
                    url: block.source.type === 'base64' ? `data:${block.source.mediaType};base64,${block.source.data}` : block.source.url!
                });
            }
        }
    }

    const toolNames = options?.tools?.map(t => t.name) || [];
    const toolsObj: Record<string, boolean> = {};
    for (const t of toolNames) {
        toolsObj[t] = true;
    }

    // OpenCode prompt call is NOT naturally streaming via HTTP stream response, 
    // instead it returns immediately and we must subscribe to events.
    // But since `sdk` has `event` subscription:
    const eventsPromise = this.client.global.event();
    
    const promptRes = await this.client.session.prompt({
        path: { id: this.sessionId },
        body: {
            parts: parts,
            system: options?.systemPrompt,
            tools: toolsObj,
            model: {
                providerID: 'openai', // fallback/default
                modelID: this.currentModel
            }
        }
    });

    if (promptRes.error) {
        yield { type: 'error', error: JSON.stringify(promptRes.error) };
        return;
    }
    
    const messageId = promptRes.data.info.id;
    const events = await eventsPromise;
    
    try {
        for await (const globalEvent of events.stream) {
            const ev = globalEvent.payload;
            if (ev.type === 'message.part.updated') {
                if (ev.properties.part.messageID === messageId && ev.properties.part.type === 'text') {
                    if (ev.properties.delta) {
                        yield {
                            type: 'content_delta',
                            delta: ev.properties.delta
                        };
                    }
                } else if (ev.properties.part.messageID === messageId && ev.properties.part.type === 'tool') {
                    // OpenCode tool call handling
                    // Mapping OpenCode tool state to StreamChunk
                    if (ev.properties.part.state.status === 'pending' || ev.properties.part.state.status === 'running') {
                        yield {
                            type: 'tool_use',
                            toolUse: {
                                id: ev.properties.part.callID,
                                name: ev.properties.part.tool,
                                input: (ev.properties.part.metadata?.input as any) || {}
                            }
                        };
                    }
                }
            } else if (ev.type === 'message.updated') {
                if (ev.properties.info.id === messageId && ('completed' in ev.properties.info.time && ev.properties.info.time.completed)) {
                    // Message complete
                    break;
                }
            }
        }
    } finally {
        yield { type: 'complete' };
    }
  }

  supportsTools(): boolean {
    return true;
  }

  supportsVision(): boolean {
    return true;
  }

  destroy(): void {
    if (this.client && this.sessionId) {
      this.client.session.delete({ path: { id: this.sessionId } }).catch(() => {});
    }
    this.client = null;
    this.sessionId = null;
  }
}
