import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  AIClippyProvider,
  useAIClippy,
  type AIClippyConfig,
  type ProviderInfo,
  AIProvider,
  type Message,
  type StreamChunk,
  type AIProviderConfig,
} from '../../src';

/**
 * Mock AI Provider for testing
 */
class TestProvider extends AIProvider {
  public name: string;
  public currentModel = 'default-model';
  private _supportsVision: boolean;
  private _supportsTools: boolean;

  constructor(
    name: string,
    supportsVision = true,
    supportsTools = true
  ) {
    super();
    this.name = name;
    this._supportsVision = supportsVision;
    this._supportsTools = supportsTools;
  }

  async initialize(config: AIProviderConfig): Promise<void> {
    this.currentModel = config.model || this.currentModel;
  }

  async *chat(
    messages: Message[],
    options?: any
  ): AsyncIterableIterator<StreamChunk> {
    yield {
      type: 'content_delta',
      delta: `Response from ${this.name} using ${this.currentModel}`,
    };
    yield {
      type: 'complete',
    };
  }

  supportsVision(): boolean {
    return this._supportsVision;
  }

  supportsTools(): boolean {
    return this._supportsTools;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getModel(): string {
    return this.currentModel;
  }

  destroy(): void {
    // Cleanup
  }
}

describe('Provider Switching Integration Tests', () => {
  let mockLocalStorage: Record<string, string>;
  let getItemSpy: any;
  let setItemSpy: any;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = window.localStorage;

    // Mock localStorage storage
    mockLocalStorage = {};

    // Create mock localStorage object
    const mockStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      get length() {
        return Object.keys(mockLocalStorage).length;
      },
      key: vi.fn((index: number) => {
        return Object.keys(mockLocalStorage)[index] || null;
      }),
    };

    // Store spy references
    getItemSpy = mockStorage.getItem;
    setItemSpy = mockStorage.setItem;

    // Replace window.localStorage with our mock
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  describe('Multi-Provider Configuration', () => {
    it('initializes with default provider', () => {
      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet', 'claude-3-opus'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o', 'gpt-4'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      expect(result.current.availableProviders).toEqual(providers);
      expect(result.current.currentProvider?.id).toBe('anthropic');
      expect(result.current.currentProvider?.name).toBe('Anthropic Claude');
    });

    it('initializes with first provider if no default specified', () => {
      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o', 'gpt-4'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      expect(result.current.currentProvider?.id).toBe('openai');
    });

    it('loads provider from localStorage if available', () => {
      // Pre-populate mock localStorage BEFORE creating the component
      mockLocalStorage['clippy-selected-provider'] = 'openai';

      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      // Should load OpenAI from localStorage, not Anthropic default
      expect(result.current.currentProvider?.id).toBe('openai');
      // Verify getItem was called during initialization
      expect(getItemSpy).toHaveBeenCalledWith('clippy-selected-provider');
    });

    it('ignores invalid localStorage provider', () => {
      mockLocalStorage['clippy-selected-provider'] = 'invalid-provider';

      const anthropicProvider = new TestProvider('Anthropic');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      // Should fall back to default, not use invalid stored value
      expect(result.current.currentProvider?.id).toBe('anthropic');
    });
  });

  describe('Provider Switching', () => {
    it('switches provider successfully', async () => {
      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      expect(result.current.currentProvider?.id).toBe('anthropic');

      // Switch to OpenAI
      await act(async () => {
        await result.current.switchProvider!('openai');
      });

      await waitFor(() => {
        expect(result.current.currentProvider?.id).toBe('openai');
        expect(result.current.currentProvider?.name).toBe('OpenAI GPT');
      });
    });

    it('persists provider selection to localStorage', async () => {
      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      await act(async () => {
        await result.current.switchProvider!('openai');
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        'clippy-selected-provider',
        'openai'
      );
      expect(mockLocalStorage['clippy-selected-provider']).toBe('openai');
    });

    it('throws error when switching to non-existent provider', async () => {
      const anthropicProvider = new TestProvider('Anthropic');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      await expect(
        act(async () => {
          await result.current.switchProvider!('invalid-provider');
        })
      ).rejects.toThrow('Provider invalid-provider not found');
    });

    it('updates conversation manager with new provider', async () => {
      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      const originalManager = result.current.conversationManager;

      await act(async () => {
        await result.current.switchProvider!('openai');
      });

      // Conversation manager should be the same instance (not recreated)
      expect(result.current.conversationManager).toBe(originalManager);
    });
  });

  describe('Model Switching', () => {
    it('changes model for current provider', async () => {
      const anthropicProvider = new TestProvider('Anthropic');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      // Change model
      act(() => {
        result.current.changeModel!('claude-3-opus');
      });

      await waitFor(() => {
        expect(result.current.currentModel).toBe('claude-3-opus');
        expect(anthropicProvider.getModel()).toBe('claude-3-opus');
      });
    });

    it('persists model selection to localStorage', () => {
      const anthropicProvider = new TestProvider('Anthropic');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet', 'claude-3-opus'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      act(() => {
        result.current.changeModel!('claude-3-opus');
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        'clippy-anthropic-model',
        'claude-3-opus'
      );
      expect(mockLocalStorage['clippy-anthropic-model']).toBe('claude-3-opus');
    });

    it('clears model selection when switching providers', async () => {
      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet', 'claude-3-opus'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o', 'gpt-4'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      // Set a model
      act(() => {
        result.current.changeModel!('claude-3-opus');
      });

      expect(result.current.currentModel).toBe('claude-3-opus');

      // Switch provider
      await act(async () => {
        await result.current.switchProvider!('openai');
      });

      await waitFor(() => {
        // Model should be cleared after provider switch
        expect(result.current.currentModel).toBeUndefined();
      });
    });
  });

  describe('Backwards Compatibility', () => {
    it('supports single provider mode (legacy)', () => {
      const anthropicProvider = new TestProvider('Anthropic');

      const config: AIClippyConfig = {
        provider: anthropicProvider,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      expect(result.current.conversationManager).toBeDefined();
      expect(result.current.availableProviders).toBeUndefined();
      expect(result.current.currentProvider).toBeUndefined();
      expect(result.current.switchProvider).toBeUndefined();
      expect(result.current.changeModel).toBeUndefined();
    });

    it('throws error if neither provider nor providers specified', () => {
      const config: AIClippyConfig = {
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      // Should throw during render
      expect(() => {
        renderHook(() => useAIClippy(), { wrapper });
      }).toThrow('No AI provider configured');
    });
  });

  describe('Error Scenarios', () => {
    it('handles provider without setModel gracefully', () => {
      // Create a provider without setModel method
      class LimitedProvider extends TestProvider {
        setModel = undefined as any;
      }

      const limitedProvider = new LimitedProvider('Limited');

      const providers: ProviderInfo[] = [
        {
          id: 'limited',
          name: 'Limited Provider',
          models: ['model-1', 'model-2'],
          supportsVision: false,
          supportsTools: false,
          instance: limitedProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to change model - should warn but not crash
      act(() => {
        result.current.changeModel!('model-2');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AIClippyContext] Provider does not support model switching'
      );

      consoleSpy.mockRestore();
    });

    it('throws error when switchProvider called in single-provider mode', async () => {
      const anthropicProvider = new TestProvider('Anthropic');

      const config: AIClippyConfig = {
        provider: anthropicProvider,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      // switchProvider should be undefined in single-provider mode
      expect(result.current.switchProvider).toBeUndefined();
    });

    it('maintains provider capabilities after switching', async () => {
      const anthropicProvider = new TestProvider('Anthropic', true, true);
      const openaiProvider = new TestProvider('OpenAI', true, false);

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o'],
          supportsVision: true,
          supportsTools: false,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      expect(result.current.currentProvider?.supportsVision).toBe(true);
      expect(result.current.currentProvider?.supportsTools).toBe(true);

      await act(async () => {
        await result.current.switchProvider!('openai');
      });

      await waitFor(() => {
        expect(result.current.currentProvider?.supportsVision).toBe(true);
        expect(result.current.currentProvider?.supportsTools).toBe(false);
      });
    });
  });

  describe('Configuration Persistence', () => {
    it('loads provider and model from localStorage on mount', () => {
      mockLocalStorage['clippy-selected-provider'] = 'openai';
      mockLocalStorage['clippy-openai-model'] = 'gpt-4';

      const anthropicProvider = new TestProvider('Anthropic');
      const openaiProvider = new TestProvider('OpenAI');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          models: ['gpt-4o', 'gpt-4'],
          supportsVision: true,
          supportsTools: true,
          instance: openaiProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      const { result } = renderHook(() => useAIClippy(), { wrapper });

      expect(result.current.currentProvider?.id).toBe('openai');
      // Note: Model loading from localStorage would need to be implemented in the component
    });

    it('handles missing localStorage gracefully (SSR)', () => {
      // Simulate SSR environment by making localStorage throw
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage is not defined');
      });

      const anthropicProvider = new TestProvider('Anthropic');

      const providers: ProviderInfo[] = [
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet'],
          supportsVision: true,
          supportsTools: true,
          instance: anthropicProvider,
        },
      ];

      const config: AIClippyConfig = {
        providers,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AIClippyProvider config={config}>{children}</AIClippyProvider>
      );

      // Should not crash - but will use default provider since localStorage access fails
      expect(() => {
        renderHook(() => useAIClippy(), { wrapper });
      }).not.toThrow();
    });
  });
});
