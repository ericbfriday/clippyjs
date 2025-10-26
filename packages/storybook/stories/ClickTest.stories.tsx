import React, { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AIClippyProvider, useAIClippy } from '@clippyjs/ai';
import { MockAnthropicProvider } from './mocks/MockAnthropicProvider';

const meta: Meta = {
  title: 'Debug/ClickTest',
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj;

/**
 * Minimal Click Test
 *
 * Tests if button clicks work at all in E2E environment
 */
export const MinimalClick: Story = {
  render: () => {
    const [count, setCount] = useState(0);

    const handleClick = () => {
      console.log('[MinimalClick] Button clicked!');
      setCount(c => c + 1);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Minimal Click Test</h3>
        <button
          onClick={handleClick}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Click Me
        </button>
        <div style={{ marginTop: '10px' }}>
          Clicks: {count}
        </div>
      </div>
    );
  },
};

/**
 * Async Click Test
 *
 * Tests if async handlers work in E2E environment
 */
export const AsyncClick: Story = {
  render: () => {
    const [count, setCount] = useState(0);
    const [status, setStatus] = useState('Ready');

    const handleClick = async () => {
      console.log('[AsyncClick] Button clicked, starting async operation');
      setStatus('Processing...');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[AsyncClick] Async operation complete');
      setCount(c => c + 1);
      setStatus('Complete');
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Async Click Test</h3>
        <button
          onClick={handleClick}
          style={{
            padding: '10px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Click Me (Async)
        </button>
        <div style={{ marginTop: '10px' }}>
          Clicks: {count}
        </div>
        <div style={{ marginTop: '5px', color: '#666' }}>
          Status: {status}
        </div>
      </div>
    );
  },
};

/**
 * Context-Wrapped Click Test
 *
 * Tests if clicks work when component is wrapped in AIClippyProvider
 * This helps isolate whether the issue is with Context or Engine
 */
export const ContextWrappedClick: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const proactiveConfig = useMemo(() => ({
      enabled: true,
      intrusionLevel: 'medium' as const,
      checkInterval: 10000,
    }), []);

    const config = useMemo(() => ({
      provider,
      agentName: 'clippy' as const,
      personalityMode: 'friendly' as const,
      proactiveConfig,
    }), [provider, proactiveConfig]);

    function ContextClickDemo() {
      const { proactiveBehavior } = useAIClippy();
      const [count, setCount] = useState(0);

      const handleClick = () => {
        setCount(c => c + 1);
      };

      return (
        <div style={{ padding: '20px' }}>
          <h3>Context-Wrapped Click Test</h3>
          <button
            onClick={handleClick}
            style={{
              padding: '10px 20px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Click Me (Context Wrapped)
          </button>
          <div style={{ marginTop: '10px' }}>
            Clicks: {count}
          </div>
          <div style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>
            ProactiveBehavior loaded: {proactiveBehavior ? 'Yes' : 'No'}
          </div>
        </div>
      );
    }

    return (
      <AIClippyProvider config={config}>
        <ContextClickDemo />
      </AIClippyProvider>
    );
  },
};
