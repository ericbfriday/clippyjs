import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect, useMemo } from 'react';
import { AIClippyProvider, useAIClippy } from '@clippyjs/ai';
import { MockAnthropicProvider } from './mocks/MockAnthropicProvider';

/**
 * ProactiveBehaviorEngine examples
 *
 * The ProactiveBehaviorEngine provides timer-based proactive suggestions
 * that can be triggered based on context and user behavior.
 */
const meta = {
  title: 'AI/ProactiveBehavior',
  component: () => null, // Engine story
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic Proactive Suggestions
 *
 * Simple proactive suggestion system.
 */
export const BasicSuggestions: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const proactiveConfig = useMemo(() => ({
      enabled: true,
      intrusionLevel: 'medium' as const,
      checkInterval: 10000,
    }), []);

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      proactiveConfig,
    }), [provider, proactiveConfig]);

    useEffect(() => {
      console.log('[BasicSuggestions] Config changed:', {
        provider,
        proactiveConfig,
        contextProviders: config.contextProviders,
      });
    }, [config, provider, proactiveConfig]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Basic Proactive Suggestions</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Click "Trigger Suggestion" to see proactive behavior!
          </p>
          <ProactiveBehaviorDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Intrusion Level Comparison
 *
 * Compare different intrusion levels side by side.
 */
export const IntrusionLevelComparison: Story = {
  render: () => {
    const [intrusionLevel, setIntrusionLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const provider = useMemo(() => new MockAnthropicProvider(), []);

    const intervals = {
      low: '5 minutes',
      medium: '2 minutes',
      high: '1 minute',
    };

    const proactiveConfig = useMemo(() => ({
      enabled: true,
      intrusionLevel,
      checkInterval: 15000,
    }), [intrusionLevel]);

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      proactiveConfig,
    }), [provider, proactiveConfig]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Intrusion Level Comparison</h3>

          <div
            style={{
              padding: '15px',
              background: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <h4 style={{ margin: '0 0 15px 0' }}>Select Intrusion Level:</h4>

            {(['low', 'medium', 'high'] as const).map((level) => (
              <label
                key={level}
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="intrusion"
                  value={level}
                  checked={intrusionLevel === level}
                  onChange={(e) => setIntrusionLevel(e.target.value as typeof level)}
                  style={{ marginRight: '10px' }}
                />
                <strong>{level.charAt(0).toUpperCase() + level.slice(1)}</strong>
                <span style={{ color: '#666', marginLeft: '10px' }}>
                  Min interval: {intervals[level]}
                </span>
              </label>
            ))}
          </div>

          <ProactiveBehaviorDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Cooldown Behavior
 *
 * Demonstrates cooldown after consecutive ignores.
 */
export const CooldownBehavior: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const proactiveConfig = useMemo(() => ({
      enabled: true,
      intrusionLevel: 'high' as const,
      checkInterval: 10000,
      maxConsecutiveIgnores: 3,
      ignoreCooldown: 60000,
    }), []);

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      proactiveConfig,
    }), [provider, proactiveConfig]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Cooldown Behavior Demo</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Ignore 3 consecutive suggestions to enter cooldown!
          </p>
          <CooldownDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Accept/Ignore Tracking
 *
 * Track user interactions with proactive suggestions.
 */
export const AcceptIgnoreTracking: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const proactiveConfig = useMemo(() => ({
      enabled: true,
      intrusionLevel: 'medium' as const,
      checkInterval: 12000,
    }), []);

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      proactiveConfig,
    }), [provider, proactiveConfig]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Accept/Ignore Tracking</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Track your interactions with suggestions!
          </p>
          <TrackingDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Configuration Updates
 *
 * Dynamically update proactive behavior configuration.
 */
export const ConfigurationUpdates: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const proactiveConfig = useMemo(() => ({
      enabled: true,
      intrusionLevel: 'medium' as const,
      checkInterval: 15000,
    }), []);

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      proactiveConfig,
    }), [provider, proactiveConfig]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px', maxWidth: '600px' }}>
          <h3>Configuration Updates</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Change configuration on the fly!
          </p>
          <ConfigurationDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

// Proactive Behavior Demo Component
function ProactiveBehaviorDemo() {
  const {
    proactiveBehavior,
    latestSuggestion,
    clearSuggestion,
    recordIgnore,
    recordAccept,
  } = useAIClippy();

  const [triggerCount, setTriggerCount] = useState(0);

  const handleTrigger = async () => {
    console.log('[ProactiveBehaviorDemo] handleTrigger called, proactiveBehavior:', proactiveBehavior);
    if (!proactiveBehavior) {
      console.error('ProactiveBehaviorEngine not initialized');
      return;
    }
    await proactiveBehavior.triggerSuggestion('manual');
    setTriggerCount((c) => c + 1);
  };

  const handleAccept = () => {
    recordAccept();
    clearSuggestion();
  };

  const handleIgnore = () => {
    recordIgnore();
    clearSuggestion();
  };

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={handleTrigger}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Trigger Suggestion
        </button>

        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Triggers: {triggerCount}
        </div>
      </div>

      {/* Suggestion Display */}
      {latestSuggestion ? (
        <div
          style={{
            padding: '20px',
            background: '#FFF9C4',
            border: '2px solid #FBC02D',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ margin: '0 0 15px 0' }}>💡 Proactive Suggestion</h4>

          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Reason:</strong> {latestSuggestion.reason}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Time:</strong> {latestSuggestion.timestamp.toLocaleTimeString()}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAccept}
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ✓ Accept
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
              ✕ Ignore
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '20px',
            background: '#f5f5f5',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#999',
          }}
        >
          No active suggestions
        </div>
      )}
    </div>
  );
}

// Cooldown Demo Component
function CooldownDemo() {
  const {
    proactiveBehavior,
    latestSuggestion,
    clearSuggestion,
    recordIgnore,
  } = useAIClippy();

  const [ignoreCount, setIgnoreCount] = useState(0);
  const [inCooldown, setInCooldown] = useState(false);

  const handleTrigger = async () => {
    await proactiveBehavior.triggerSuggestion('manual');
  };

  const handleIgnore = () => {
    recordIgnore();
    clearSuggestion();
    const newCount = ignoreCount + 1;
    setIgnoreCount(newCount);

    if (newCount >= 3) {
      setInCooldown(true);
      setTimeout(() => {
        setInCooldown(false);
        setIgnoreCount(0);
      }, 60000); // 1 minute
    }
  };

  return (
    <div>
      <div
        style={{
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
          <strong>Consecutive Ignores:</strong> {ignoreCount} / 3
        </p>

        {inCooldown && (
          <div
            style={{
              padding: '10px',
              background: '#FFEBEE',
              border: '1px solid #f44336',
              borderRadius: '4px',
              marginBottom: '10px',
              fontSize: '14px',
            }}
          >
            ⏳ <strong>Cooldown Active!</strong> No suggestions for 1 minute
          </div>
        )}

        <button
          onClick={handleTrigger}
          disabled={inCooldown}
          style={{
            padding: '10px 20px',
            background: inCooldown ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: inCooldown ? 'not-allowed' : 'pointer',
          }}
        >
          {inCooldown ? 'Cooldown Active' : 'Trigger Suggestion'}
        </button>
      </div>

      {latestSuggestion && !inCooldown && (
        <div
          style={{
            padding: '20px',
            background: '#FFF9C4',
            border: '2px solid #FBC02D',
            borderRadius: '8px',
          }}
        >
          <h4>💡 Proactive Suggestion</h4>
          <button
            onClick={handleIgnore}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px',
            }}
          >
            ✕ Ignore (Count: {ignoreCount + 1})
          </button>
        </div>
      )}
    </div>
  );
}

// Tracking Demo Component
function TrackingDemo() {
  const {
    proactiveBehavior,
    latestSuggestion,
    clearSuggestion,
    recordIgnore,
    recordAccept,
  } = useAIClippy();

  const [stats, setStats] = useState({ accepts: 0, ignores: 0, total: 0 });

  const handleTrigger = async () => {
    if (!proactiveBehavior) {
      console.error('ProactiveBehaviorEngine not initialized');
      return;
    }
    await proactiveBehavior.triggerSuggestion('manual');
    setStats((s) => ({ ...s, total: s.total + 1 }));
  };

  const handleAccept = () => {
    recordAccept();
    clearSuggestion();
    setStats((s) => ({ ...s, accepts: s.accepts + 1 }));
  };

  const handleIgnore = () => {
    recordIgnore();
    clearSuggestion();
    setStats((s) => ({ ...s, ignores: s.ignores + 1 }));
  };

  const acceptRate = stats.total > 0
    ? ((stats.accepts / stats.total) * 100).toFixed(1)
    : '0';

  return (
    <div>
      {/* Statistics */}
      <div
        style={{
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <h4 style={{ margin: '0 0 10px 0' }}>Statistics:</h4>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Total Suggestions:</strong> {stats.total}
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Accepts:</strong> {stats.accepts}
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Ignores:</strong> {stats.ignores}
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#4CAF50' }}>
          <strong>Accept Rate:</strong> {acceptRate}%
        </p>

        <button
          onClick={handleTrigger}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px',
          }}
        >
          Trigger Suggestion
        </button>
      </div>

      {/* Suggestion */}
      {latestSuggestion && (
        <div
          style={{
            padding: '20px',
            background: '#FFF9C4',
            border: '2px solid #FBC02D',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ margin: '0 0 15px 0' }}>💡 Proactive Suggestion</h4>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAccept}
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ✓ Accept
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
              ✕ Ignore
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Configuration Demo Component
function ConfigurationDemo() {
  const { proactiveBehavior, updateProactiveConfig } = useAIClippy();
  const [enabled, setEnabled] = useState(true);
  const [intrusionLevel, setIntrusionLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    updateProactiveConfig({ enabled: checked });
  };

  const handleIntrusionChange = (level: 'low' | 'medium' | 'high') => {
    setIntrusionLevel(level);
    updateProactiveConfig({ intrusionLevel: level });
  };

  return (
    <div
      style={{
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px',
      }}
    >
      <h4 style={{ margin: '0 0 15px 0' }}>Configuration:</h4>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            style={{ marginRight: '10px' }}
          />
          <span>Enable Proactive Behavior</span>
        </label>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <strong>Intrusion Level:</strong>
        </label>
        {(['low', 'medium', 'high'] as const).map((level) => (
          <label
            key={level}
            style={{
              display: 'block',
              marginBottom: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="level"
              value={level}
              checked={intrusionLevel === level}
              onChange={(e) => handleIntrusionChange(e.target.value as typeof level)}
              disabled={!enabled}
              style={{ marginRight: '10px' }}
            />
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </label>
        ))}
      </div>

      <div
        style={{
          marginTop: '15px',
          padding: '10px',
          background: enabled ? '#E8F5E9' : '#FFEBEE',
          border: `1px solid ${enabled ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          fontSize: '14px',
        }}
      >
        <strong>Status:</strong> {enabled ? '✓ Enabled' : '✗ Disabled'}
      </div>
    </div>
  );
}