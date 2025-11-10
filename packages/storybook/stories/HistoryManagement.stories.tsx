import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  AIClippyProvider,
  useAIChat,
  useHistoryManager,
  HistoryManager,
  LocalStorageHistoryStore,
  SessionStorageHistoryStore,
  IndexedDBHistoryStore,
  createTestProvider,
} from '@clippyjs/ai';

const meta: Meta = {
  title: 'AI/History Management',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

/**
 * Simple chat interface for testing history
 */
function ChatInterface() {
  const { messages, isStreaming, sendMessage } = useAIChat();
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '400px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '1rem',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#9ca3af', textAlign: 'center' }}>No messages yet</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: '0.75rem',
              backgroundColor: msg.role === 'user' ? '#eff6ff' : '#f5f3ff',
              borderRadius: '0.375rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {msg.role}
            </div>
            <div style={{ fontSize: '0.875rem' }}>{msg.content}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
          }}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

/**
 * LocalStorage persistence demo
 */
export const LocalStoragePersistence: StoryObj = {
  render: () => {
    const provider = createTestProvider({
      scenario: 'success',
      responseText: 'Hello! I can help you with that.',
      delay: 300,
      chunkDelay: 50,
    });
    const historyStore = new LocalStorageHistoryStore();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'Clippy',
          personalityMode: 'classic',
          historyStore,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '800px' }}>
          <div>
            <h2 style={{ marginBottom: '1rem' }}>LocalStorage History Management</h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              This example demonstrates history persistence using localStorage. Send some messages
              and reload the page - your conversation history will be restored.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <h3>Chat</h3>
              <ChatInterface />
            </div>

            <div>
              <h3>History Manager</h3>
              <HistoryManager showDetails={true} />
            </div>
          </div>
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * SessionStorage persistence demo
 */
export const SessionStoragePersistence: StoryObj = {
  render: () => {
    const provider = createTestProvider({
      scenario: 'success',
      responseText: 'Hello! How can I help you today?',
      delay: 300,
      chunkDelay: 50,
    });
    const historyStore = new SessionStorageHistoryStore();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'Clippy',
          personalityMode: 'classic',
          historyStore,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '800px' }}>
          <div>
            <h2 style={{ marginBottom: '1rem' }}>SessionStorage History Management</h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              This example demonstrates history persistence using sessionStorage. History persists
              during navigation but is cleared when the tab is closed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <h3>Chat</h3>
              <ChatInterface />
            </div>

            <div>
              <h3>History Manager</h3>
              <HistoryManager showDetails={true} />
            </div>
          </div>
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * IndexedDB persistence demo
 */
export const IndexedDBPersistence: StoryObj = {
  render: () => {
    const provider = createTestProvider({
      scenario: 'success',
      responseText: 'This is a test response from IndexedDB persistence.',
      delay: 300,
      chunkDelay: 50,
    });
    const [historyStore] = useState(() => {
      const store = new IndexedDBHistoryStore();
      store.initialize(); // Initialize on mount
      return store;
    });

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'Clippy',
          personalityMode: 'classic',
          historyStore,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '800px' }}>
          <div>
            <h2 style={{ marginBottom: '1rem' }}>IndexedDB History Management</h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              This example demonstrates history persistence using IndexedDB. Best for large
              conversation histories (50MB+ vs 5-10MB for localStorage).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <h3>Chat</h3>
              <ChatInterface />
            </div>

            <div>
              <h3>History Manager</h3>
              <HistoryManager showDetails={true} />
            </div>
          </div>
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Custom history management hook usage
 */
function CustomHistoryUI() {
  const { history, isLoading, clearHistory, refresh } = useHistoryManager();

  return (
    <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <h4 style={{ marginBottom: '1rem' }}>Custom History UI</h4>
      {isLoading ? (
        <div>Loading...</div>
      ) : history ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong>Agent:</strong> {history.agentName}
          </div>
          <div>
            <strong>Messages:</strong> {history.messages.length}
          </div>
          <div>
            <strong>Started:</strong> {history.startedAt.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={refresh}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
            <button
              onClick={clearHistory}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div>No history found</div>
      )}
    </div>
  );
}

export const CustomHookUsage: StoryObj = {
  render: () => {
    const provider = createTestProvider({
      scenario: 'success',
      responseText: 'Custom hook usage example response.',
      delay: 300,
      chunkDelay: 50,
    });
    const historyStore = new LocalStorageHistoryStore();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'Clippy',
          personalityMode: 'classic',
          historyStore,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '800px' }}>
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Custom History Hook Usage</h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              This example shows how to use the useHistoryManager hook to build custom history UI.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <h3>Chat</h3>
              <ChatInterface />
            </div>

            <div>
              <h3>Custom History UI</h3>
              <CustomHistoryUI />
            </div>
          </div>
        </div>
      </AIClippyProvider>
    );
  },
};
