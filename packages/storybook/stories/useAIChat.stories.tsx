import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AIClippyProvider, useAIChat } from '@clippyjs/ai';
import { MockAnthropicProvider } from './mocks/MockAnthropicProvider';

/**
 * useAIChat Hook examples
 *
 * The useAIChat hook provides message history management,
 * streaming response handling, and conversation functionality.
 */
const meta = {
  title: 'AI/useAIChat',
  component: () => null, // Hook story
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic Chat Interface
 *
 * Simple chat interface with message history and streaming.
 */
export const BasicChat: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Basic Chat Interface</h3>
          <ChatInterface />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Chat with Streaming Visualization
 *
 * Shows streaming tokens as they arrive in real-time.
 */
export const StreamingVisualization: Story = {
  render: () => {
    const provider = useMemo(() => {
      const p = new MockAnthropicProvider();
      p.setMockDelay(100);
      return p;
    }, []);

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Streaming Visualization</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Watch tokens stream in real-time!
          </p>
          <ChatInterface showStreamingIndicator />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Chat with Message History
 *
 * Maintains conversation history across multiple messages.
 */
export const WithMessageHistory: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Chat with Message History</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Try sending multiple messages to see history!
          </p>
          <ChatInterface showMessageCount />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Chat with Cancel Stream
 *
 * Allows canceling streaming responses mid-stream.
 */
export const WithCancelStream: Story = {
  render: () => {
    const provider = useMemo(() => {
      const p = new MockAnthropicProvider();
      p.setMockDelay(150);
      return p;
    }, []);

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Chat with Cancel Stream</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Click "Cancel" while streaming to stop the response!
          </p>
          <ChatInterface showCancelButton />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Chat with Clear History
 *
 * Demonstrates clearing conversation history.
 */
export const WithClearHistory: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Chat with Clear History</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Send messages, then clear to start fresh!
          </p>
          <ChatInterface showClearButton />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Multiple Chat Instances
 *
 * Multiple independent chat instances in the same app.
 */
export const MultipleChatInstances: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '800px' }}>
          <h3>Multiple Chat Instances</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <h4>Chat 1</h4>
              <ChatInterface compact />
            </div>
            <div style={{ flex: 1 }}>
              <h4>Chat 2</h4>
              <ChatInterface compact />
            </div>
          </div>
        </div>
      </AIClippyProvider>
    );
  },
};

// Chat Interface Component
interface ChatInterfaceProps {
  showStreamingIndicator?: boolean;
  showMessageCount?: boolean;
  showCancelButton?: boolean;
  showClearButton?: boolean;
  compact?: boolean;
}

function ChatInterface({
  showStreamingIndicator,
  showMessageCount,
  showCancelButton,
  showClearButton,
  compact,
}: ChatInterfaceProps) {
  const { messages, isStreaming, sendMessage, clearMessages, cancelStream } = useAIChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div>
      {/* Status Bar */}
      {(showStreamingIndicator || showMessageCount) && (
        <div
          style={{
            padding: '10px',
            background: '#f5f5f5',
            borderRadius: '4px',
            marginBottom: '10px',
            fontSize: '14px',
          }}
        >
          {showStreamingIndicator && isStreaming && (
            <span style={{ color: '#2196F3', marginRight: '15px' }}>
              ⚡ Streaming...
            </span>
          )}
          {showMessageCount && (
            <span style={{ color: '#666' }}>
              Messages: {messages.length}
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px',
          height: compact ? '200px' : '300px',
          overflowY: 'auto',
          marginBottom: '10px',
          background: '#fafafa',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
            Start a conversation!
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: '15px',
              padding: '10px',
              borderRadius: '8px',
              background: msg.role === 'user' ? '#E3F2FD' : '#F5F5F5',
              border: msg.role === 'user' ? '1px solid #2196F3' : '1px solid #ddd',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
              {msg.isStreaming && ' (typing...)'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {msg.content || '...'}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={isStreaming}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          style={{
            padding: '10px 20px',
            background: !input.trim() || isStreaming ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !input.trim() || isStreaming ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Send
        </button>

        {showCancelButton && isStreaming && (
          <button
            onClick={cancelStream}
            style={{
              padding: '10px 20px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        )}

        {showClearButton && messages.length > 0 && (
          <button
            onClick={clearMessages}
            style={{
              padding: '10px 20px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}