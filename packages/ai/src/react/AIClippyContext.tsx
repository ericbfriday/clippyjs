import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ConversationManager } from '../conversation/ConversationManager';
import { ProactiveBehaviorEngine, type ProactiveBehaviorConfig, type ProactiveSuggestion } from '../proactive/ProactiveBehaviorEngine';
import type { AIProvider } from '../providers/AIProvider';
import type { ContextProvider } from '../context/ContextProvider';
import type { HistoryStore } from '../conversation/HistoryStore';
import type { AgentName, PersonalityMode } from '../personality/PersonalityProfiles';

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
  const conversationManagerRef = useRef<ConversationManager | null>(null);
  const proactiveBehaviorRef = useRef<ProactiveBehaviorEngine | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [latestSuggestion, setLatestSuggestion] = useState<ProactiveSuggestion | null>(null);

  // Initialize conversation manager
  useEffect(() => {
    conversationManagerRef.current = new ConversationManager(
      config.provider,
      config.agentName,
      config.personalityMode,
      config.contextProviders || [],
      config.historyStore,
      config.customPrompt
    );

    return () => {
      conversationManagerRef.current = null;
    };
  }, [config]);

  // Initialize proactive behavior engine
  useEffect(() => {
    const engine = new ProactiveBehaviorEngine(config.proactiveConfig);

    // Register context providers
    if (config.contextProviders) {
      config.contextProviders.forEach((provider) => {
        engine.registerContextProvider(provider);
      });
    }

    // Subscribe to suggestions
    const unsubscribe = engine.onSuggestion((suggestion) => {
      setLatestSuggestion(suggestion);
    });

    // Start the engine
    engine.start();

    proactiveBehaviorRef.current = engine;

    return () => {
      unsubscribe();
      engine.destroy();
      proactiveBehaviorRef.current = null;
    };
  }, [config.contextProviders, config.proactiveConfig]);

  const clearSuggestion = useCallback(() => {
    setLatestSuggestion(null);
  }, []);

  const updateProactiveConfig = useCallback((newConfig: Partial<ProactiveBehaviorConfig>) => {
    if (proactiveBehaviorRef.current) {
      proactiveBehaviorRef.current.updateConfig(newConfig);
    }
  }, []);

  const recordIgnore = useCallback(() => {
    if (proactiveBehaviorRef.current) {
      proactiveBehaviorRef.current.recordIgnore();
    }
    clearSuggestion();
  }, [clearSuggestion]);

  const recordAccept = useCallback(() => {
    if (proactiveBehaviorRef.current) {
      proactiveBehaviorRef.current.recordAccept();
    }
    clearSuggestion();
  }, [clearSuggestion]);

  const contextValue: AIClippyContextValue = {
    conversationManager: conversationManagerRef.current!,
    proactiveBehavior: proactiveBehaviorRef.current!,
    agentName: config.agentName,
    personalityMode: config.personalityMode,
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
