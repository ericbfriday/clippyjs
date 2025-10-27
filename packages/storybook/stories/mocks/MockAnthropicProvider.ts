import { AIProvider, type Message, type StreamChunk, type ChatOptions } from '@clippyjs/ai';

/**
 * Mock Anthropic Provider for Storybook demos
 *
 * Simulates streaming responses without requiring real API keys
 */
export class MockAnthropicProvider extends AIProvider {
  private mockDelay = 50; // ms between chunks

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

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, this.mockDelay));
    }

    yield { type: 'complete' };
  }

  private generateMockResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // Context-aware responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm your AI assistant powered by ClippyJS. How can I help you today?";
    }

    if (lowerMessage.includes('help')) {
      return "I'd be happy to help! I can assist with various tasks, answer questions, and provide guidance. What would you like to know?";
    }

    if (lowerMessage.includes('what') && lowerMessage.includes('do')) {
      return "I'm an AI assistant that can help you with a wide range of tasks including answering questions, providing explanations, offering suggestions, and more. Try asking me something!";
    }

    if (lowerMessage.includes('weather')) {
      return "I don't have access to real-time weather data in this demo, but I'd normally be able to help you check the weather forecast for your location!";
    }

    if (lowerMessage.includes('thank')) {
      return "You're very welcome! I'm here whenever you need assistance. Feel free to ask me anything else!";
    }

    // Default response
    return `I received your message: "${userMessage}". This is a demo response from the mock AI provider. In a real implementation, I would connect to the Anthropic API and provide intelligent responses!`;
  }

  /**
   * Set the delay between streaming chunks (for demo purposes)
   */
  setMockDelay(ms: number): void {
    this.mockDelay = ms;
  }
}
