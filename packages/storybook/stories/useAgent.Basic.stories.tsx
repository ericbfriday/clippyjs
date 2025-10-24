import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useAgent } from '@clippyjs/react';

/**
 * Basic useAgent examples demonstrating fundamental hook usage
 */
const meta = {
  title: 'Hooks/useAgent/Basic',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Simple Load and Speak
 *
 * The most basic usage of useAgent - load an agent and make it speak.
 */
export const LoadAndSpeak: Story = {
  render: () => {
    const { load, speak, loading } = useAgent('Clippy');

    return (
      <div style={{ padding: '20px' }}>
        <h3>Load and Speak</h3>
        <button
          onClick={async () => {
            await load();
            await speak('Hello! Welcome to ClippyJS!');
          }}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Say Hello'}
        </button>
      </div>
    );
  },
};

/**
 * Auto-Load Agent
 *
 * Automatically load the agent when the component mounts.
 */
export const AutoLoad: Story = {
  render: () => {
    const { speak, loading, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    return (
      <div style={{ padding: '20px' }}>
        <h3>Auto-Load Agent</h3>
        <p>Agent auto-loads on mount!</p>
        <button
          onClick={() => speak('I loaded automatically!')}
          disabled={!agent}
        >
          Speak
        </button>
        {loading && <p>Loading agent...</p>}
      </div>
    );
  },
};

/**
 * With Initial Message
 *
 * Load agent with an initial message to speak.
 */
export const WithInitialMessage: Story = {
  render: () => {
    const { agent, loading, error } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
      initialMessage: 'Hello! I\'m Clippy, and I auto-loaded with a message!',
    });

    if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
    if (error) return <div style={{ padding: '20px' }}>Error: {error.message}</div>;

    return (
      <div style={{ padding: '20px' }}>
        <h3>Initial Message</h3>
        <p>Agent loaded with initial message!</p>
        <p>Status: {agent ? 'Loaded' : 'Not loaded'}</p>
      </div>
    );
  },
};

/**
 * Loading States
 *
 * Properly handle loading, error, and success states.
 */
export const LoadingStates: Story = {
  render: () => {
    const { load, speak, loading, error, agent } = useAgent('Clippy');

    return (
      <div style={{ padding: '20px' }}>
        <h3>Loading States</h3>

        <div style={{ marginBottom: '10px' }}>
          <strong>Status:</strong>{' '}
          {loading ? '⏳ Loading...' : agent ? '✅ Loaded' : '⚪ Not loaded'}
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            ❌ Error: {error.message}
          </div>
        )}

        <button
          onClick={async () => {
            await load();
            await speak('Loaded successfully!');
          }}
          disabled={loading}
        >
          Load Agent
        </button>
      </div>
    );
  },
};

/**
 * Multiple Actions
 *
 * Chain multiple agent actions together.
 */
export const MultipleActions: Story = {
  render: () => {
    const { load, speak, play, moveTo, delay } = useAgent('Clippy');

    const performSequence = async () => {
      await load();
      await speak('Let me show you what I can do!');
      await delay(500);
      await play('Wave');
      await speak('I can wave!');
      await delay(500);
      await moveTo(300, 200, 1000);
      await speak('And I can move around!');
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Multiple Actions</h3>
        <button onClick={performSequence}>
          Run Sequence
        </button>
      </div>
    );
  },
};

/**
 * Agent Selector
 *
 * Allow users to choose which agent to load.
 */
export const AgentSelector: Story = {
  render: () => {
    const [agentName, setAgentName] = useState<'Clippy' | 'Merlin' | 'Rover'>('Clippy');
    const { load, speak, loading, unload } = useAgent(agentName);

    const switchAgent = async (newAgent: typeof agentName) => {
      unload();
      setAgentName(newAgent);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Agent Selector</h3>

        <div style={{ marginBottom: '10px' }}>
          <select
            value={agentName}
            onChange={(e) => switchAgent(e.target.value as typeof agentName)}
          >
            <option value="Clippy">Clippy</option>
            <option value="Merlin">Merlin</option>
            <option value="Rover">Rover</option>
          </select>
        </div>

        <button
          onClick={async () => {
            await load();
            await speak(`Hello! I'm ${agentName}!`);
          }}
          disabled={loading}
        >
          Load {agentName}
        </button>
      </div>
    );
  },
};
