import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ConversationManager } from '../conversation/ConversationManager';
import { ProactiveBehaviorEngine, type ProactiveBehaviorConfig, type ProactiveSuggestion } from '../proactive/ProactiveBehaviorEngine';
import type { AIProvider } from '../providers/AIProvider';
import type { ContextProvider } from '../context/ContextProvider';
import type { HistoryStore } from '../conversation/HistoryStore';
import type { AgentName, PersonalityMode } from '../personality/PersonalityProfiles';
import { type Mode, getMode } from '../modes/PrebuiltModes';

/**
 * Provider information for display and selection
 */
export interface ProviderInfo {
  /** Provider identifier (e.g., 'anthropic', 'openai') */
  id: string;
  /** Display name for UI */
  name: string;
  /** Available models for this provider */
  models: string[];
  /** Whether provider supports vision */
  supportsVision: boolean;
  /** Whether provider supports tools */
  supportsTools: boolean;
  /** Provider instance */
  instance: AIProvider;
}

/**
 * AI Clippy context configuration
 */
export interface AIClippyConfig {
  /** AI provider instance (backwards compatibility) */
  provider?: AIProvider;
  /** Available AI providers for selection */
  providers?: ProviderInfo[];
  /** Default selected provider ID */
  defaultProvider?: string;
  /** Agent name (Clippy, Merlin, etc.) */
  agentName: AgentName;
  /** Personality mode */
  personalityMode: PersonalityMode;
  /** Pre-built mode or mode name */
  mode?: Mode | string;
  /** Context providers */
  contextProviders?: ContextProvider[];
  /** History store */
  historyStore?: HistoryStore;
  /** Proactive behavior configuration */
  proactiveConfig?: Partial<ProactiveBehaviorConfig>;
  /** Custom system prompt (appended to personality) */
  customPrompt?: string;
}

/**
 * AI Clippy context value
 */
export interface AIClippyContextValue {
  /** Conversation manager instance */
  conversationManager: ConversationManager;
  /** Proactive behavior engine */
  proactiveBehavior: ProactiveBehaviorEngine;
  /** Current agent name */
  agentName: AgentName;
  /** Current personality mode */
  personalityMode: PersonalityMode;
  /** Current mode (if set) */
  currentMode: Mode | null;
  /** Whether AI is currently responding */
  isResponding: boolean;
  /** Latest proactive suggestion */
  latestSuggestion: ProactiveSuggestion | null;
  /** Clear latest suggestion */
  clearSuggestion: () => void;
  /** Update proactive configuration */
  updateProactiveConfig: (config: Partial<ProactiveBehaviorConfig>) => void;
  /** Record user ignored suggestion */
  recordIgnore: () => void;
  /** Record user accepted suggestion */
  recordAccept: () => void;
  /** Available providers (if multi-provider mode) */
  availableProviders?: ProviderInfo[];
  /** Currently selected provider */
  currentProvider?: ProviderInfo;
  /** Switch to a different provider */
  switchProvider?: (providerId: string) => Promise<void>;
  /** Selected model for current provider */
  currentModel?: string;
  /** Change model for current provider */
  changeModel?: (model: string) => void;
}

const AIClippyContext = createContext<AIClippyContextValue | null>(null);

/**
 * AI Clippy Provider Props
 */
export interface AIClippyProviderProps {
  config: AIClippyConfig;
  children: React.ReactNode;
}

/**
 * AI Clippy Provider Component
 *
 * Provides AI conversation and proactive behavior functionality
 * to child components via React context.
 *
 * Features:
 * - Conversation management with streaming
 * - Proactive suggestion engine
 * - Context provider integration
 * - History persistence
 * - User preference controls
 *
 * Usage:
 * ```tsx
 * <AIClippyProvider config={config}>
 *   <YourApp />
 * </AIClippyProvider>
 * ```
 */
export function AIClippyProvider({ config, children }: AIClippyProviderProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [latestSuggestion, setLatestSuggestion] = useState<ProactiveSuggestion | null>(null);

  // Provider selection state (for multi-provider mode)
  const [currentProviderId, setCurrentProviderId] = useState<string>(() => {
    // Try localStorage first, then defaultProvider, then first provider, then single provider mode
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('clippy-selected-provider') : null;
      if (stored && config.providers?.some(p => p.id === stored)) {
        return stored;
      }
    } catch (error) {
      // localStorage not available (SSR or disabled)
      console.debug('[AIClippyContext] localStorage not available, using default provider');
    }
    return config.defaultProvider || config.providers?.[0]?.id || 'single';
  });

  const [currentModel, setCurrentModel] = useState<string | undefined>(undefined);

  // Get active provider based on configuration
  const getActiveProvider = useCallback((): AIProvider => {
    // Single provider mode (backwards compatibility)
    if (config.provider) {
      return config.provider;
    }

    // Multi-provider mode
    if (config.providers) {
      const providerInfo = config.providers.find(p => p.id === currentProviderId);
      if (providerInfo) {
        return providerInfo.instance;
      }
    }

    throw new Error('No provider configured');
  }, [config.provider, config.providers, currentProviderId]);

  // Get current provider info (for multi-provider mode)
  const getCurrentProviderInfo = useCallback((): ProviderInfo | undefined => {
    if (!config.providers) return undefined;
    return config.providers.find(p => p.id === currentProviderId);
  }, [config.providers, currentProviderId]);

  // Synchronous initialization using lazy state initializers
  // This ensures managers are created BEFORE the first render
  const [managers] = useState(() => {
    // Resolve mode if provided (string to Mode object)
    const resolvedMode: Mode | null = config.mode
      ? typeof config.mode === 'string'
        ? getMode(config.mode) || null
        : config.mode
      : null;

    // Merge mode context providers with config context providers
    const contextProviders = [
      ...(resolvedMode?.contextProviders || []),
      ...(config.contextProviders || []),
    ];

    // Merge mode system prompt with custom prompt
    const systemPrompt = [
      resolvedMode?.systemPromptExtension,
      config.customPrompt,
    ].filter(Boolean).join('\n\n');

    // Use mode's proactive strategy if available, otherwise use config
    const proactiveConfig = resolvedMode?.proactiveStrategy
      ? {
          ...config.proactiveConfig,
          // Note: Mode's proactiveStrategy will be used by the engine if needed
        }
      : config.proactiveConfig;

    // Get the active provider (handles both single and multi-provider modes)
    const activeProvider = config.provider ||
      (config.providers?.find(p => p.id === currentProviderId))?.instance ||
      config.providers?.[0]?.instance;

    if (!activeProvider) {
      throw new Error('No AI provider configured');
    }

    // Create ConversationManager
    const conversationManager = new ConversationManager(
      activeProvider,
      config.agentName,
      config.personalityMode,
      contextProviders,
      config.historyStore,
      systemPrompt || config.customPrompt
    );

    // Create ProactiveBehaviorEngine
    const engine = new ProactiveBehaviorEngine(proactiveConfig);

    // Register context providers
    contextProviders.forEach((provider) => {
      engine.registerContextProvider(provider);
    });

    return { conversationManager, engine, mode: resolvedMode };
  });

  // Load conversation history on mount if historyStore is available
  useEffect(() => {
    const loadHistory = async () => {
      if (config.historyStore) {
        try {
          const history = await config.historyStore.load(config.agentName);
          if (history) {
            console.log('[AIClippyContext] Loading conversation history:', history.messages.length, 'messages');
            await managers.conversationManager.loadHistory(history);
          }
        } catch (error) {
          console.error('[AIClippyContext] Failed to load conversation history:', error);
        }
      }
    };

    loadHistory();
  }, [config.historyStore, config.agentName, managers.conversationManager]);

  // Subscribe to proactive suggestions using standard listener pattern
  // This runs synchronously after render, ensuring the listener is attached before any user interaction
  useLayoutEffect(() => {
    console.log('[AIClippyContext] useLayoutEffect running - subscribing to engine');

    // Subscribe using onSuggestion which adds to the listeners array
    const unsubscribe = managers.engine.onSuggestion((suggestion) => {
      console.log('[AIClippyContext] Listener callback invoked with suggestion:', suggestion);
      setLatestSuggestion(suggestion);
      console.log('[AIClippyContext] setLatestSuggestion called');
    });

    console.log('[AIClippyContext] Listener subscribed, starting engine');
    // Start the engine after listener is attached
    managers.engine.start();
    console.log('[AIClippyContext] Engine started');

    // Cleanup: unsubscribe and stop engine
    return () => {
      console.log('[AIClippyContext] Cleanup - unsubscribing and stopping engine');
      unsubscribe();
      managers.engine.stop();
    };
  }, [managers.engine]); // Only run once when engine is created

  const clearSuggestion = useCallback(() => {
    setLatestSuggestion(null);
  }, []);

  const updateProactiveConfig = useCallback((newConfig: Partial<ProactiveBehaviorConfig>) => {
    managers.engine.updateConfig(newConfig);
  }, [managers.engine]);

  const recordIgnore = useCallback(() => {
    managers.engine.recordIgnore();
    clearSuggestion();
  }, [managers.engine, clearSuggestion]);

  const recordAccept = useCallback(() => {
    managers.engine.recordAccept();
    clearSuggestion();
  }, [managers.engine, clearSuggestion]);

  // Provider switching function
  const switchProvider = useCallback(async (providerId: string) => {
    if (!config.providers) {
      throw new Error('Provider switching requires multi-provider configuration');
    }

    const newProvider = config.providers.find(p => p.id === providerId);
    if (!newProvider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Save conversation history before switching
    if (config.historyStore) {
      try {
        const history = managers.conversationManager.getHistory();
        await config.historyStore.save(history);
      } catch (error) {
        console.error('[AIClippyContext] Failed to save history before provider switch:', error);
      }
    }

    // Update provider selection
    setCurrentProviderId(providerId);

    // Save to localStorage for persistence
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('clippy-selected-provider', providerId);
      }
    } catch (error) {
      console.debug('[AIClippyContext] Failed to save provider to localStorage');
    }

    // Update conversation manager with new provider
    managers.conversationManager.updateProvider(newProvider.instance);

    // Clear current model selection
    setCurrentModel(undefined);
  }, [config.providers, config.historyStore, config.agentName, managers.conversationManager]);

  // Model changing function
  const changeModel = useCallback((model: string) => {
    const provider = getActiveProvider();

    // Check if provider has setModel method (like OpenAI and Anthropic providers)
    if ('setModel' in provider && typeof (provider as any).setModel === 'function') {
      (provider as any).setModel(model);
      setCurrentModel(model);

      // Save to localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`clippy-${currentProviderId}-model`, model);
        }
      } catch (error) {
        console.debug('[AIClippyContext] Failed to save model to localStorage');
      }
    } else {
      console.warn('[AIClippyContext] Provider does not support model switching');
    }
  }, [getActiveProvider, currentProviderId]);

  // No loading screen needed - managers are initialized synchronously
  const contextValue: AIClippyContextValue = {
    conversationManager: managers.conversationManager,
    proactiveBehavior: managers.engine,
    agentName: config.agentName,
    personalityMode: config.personalityMode,
    currentMode: managers.mode,
    isResponding,
    latestSuggestion,
    clearSuggestion,
    updateProactiveConfig,
    recordIgnore,
    recordAccept,
    // Provider selection (only in multi-provider mode)
    availableProviders: config.providers,
    currentProvider: getCurrentProviderInfo(),
    switchProvider: config.providers ? switchProvider : undefined,
    currentModel,
    changeModel: config.providers ? changeModel : undefined,
  };

  return (
    <AIClippyContext.Provider value={contextValue}>
      {children}
    </AIClippyContext.Provider>
  );
}

/**
 * Hook to access AI Clippy context
 *
 * Must be used within an AIClippyProvider
 *
 * @returns AIClippyContextValue
 * @throws Error if used outside AIClippyProvider
 */
export function useAIClippy(): AIClippyContextValue {
  const context = useContext(AIClippyContext);
  if (!context) {
    throw new Error('useAIClippy must be used within an AIClippyProvider');
  }
  return context;
}