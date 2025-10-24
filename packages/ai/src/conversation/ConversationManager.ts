import type { AIProvider, Message, StreamChunk } from '../providers/AIProvider';
import type { ContextData } from '../context/ContextProvider';
import type {
  HistoryStore,
  ConversationMessage,
  ConversationHistory,
} from './HistoryStore';

/**
 * Conversation Manager
 *
 * Manages conversation history, context injection, and streaming responses.
 * Coordinates between the AI provider, context system, and history storage.
 */
export class ConversationManager {
  private history: ConversationMessage[] = [];
  private maxHistoryLength = 50;
  private agentName: string = 'unknown';

  constructor(
    private provider: AIProvider,
    private historyStore?: HistoryStore
  ) {}

  /**
   * Set the agent name for history tracking
   */
  setAgentName(name: string): void {
    this.agentName = name;
  }

  /**
   * Send a message and stream the response
   * @param userMessage User's message text
   * @param context Context data to include
   * @param systemPrompt System prompt for the AI
   * @returns Async iterator of response chunks
   */
  async *sendMessage(
    userMessage: string,
    context: ContextData[],
    systemPrompt: string
  ): AsyncIterableIterator<StreamChunk> {
    // Create user message
    const userMsg: ConversationMessage = {
      id: this.generateId(),
      role: 'user',
      content: this.buildMessageContent(userMessage, context),
      timestamp: new Date(),
      context,
    };

    this.history.push(userMsg);

    // Build messages array for AI provider
    const messages: Message[] = this.history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Stream response from AI
    const stream = this.provider.chat(messages, { systemPrompt });

    // Collect assistant response
    let assistantContent = '';
    const assistantMsg: ConversationMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    try {
      for await (const chunk of stream) {
        if (chunk.type === 'content_delta' && chunk.delta) {
          assistantContent += chunk.delta;
          assistantMsg.content = assistantContent;
        }
        yield chunk;
      }

      // Add completed assistant message to history
      this.history.push(assistantMsg);
      this.trimHistory();

      // Persist to storage if available
      if (this.historyStore) {
        await this.historyStore.save(this.getHistory());
      }
    } catch (error) {
      console.error('Conversation error:', error);
      throw error;
    }
  }

  /**
   * Build message content with optional context
   */
  private buildMessageContent(userMessage: string, context: ContextData[]): string {
    if (context.length === 0) {
      return userMessage;
    }

    // Format context as structured data
    const contextStr = context
      .filter((c) => c.provider && c.data)
      .map((c) => {
        const dataStr = JSON.stringify(c.data, null, 2);
        return `[Context from ${c.provider}]:\n${dataStr}`;
      })
      .join('\n\n');

    return `${userMessage}\n\n---\nAvailable Context:\n${contextStr}`;
  }

  /**
   * Trim history to maximum length
   */
  private trimHistory(): void {
    if (this.history.length > this.maxHistoryLength) {
      // Keep most recent messages
      this.history = this.history.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Get current conversation history
   */
  getHistory(): ConversationHistory {
    return {
      messages: this.history,
      agentName: this.agentName,
      startedAt: this.history[0]?.timestamp || new Date(),
      lastInteraction: this.history[this.history.length - 1]?.timestamp || new Date(),
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Load conversation history from storage
   */
  async loadHistory(history: ConversationHistory): Promise<void> {
    this.history = history.messages;
    this.agentName = history.agentName;
  }

  /**
   * Get conversation message count
   */
  getMessageCount(): number {
    return this.history.length;
  }

  /**
   * Get last message
   */
  getLastMessage(): ConversationMessage | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Generate unique ID for messages
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
