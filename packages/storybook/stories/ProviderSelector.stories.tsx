import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ProviderSelector, type ProviderInfo } from '@clippyjs/ai';
import { MockProvider } from './mocks/MockProvider';

const meta: Meta<typeof ProviderSelector> = {
  title: 'AI/Provider Selector',
  component: ProviderSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProviderSelector>;

// Mock provider instances
const anthropicProvider = new MockProvider({
  name: 'Anthropic (Mock)',
  supportsVision: true,
  supportsTools: true,
  latency: { min: 50, max: 200 },
});

const openaiProvider = new MockProvider({
  name: 'OpenAI (Mock)',
  supportsVision: true,
  supportsTools: true,
  latency: { min: 80, max: 250 },
});

const mockProviders: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    supportsVision: true,
    supportsTools: true,
    instance: anthropicProvider,
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    supportsVision: true,
    supportsTools: true,
    instance: openaiProvider,
  },
];

/**
 * Interactive provider selector with model switching
 */
export const Interactive: Story = {
  render: () => {
    const [selectedProviderId, setSelectedProviderId] = useState('anthropic');
    const [selectedModel, setSelectedModel] = useState<string | undefined>(
      mockProviders[0].models[0]
    );
    const [logs, setLogs] = useState<string[]>([]);

    const currentProvider = mockProviders.find(p => p.id === selectedProviderId) || mockProviders[0];

    const handleProviderChange = async (providerId: string) => {
      setLogs(prev => [...prev, `Switching to provider: ${providerId}`]);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setSelectedProviderId(providerId);
      const newProvider = mockProviders.find(p => p.id === providerId);
      setSelectedModel(newProvider?.models[0]);

      setLogs(prev => [...prev, `Provider switched successfully to: ${providerId}`]);
    };

    const handleModelChange = (model: string) => {
      setLogs(prev => [...prev, `Model changed to: ${model}`]);
      setSelectedModel(model);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '500px' }}>
        <div>
          <h3 style={{ margin: '0 0 16px 0' }}>Provider Selection Demo</h3>
          <ProviderSelector
            providers={mockProviders}
            currentProvider={currentProvider}
            onProviderChange={handleProviderChange}
            currentModel={selectedModel}
            onModelChange={handleModelChange}
            showModelSelector={true}
            layout="vertical"
          />
        </div>

        {/* Event Log */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Event Log:</h4>
          <div
            style={{
              maxHeight: '150px',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '8px',
              backgroundColor: '#f9f9f9',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            {logs.length === 0 && (
              <div style={{ color: '#999' }}>No events yet...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} style={{ padding: '2px 0' }}>
                [{new Date().toLocaleTimeString()}] {log}
              </div>
            ))}
          </div>
        </div>

        {/* Current Selection Display */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#e8f4f8',
            borderRadius: '4px',
            border: '1px solid #b3d9f2',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Current Selection:</h4>
          <div style={{ fontSize: '13px' }}>
            <div><strong>Provider:</strong> {currentProvider.name}</div>
            <div><strong>Model:</strong> {selectedModel}</div>
            <div><strong>Capabilities:</strong> {currentProvider.supportsVision ? '👁️ Vision' : ''} {currentProvider.supportsTools ? '🔧 Tools' : ''}</div>
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Horizontal layout variant
 */
export const HorizontalLayout: Story = {
  render: () => {
    const [selectedProviderId, setSelectedProviderId] = useState('openai');
    const currentProvider = mockProviders.find(p => p.id === selectedProviderId) || mockProviders[0];

    return (
      <div style={{ width: '600px' }}>
        <ProviderSelector
          providers={mockProviders}
          currentProvider={currentProvider}
          onProviderChange={async (id) => setSelectedProviderId(id)}
          currentModel={currentProvider.models[0]}
          showModelSelector={true}
          layout="horizontal"
        />
      </div>
    );
  },
};

/**
 * Without model selector
 */
export const WithoutModelSelector: Story = {
  render: () => {
    const [selectedProviderId, setSelectedProviderId] = useState('anthropic');
    const currentProvider = mockProviders.find(p => p.id === selectedProviderId) || mockProviders[0];

    return (
      <div style={{ width: '400px' }}>
        <ProviderSelector
          providers={mockProviders}
          currentProvider={currentProvider}
          onProviderChange={async (id) => setSelectedProviderId(id)}
          showModelSelector={false}
        />
      </div>
    );
  },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: () => {
    const currentProvider = mockProviders[0];

    return (
      <div style={{ width: '400px' }}>
        <ProviderSelector
          providers={mockProviders}
          currentProvider={currentProvider}
          onProviderChange={async () => {}}
          currentModel={currentProvider.models[0]}
          showModelSelector={true}
          disabled={true}
        />
      </div>
    );
  },
};

/**
 * Single provider (no switching)
 */
export const SingleProvider: Story = {
  render: () => {
    const [selectedModel, setSelectedModel] = useState(mockProviders[0].models[0]);

    return (
      <div style={{ width: '400px' }}>
        <ProviderSelector
          providers={[mockProviders[0]]}
          currentProvider={mockProviders[0]}
          onProviderChange={async () => {}}
          currentModel={selectedModel}
          onModelChange={setSelectedModel}
          showModelSelector={true}
        />
      </div>
    );
  },
};

/**
 * Custom styling example
 */
export const CustomStyling: Story = {
  render: () => {
    const [selectedProviderId, setSelectedProviderId] = useState('anthropic');
    const currentProvider = mockProviders.find(p => p.id === selectedProviderId) || mockProviders[0];

    return (
      <div style={{ width: '450px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: 'white', margin: '0 0 16px 0' }}>Choose Your AI</h3>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '4px' }}>
            <ProviderSelector
              providers={mockProviders}
              currentProvider={currentProvider}
              onProviderChange={async (id) => setSelectedProviderId(id)}
              currentModel={currentProvider.models[0]}
              showModelSelector={true}
              className="custom-provider-selector"
            />
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Loading/Switching state simulation
 */
export const SwitchingState: Story = {
  render: () => {
    const [selectedProviderId, setSelectedProviderId] = useState('anthropic');
    const [isSwitching, setIsSwitching] = useState(false);
    const currentProvider = mockProviders.find(p => p.id === selectedProviderId) || mockProviders[0];

    const handleProviderChange = async (providerId: string) => {
      setIsSwitching(true);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSelectedProviderId(providerId);
      setIsSwitching(false);
    };

    return (
      <div style={{ width: '400px' }}>
        <ProviderSelector
          providers={mockProviders}
          currentProvider={currentProvider}
          onProviderChange={handleProviderChange}
          currentModel={currentProvider.models[0]}
          showModelSelector={true}
          disabled={isSwitching}
        />
        {isSwitching && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            textAlign: 'center',
            fontSize: '13px',
          }}>
            ⟳ Switching providers... (2s simulation)
          </div>
        )}
      </div>
    );
  },
};

/**
 * With provider capabilities comparison
 */
export const WithCapabilitiesComparison: Story = {
  render: () => {
    const [selectedProviderId, setSelectedProviderId] = useState('anthropic');
    const currentProvider = mockProviders.find(p => p.id === selectedProviderId) || mockProviders[0];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '500px' }}>
        <ProviderSelector
          providers={mockProviders}
          currentProvider={currentProvider}
          onProviderChange={async (id) => setSelectedProviderId(id)}
          currentModel={currentProvider.models[0]}
          showModelSelector={true}
        />

        {/* Capabilities Table */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Capabilities Comparison</h4>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e0e0e0',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Provider</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>Vision</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>Tools</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>Models</th>
              </tr>
            </thead>
            <tbody>
              {mockProviders.map((provider, idx) => (
                <tr key={provider.id} style={{
                  backgroundColor: provider.id === selectedProviderId ? '#e8f4f8' : 'white',
                }}>
                  <td style={{ padding: '8px', borderBottom: idx < mockProviders.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                    {provider.name}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: idx < mockProviders.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                    {provider.supportsVision ? '✅' : '❌'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: idx < mockProviders.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                    {provider.supportsTools ? '✅' : '❌'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: idx < mockProviders.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                    {provider.models.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
};
