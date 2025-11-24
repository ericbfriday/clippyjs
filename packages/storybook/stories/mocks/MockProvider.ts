import { AIProvider, type Message, type StreamChunk, type ChatOptions } from '@clippyjs/ai';

/**
 * Configuration for MockProvider
 */
export interface MockProviderConfig {
  name?: string;
  supportsVision?: boolean;
  supportsTools?: boolean;
  latency?: {
    min: number;
    max: number;
  };
}

/**
 * Generic Mock Provider for Storybook demos
 *
 * Simulates streaming responses without requiring real API keys
 */
export class MockProvider extends AIProvider {
  private config: MockProviderConfig;
  private mockDelay = 50; // ms between chunks

  constructor(config: MockProviderConfig = {}) {
    super();
    this.config = {
      name: 'Mock Provider',
      supportsVision: false,
      supportsTools: false,
      latency: { min: 50, max: 200 },
      ...config,
    };

    // Set delay based on latency config
    const avgLatency = (this.config.latency!.min + this.config.latency!.max) / 2;
    this.mockDelay = Math.floor(avgLatency / 10); // Distribute latency across chunks
  }

  async initialize(): Promise<void> {
    // No-op for mock
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterableIterator<StreamChunk> {
    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userContent = typeof lastMessage.content === 'string'
      ? lastMessage.content
      : 'Hello!';

    // Generate mock response based on user message
    const response = this.generateMockResponse(userContent);

    // Stream the response character by character
    const words = response.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const delta = i === words.length - 1 ? word : word + ' ';

      yield {
        type: 'content_delta',
        delta,
      };

      // Simulate network delay with random latency
      const delay = this.mockDelay + Math.random() * (this.config.latency!.max - this.config.latency!.min) / 10;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    yield { type: 'complete' };
  }

  private generateMockResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();
    const providerName = this.config.name || 'Mock Provider';

    // Context-aware responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! I'm ${providerName}. How can I help you today?`;
    }

    if (lowerMessage.includes('help')) {
      return `I'd be happy to help! I'm ${providerName} and I can assist with various tasks. What would you like to know?`;
    }

    if (lowerMessage.includes('what') && lowerMessage.includes('do')) {
      return `I'm ${providerName}, an AI assistant that can help you with a wide range of tasks including answering questions, providing explanations, and offering suggestions.`;
    }

    if (lowerMessage.includes('weather')) {
      return "I don't have access to real-time weather data in this demo, but I'd normally be able to help you check the weather forecast!";
    }

    if (lowerMessage.includes('thank')) {
      return "You're very welcome! I'm here whenever you need assistance. Feel free to ask me anything else!";
    }

    // Default response
    return `I received your message: "${userMessage}". This is a demo response from ${providerName}. In a real implementation, I would connect to an AI API and provide intelligent responses!`;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      name: this.config.name,
      supportsVision: this.config.supportsVision,
      supportsTools: this.config.supportsTools,
    };
  }

  /**
   * Set the delay between streaming chunks (for demo purposes)
   */
  setMockDelay(ms: number): void {
    this.mockDelay = ms;
  }
}
