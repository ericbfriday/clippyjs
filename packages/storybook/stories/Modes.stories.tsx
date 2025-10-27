import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useMemo } from 'react';
import { AIClippyProvider, useAIClippy, type Mode, helpAssistantMode, codeReviewerMode, shoppingAssistantMode, formHelperMode, accessibilityGuideMode } from '@clippyjs/ai';
import { MockAnthropicProvider } from './mocks/MockAnthropicProvider';

/**
 * Pre-built Modes Examples
 *
 * Demonstrates the pre-built mode system for specialized AI assistant behaviors.
 */
const meta = {
  title: 'AI/Modes',
  component: () => null,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Demo Components
// ============================================================================

/**
 * Mode Display Component
 * Shows current mode information and quick actions
 */
function ModeDisplay() {
  const { currentMode } = useAIClippy();
  const [selectedAction, setSelectedAction] = useState<string>('');

  return (
    <div style={{
      padding: '20px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
    }}>
      <h4 style={{ marginTop: 0 }}>Mode Information</h4>

      <div style={{ marginBottom: '15px' }}>
        <strong>Mode:</strong>{' '}
        <span style={{
          color: currentMode ? '#0066cc' : '#999',
          fontFamily: 'monospace'
        }}>
          {currentMode ? currentMode.name : 'none'}
        </span>
      </div>

      {currentMode && (
        <>
          <div style={{
            marginBottom: '15px',
            fontSize: '14px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            {currentMode.description}
          </div>

          {currentMode.quickActions && currentMode.quickActions.length > 0 && (
            <div>
              <strong>Quick Actions</strong>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '10px'
              }}>
                {currentMode.quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAction(action.prompt)}
                    style={{
                      padding: '10px 15px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      backgroundColor: selectedAction === action.prompt ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                    }}
                  >
                    {action.icon && <span style={{ marginRight: '8px' }}>{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>

              {selectedAction && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeeba',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <strong>Selected Prompt:</strong>
                  <div style={{ marginTop: '5px', fontFamily: 'monospace' }}>
                    {selectedAction}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Comprehensive mode demo with chat interface
 */
function ComprehensiveModeDemo() {
  const { currentMode, conversationManager } = useAIClippy();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);

  const handleSend = async () => {
    if (!message.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setMessage('');

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `[${currentMode?.name || 'default'}] Response to: "${message}"`
      }]);
    }, 500);
  };

  return (
    <div style={{ width: '600px', maxWidth: '100%' }}>
      <ModeDisplay />

      <div style={{
        marginTop: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: 'white'
      }}>
        <h4 style={{ marginTop: 0 }}>Chat Interface</h4>

        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f1f8e9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <strong>{msg.role}:</strong> {msg.content}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleSend}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#0066cc',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Send
          </button>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        <strong>Mode Context Providers:</strong>{' '}
        <span>{currentMode?.contextProviders?.length || 0}</span>
        <br />
        <strong>Proactive:</strong>{' '}
        <span>enabled</span>
        <br />
        <strong>Context Providers:</strong>{' '}
        <span>0</span>
      </div>
    </div>
  );
}

// ============================================================================
// Story Exports - Pre-built Modes
// ============================================================================

/**
 * Help Assistant Mode
 *
 * General website help and navigation assistance.
 */
export const HelpAssistantMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: 'help-assistant' as const,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Help Assistant Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Focused on answering questions and explaining page functionality.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Code Reviewer Mode
 *
 * Technical code analysis and review assistance.
 */
export const CodeReviewerMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: codeReviewerMode,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Code Reviewer Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Expert at analyzing code structure, identifying issues, and suggesting improvements.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Shopping Assistant Mode
 *
 * E-commerce guidance and product comparison.
 */
export const ShoppingAssistantMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: shoppingAssistantMode,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Shopping Assistant Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Helps users find products, compare options, and make informed purchasing decisions.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Form Helper Mode
 *
 * Form completion and validation assistance.
 */
export const FormHelperMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: formHelperMode,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Form Helper Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Guides users through filling out forms correctly and explains validation errors.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Accessibility Guide Mode
 *
 * Accessibility support and navigation assistance.
 */
export const AccessibilityGuideMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: accessibilityGuideMode,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Accessibility Guide Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Helps users with accessibility needs navigate and use the site effectively.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

// ============================================================================
// Story Exports - Configuration Scenarios
// ============================================================================

/**
 * No Mode
 *
 * AIClippyProvider with no mode specified.
 */
export const NoMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      // No mode specified
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>No Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Default behavior without any specialized mode.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Invalid Mode Name
 *
 * Tests handling of invalid mode name.
 */
export const InvalidModeName: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: 'non-existent-mode' as any,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Invalid Mode Name</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Gracefully handles invalid mode name by falling back to no mode.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Mode with Custom Prompt
 *
 * Demonstrates merging mode system prompt with custom prompt.
 */
export const ModeWithCustomPrompt: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: formHelperMode,
      customPrompt: 'Always include examples in your explanations.',
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Mode with Custom Prompt</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Form Helper mode extended with custom prompt.
          </p>
          <div style={{
            padding: '10px',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <strong>Custom Prompt:</strong> Active
          </div>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Mode with Additional Providers
 *
 * Demonstrates merging mode context providers with additional ones.
 */
export const ModeWithAdditionalProviders: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);

    // Mock context provider
    const customProvider = useMemo(() => ({
      name: 'custom-context',
      description: 'Custom application context',
      provide: async () => ({ custom: 'data' }),
    }), []);

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: helpAssistantMode,
      contextProviders: [customProvider],
    }), [provider, customProvider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Mode with Additional Providers</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Help Assistant mode with additional custom context provider.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Mode with Custom Proactive Config
 *
 * Override mode's default proactive strategy.
 */
export const ModeWithCustomProactive: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: codeReviewerMode,
      proactiveConfig: {
        enabled: true,
        intrusionLevel: 'low' as const,
        checkInterval: 30000, // 30 seconds
      },
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Mode with Custom Proactive Config</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Code Reviewer mode with custom proactive configuration.
          </p>
          <div style={{
            padding: '10px',
            backgroundColor: '#d1ecf1',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <strong>Proactive:</strong> custom (low intrusion, 30s interval)
          </div>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Mode Switcher
 *
 * Demonstrates dynamic mode switching (if implemented).
 */
export const ModeSwitcher: Story = {
  render: () => {
    const [currentModeName, setCurrentModeName] = useState<string>('help-assistant');
    const provider = useMemo(() => new MockAnthropicProvider(), []);

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: currentModeName,
    }), [provider, currentModeName]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Mode Switcher</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Switch between different modes dynamically.
          </p>

          <div style={{
            marginBottom: '20px',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setCurrentModeName('help-assistant')}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: currentModeName === 'help-assistant' ? '#0066cc' : 'white',
                color: currentModeName === 'help-assistant' ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              Help Assistant
            </button>
            <button
              onClick={() => setCurrentModeName('code-reviewer')}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: currentModeName === 'code-reviewer' ? '#0066cc' : 'white',
                color: currentModeName === 'code-reviewer' ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              Code Reviewer
            </button>
            <button
              onClick={() => setCurrentModeName('shopping-assistant')}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: currentModeName === 'shopping-assistant' ? '#0066cc' : 'white',
                color: currentModeName === 'shopping-assistant' ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              Shopping Assistant
            </button>
          </div>

          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Undefined Mode
 *
 * Tests handling of undefined mode.
 */
export const UndefinedMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: undefined,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Undefined Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Gracefully handles undefined mode.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};

/**
 * Malformed Mode
 *
 * Tests handling of malformed mode object.
 */
export const MalformedMode: Story = {
  render: () => {
    const provider = useMemo(() => new MockAnthropicProvider(), []);
    const malformedMode = {
      name: 'malformed',
      // Missing required fields
    } as Mode;

    const config = useMemo(() => ({
      provider,
      agentName: 'Clippy' as const,
      personalityMode: 'classic' as const,
      mode: malformedMode,
    }), [provider]);

    return (
      <AIClippyProvider config={config}>
        <div style={{ padding: '20px' }}>
          <h3>Malformed Mode</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Handles malformed mode object gracefully.
          </p>
          <ComprehensiveModeDemo />
        </div>
      </AIClippyProvider>
    );
  },
};
