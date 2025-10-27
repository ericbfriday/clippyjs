import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ConversationManager } from '../conversation/ConversationManager';
import { ProactiveBehaviorEngine, type ProactiveBehaviorConfig, type ProactiveSuggestion } from '../proactive/ProactiveBehaviorEngine';
import type { AIProvider } from '../providers/AIProvider';
import type { ContextProvider } from '../context/ContextProvider';
import type { HistoryStore } from '../conversation/HistoryStore';
import type { AgentName, PersonalityMode } from '../personality/PersonalityProfiles';
import { type Mode, getMode } from '../modes/PrebuiltModes';

/**
 * AI Clippy context configuration
 */
export interface AIClippyConfig {
  /** AI provider instance */
  provider: AIProvider;
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

    // Create ConversationManager
    const conversationManager = new ConversationManager(
      config.provider,
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