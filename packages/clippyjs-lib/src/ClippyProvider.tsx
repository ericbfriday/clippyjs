/**
 * React Context Provider for Clippy agents
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Agent } from './Agent';
import { load } from './loader';

interface ClippyContextType {
  agents: Map<string, Agent>;
  loadAgent: (name: string, options?: LoadAgentOptions) => Promise<Agent>;
  unloadAgent: (name: string) => void;
  getAgent: (name: string) => Agent | undefined;
}

interface LoadAgentOptions {
  basePath?: string;
  show?: boolean;
}

interface ClippyProviderProps {
  children: ReactNode;
  defaultBasePath?: string;
}

const ClippyContext = createContext<ClippyContextType | undefined>(undefined);

/**
 * Provider component for managing Clippy agents
 */
export const ClippyProvider: React.FC<ClippyProviderProps> = ({ children, defaultBasePath }) => {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());

  const loadAgent = async (name: string, options?: LoadAgentOptions): Promise<Agent> => {
    // Check if already loaded
    const existing = agents.get(name);
    if (existing) return existing;

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
      console.error(`Failed to load agent ${name}:`, error);
      throw error;
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