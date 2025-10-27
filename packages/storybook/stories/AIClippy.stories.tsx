import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { AIClippyProvider, useAIClippy } from '@clippyjs/ai';
import { MockAnthropicProvider } from './mocks/MockAnthropicProvider';

/**
 * AIClippyProvider examples
 *
 * The AIClippyProvider component wraps your application and provides
 * AI conversation and proactive behavior functionality via React context.
 */
const meta = {
  title: 'AI/AIClippyProvider',
  component: AIClippyProvider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AIClippyProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic Setup
 *
 * The simplest way to add AI capabilities to your app.
 */
export const Basic: Story = {
  render: () => {
    const provider = new MockAnthropicProvider();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Basic AI Clippy Setup</h3>
          <p>AI Provider is active and ready to use!</p>
          <ProviderInfo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * With Proactive Behavior
 *
 * Enable proactive suggestions that appear based on context.
 */
export const WithProactiveBehavior: Story = {
  render: () => {
    const provider = new MockAnthropicProvider();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
          proactiveConfig: {
            enabled: true,
            intrusionLevel: 'medium',
            checkInterval: 30000, // 30 seconds
          },
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>AI Clippy with Proactive Behavior</h3>
          <p>Proactive suggestions are enabled!</p>
          <ProactiveBehaviorDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Different Personalities
 *
 * Switch between different personality modes.
 */
export const DifferentPersonalities: Story = {
  render: () => {
    const [personalityMode, setPersonalityMode] = useState<'professional' | 'friendly' | 'playful'>('friendly');
    const provider = new MockAnthropicProvider();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode,
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Different Personalities</h3>

          <div style={{ marginBottom: '20px' }}>
            <label>
              Personality Mode:
              <select
                value={personalityMode}
                onChange={(e) => setPersonalityMode(e.target.value as typeof personalityMode)}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="playful">Playful</option>
              </select>
            </label>
          </div>

          <ProviderInfo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Different Agents
 *
 * Use different agent characters.
 */
export const DifferentAgents: Story = {
  render: () => {
    const [agentName, setAgentName] = useState<'clippy' | 'merlin' | 'rover' | 'f1' | 'links' | 'rocky'>('clippy');
    const provider = new MockAnthropicProvider();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName,
          personalityMode: 'friendly',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Different Agents</h3>

          <div style={{ marginBottom: '20px' }}>
            <label>
              Agent:
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value as typeof agentName)}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="clippy">Clippy</option>
                <option value="merlin">Merlin</option>
                <option value="rover">Rover</option>
                <option value="f1">F1</option>
                <option value="links">Links</option>
                <option value="rocky">Rocky</option>
              </select>
            </label>
          </div>

          <ProviderInfo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * With Custom Prompt
 *
 * Add a custom system prompt to guide AI behavior.
 */
export const WithCustomPrompt: Story = {
  render: () => {
    const provider = new MockAnthropicProvider();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
          customPrompt: 'You are a helpful coding assistant specialized in JavaScript and React.',
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>AI Clippy with Custom Prompt</h3>
          <p>Custom system prompt: "You are a helpful coding assistant specialized in JavaScript and React."</p>
          <ProviderInfo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Proactive Configuration Options
 *
 * Explore different proactive behavior configurations.
 */
export const ProactiveConfigOptions: Story = {
  render: () => {
    const [intrusionLevel, setIntrusionLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const provider = new MockAnthropicProvider();

    return (
      <AIClippyProvider
        config={{
          provider,
          agentName: 'clippy',
          personalityMode: 'friendly',
          proactiveConfig: {
            enabled: true,
            intrusionLevel,
            checkInterval: 20000,
            maxConsecutiveIgnores: 3,
            ignoreCooldown: 300000,
          },
        }}
      >
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Proactive Configuration Options</h3>

          <div style={{ marginBottom: '20px' }}>
            <label>
              Intrusion Level:
              <select
                value={intrusionLevel}
                onChange={(e) => setIntrusionLevel(e.target.value as typeof intrusionLevel)}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="low">Low (5 min intervals)</option>
                <option value="medium">Medium (2 min intervals)</option>
                <option value="high">High (1 min intervals)</option>
              </select>
            </label>
          </div>

          <ProactiveBehaviorDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

// Helper component to display provider info
function ProviderInfo() {
  const { agentName, personalityMode } = useAIClippy();

  return (
    <div
      style={{
        padding: '15px',
        background: '#f0f0f0',
        borderRadius: '8px',
        marginTop: '20px',
      }}
    >
      <h4 style={{ margin: '0 0 10px 0' }}>Provider Info:</h4>
      <p style={{ margin: '5px 0' }}>
        <strong>Agent:</strong> {agentName}
      </p>
      <p style={{ margin: '5px 0' }}>
        <strong>Personality:</strong> {personalityMode}
      </p>
      <p style={{ margin: '5px 0', color: '#4CAF50' }}>
        ✅ AI Provider Active
      </p>
    </div>
  );
}

// Helper component to demonstrate proactive behavior
function ProactiveBehaviorDemo() {
  const { proactiveBehavior, latestSuggestion, clearSuggestion, recordIgnore, recordAccept } = useAIClippy();
  const [ignoreCount, setIgnoreCount] = useState(0);
  const [acceptCount, setAcceptCount] = useState(0);

  const handleIgnore = () => {
    recordIgnore();
    clearSuggestion();
    setIgnoreCount((c) => c + 1);
  };

  const handleAccept = () => {
    recordAccept();
    clearSuggestion();
    setAcceptCount((c) => c + 1);
  };

  const handleManualTrigger = async () => {
    await proactiveBehavior.triggerSuggestion('manual');
  };

  return (
    <div>
      <div
        style={{
          padding: '15px',
          background: '#f0f0f0',
          borderRadius: '8px',
          marginTop: '20px',
        }}
      >
        <h4 style={{ margin: '0 0 10px 0' }}>Proactive Behavior Controls:</h4>

        <button
          onClick={handleManualTrigger}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Trigger Suggestion
        </button>

        <p style={{ margin: '10px 0 5px 0' }}>
          <strong>Ignores:</strong> {ignoreCount} | <strong>Accepts:</strong> {acceptCount}
        </p>
      </div>

      {latestSuggestion && (
        <div
          style={{
            padding: '15px',
            background: '#FFF9C4',
            border: '2px solid #FBC02D',
            borderRadius: '8px',
            marginTop: '20px',
          }}
        >
          <h4 style={{ margin: '0 0 10px 0' }}>💡 Proactive Suggestion</h4>
          <p style={{ margin: '5px 0' }}>
            <strong>Reason:</strong> {latestSuggestion.reason}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Time:</strong> {latestSuggestion.timestamp.toLocaleTimeString()}
          </p>

          <div style={{ marginTop: '15px' }}>
            <button
              onClick={handleAccept}
              style={{
                padding: '8px 16px',
                marginRight: '10px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Accept
            </button>
            <button
              onClick={handleIgnore}
              style={{
                padding: '8px 16px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Ignore
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
