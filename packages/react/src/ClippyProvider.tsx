/**
 * React Context Provider for Clippy agents
 *
 * Provides centralized management for multiple Clippy agents with features including:
 * - Agent lifecycle management (load, unload, get)
 * - Concurrent agent limits
 * - Global error handling
 * - Automatic cleanup on unmount
 *
 * @example
 * ```tsx
 * <ClippyProvider maxAgents={3} onError={(err) => console.error(err)}>
 *   <App />
 * </ClippyProvider>
 * ```
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Agent } from './Agent';
import { load } from './loader';

/**
 * Context value provided by ClippyProvider
 */
interface ClippyContextType {
  /** Map of all loaded agents by name */
  agents: Map<string, Agent>;
  /** Load a new agent or return existing one */
  loadAgent: (name: string, options?: LoadAgentOptions) => Promise<Agent>;
  /** Unload and destroy an agent */
  unloadAgent: (name: string) => void;
  /** Get a loaded agent by name */
  getAgent: (name: string) => Agent | undefined;
}

interface LoadAgentOptions {
  basePath?: string;
  show?: boolean;
}

interface ClippyProviderProps {
  children: ReactNode;
  /** Default base path for agent assets */
  defaultBasePath?: string;
  /** Maximum number of concurrent agents (default: 5) */
  maxAgents?: number;
  /** Enable/disable sounds globally (default: true) */
  soundEnabled?: boolean;
  /** Error callback for global error handling */
  onError?: (error: Error, agentName?: string) => void;
}

const ClippyContext = createContext<ClippyContextType | undefined>(undefined);

/**
 * Provider component for managing Clippy agents
 */
export const ClippyProvider: React.FC<ClippyProviderProps> = ({
  children,
  defaultBasePath,
  maxAgents = 5,
  soundEnabled = true,
  onError
}) => {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());

  const loadAgent = async (name: string, options?: LoadAgentOptions): Promise<Agent> => {
    // Check if already loaded
    const existing = agents.get(name);
    if (existing) return existing;

    // Check max agents limit
    if (agents.size >= maxAgents) {
      const error = new Error(
        `Maximum ${maxAgents} agents allowed. Unload an agent before loading another.`
      );
      onError?.(error, name);
      throw error;
    }

    try {
      // Load the agent
      const agent = await load(name, {
        basePath: options?.basePath || defaultBasePath
      });

      // Add to state
      setAgents(prev => new Map(prev).set(name, agent));

      // Show if requested
      if (options?.show !== false) {
        await agent.show();
      }

      return agent;
    } catch (error) {
      const err = error as Error;
      onError?.(err, name);
      console.error(`Failed to load agent ${name}:`, err);
      throw err;
    }
  };

  const unloadAgent = (name: string): void => {
    const agent = agents.get(name);
    if (agent) {
      agent.destroy();
      setAgents(prev => {
        const next = new Map(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const getAgent = (name: string): Agent | undefined => {
    return agents.get(name);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      agents.forEach(agent => agent.destroy());
    };
  }, []);

  const value: ClippyContextType = {
    agents,
    loadAgent,
    unloadAgent,
    getAgent
  };

  return (
    <ClippyContext.Provider value={value}>
      {children}
    </ClippyContext.Provider>
  );
};

/**
 * Hook to access Clippy context
 */
export const useClippy = (): ClippyContextType => {
  const context = useContext(ClippyContext);
  if (!context) {
    throw new Error('useClippy must be used within a ClippyProvider');
  }
  return context;
};