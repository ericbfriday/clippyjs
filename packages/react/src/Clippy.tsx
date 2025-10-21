/**
 * React component for Clippy agents
 */

import React, { useEffect, useRef, useState } from "react";
import { useClippy } from "./ClippyProvider";
import type { Agent } from "@clippyjs/core";

export interface ClippyProps {
  /** Name of the agent to load (e.g., 'Clippy', 'Bonzi', 'Rover') */
  name: string;
  /** Custom base path for agent assets */
  basePath?: string;
  /** Whether to show immediately after loading */
  showOnLoad?: boolean;
  /** Callback when agent is loaded */
  onLoad?: (agent: Agent) => void;
  /** Callback on load error */
  onError?: (error: Error) => void;
  /** Initial position */
  position?: { x: number; y: number };
  /** Initial message to speak */
  speak?: string;
  /** Whether to hold the speech balloon */
  holdSpeech?: boolean;
}

/**
 * Clippy React Component
 */
export const Clippy: React.FC<ClippyProps> = ({
  name,
  basePath,
  showOnLoad = true,
  onLoad,
  onError,
  position,
  speak,
  holdSpeech = false,
}) => {
  const { loadAgent, getAgent, unloadAgent } = useClippy();
  const [agent, setAgent] = useState<Agent | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let currentAgent: Agent | undefined;

    const initAgent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if already loaded
        currentAgent = getAgent(name);

        if (!currentAgent) {
          // Load the agent
          currentAgent = await loadAgent(name, {
            basePath,
            show: showOnLoad,
          });
        } else if (showOnLoad) {
          await currentAgent.show();
        }

        if (!mountedRef.current) return;

        setAgent(currentAgent);

        // Set initial position if provided
        if (position && currentAgent) {
          await currentAgent.moveTo(position.x, position.y, 0);
        }

        // Speak initial message if provided
        if (speak && currentAgent) {
          await currentAgent.speak(speak, holdSpeech);
        }

        // Call onLoad callback
        if (onLoad && currentAgent) {
          onLoad(currentAgent);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        const error = err as Error;
        setError(error);

        if (onError) {
          onError(error);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initAgent();

    return () => {
      mountedRef.current = false;
      // Note: We don't unload the agent here as it might be used elsewhere
      // The ClippyProvider handles cleanup on unmount
    };
  }, [name, basePath, showOnLoad]);

  // Handle speak prop changes
  useEffect(() => {
    if (agent && speak) {
      agent.speak(speak, holdSpeech);
    }
  }, [speak, holdSpeech]);

  // This component doesn't render anything - the Agent manages its own DOM
  return null;
};

/**
 * Hook to control a specific agent
 */
export const useAgent = (
  name: string,
): {
  agent: Agent | undefined;
  loading: boolean;
  error: Error | null;
  load: () => Promise<void>;
  unload: () => void;
} => {
  const { loadAgent, getAgent, unloadAgent } = useClippy();
  const [agent, setAgent] = useState<Agent | undefined>(() => getAgent(name));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedAgent = await loadAgent(name);
      setAgent(loadedAgent);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const unload = () => {
    unloadAgent(name);
    setAgent(undefined);
  };

  useEffect(() => {
    // Update agent reference if it changes
    const currentAgent = getAgent(name);
    if (currentAgent !== agent) {
      setAgent(currentAgent);
    }
  }, [name]);

  return {
    agent,
    loading,
    error,
    load,
    unload,
  };
};
