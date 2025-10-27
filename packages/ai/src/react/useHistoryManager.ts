import { useState, useCallback, useEffect } from 'react';
import { useAIClippy } from './AIClippyContext';
import type { ConversationHistory } from '../conversation/HistoryStore';
import type { AgentName } from '../personality/PersonalityProfiles';

/**
 * Hook result for history management
 */
export interface UseHistoryManagerResult {
  /** Current conversation history */
  history: ConversationHistory | null;
  /** Whether history is currently loading */
  isLoading: boolean;
  /** Load history for the current agent */
  loadHistory: () => Promise<void>;
  /** Clear history for the current agent */
  clearHistory: () => Promise<void>;
  /** Clear all conversation histories */
  clearAllHistories: () => Promise<void>;
  /** Manually refresh history */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing conversation history persistence
 *
 * Provides access to conversation history stored in the configured HistoryStore.
 * Supports viewing, clearing, and managing persistent conversation data.
 *
 * Features:
 * - Load conversation history for current agent
 * - Clear specific agent history
 * - Clear all histories
 * - Auto-refresh on agent changes
 *
 * Usage:
 * ```tsx
 * const { history, clearHistory, clearAllHistories } = useHistoryManager();
 *
 * <button onClick={clearHistory}>Clear History</button>
 * <button onClick={clearAllHistories}>Clear All</button>
 * <div>Messages: {history?.messages.length || 0}</div>
 * ```
 */
export function useHistoryManager(): UseHistoryManagerResult {
  const { conversationManager, config } = useAIClippy();
  const [history, setHistory] = useState<ConversationHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!config.historyStore) {
      return;
    }

    setIsLoading(true);
    try {
      const agentName = conversationManager.agentName as AgentName;
      const loadedHistory = await config.historyStore.load(agentName);
      setHistory(loadedHistory);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      setHistory(null);
    } finally {
      setIsLoading(false);
    }
  }, [config.historyStore, conversationManager.agentName]);

  const clearHistory = useCallback(async () => {
    if (!config.historyStore) {
      return;
    }

    try {
      const agentName = conversationManager.agentName as AgentName;
      await config.historyStore.clear(agentName);
      await conversationManager.clearHistory();
      setHistory(null);
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
    }
  }, [config.historyStore, conversationManager]);

  const clearAllHistories = useCallback(async () => {
    if (!config.historyStore?.clearAll) {
      console.warn('clearAll not supported by this HistoryStore');
      return;
    }

    try {
      await config.historyStore.clearAll();
      await conversationManager.clearHistory();
      setHistory(null);
    } catch (error) {
      console.error('Failed to clear all conversation histories:', error);
    }
  }, [config.historyStore, conversationManager]);

  const refresh = useCallback(async () => {
    await loadHistory();
  }, [loadHistory]);

  // Load history on mount and when agent changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    isLoading,
    loadHistory,
    clearHistory,
    clearAllHistories,
    refresh,
  };
}
