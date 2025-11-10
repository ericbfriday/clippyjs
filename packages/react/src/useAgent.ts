/**
 * Enhanced useAgent hook - Primary imperative API for Clippy React
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Agent } from "./Agent";
import type { AgentName, UseAgentOptions, UseAgentReturn } from "@clippyjs/types";
import { useClippy } from "./ClippyProvider";

/**
 * Enhanced useAgent hook with all Agent methods exposed
 */
export function useAgent(
  name: AgentName,
  options: UseAgentOptions = {}
): UseAgentReturn {
  const {
    autoLoad = false,
    autoShow = false,
    autoCleanup = true,
    initialPosition,
    initialMessage,
    basePath,
  } = options;

  const { loadAgent, getAgent, unloadAgent } = useClippy();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const agentNameRef = useRef(name);
  const [isClient, setIsClient] = useState(false);

  // Detect client-side (SSR compatibility)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle agent name changes - cleanup old agent when name changes
  useEffect(() => {
    if (agentNameRef.current !== name) {
      // Name changed - unload the old agent
      const oldName = agentNameRef.current;
      const oldAgent = getAgent(oldName);
      if (oldAgent && autoCleanup) {
        oldAgent.destroy();
        unloadAgent(oldName);
      }
      agentNameRef.current = name;
      setAgent(null);
    }
  }, [name, autoCleanup, getAgent, unloadAgent]);

  // Load function
  const load = useCallback(async (): Promise<Agent> => {
    if (!isClient) {
      throw new Error("Cannot load agent during SSR");
    }

    try {
      setLoading(true);
      setError(null);

      const loadedAgent = await loadAgent(name, {
        basePath,
      });

      if (!mountedRef.current) throw new Error("Component unmounted");

      setAgent(loadedAgent);

      // Auto-show if enabled
      if (autoShow) {
        await loadedAgent.show();
      }

      // Set initial position if provided
      if (initialPosition) {
        await loadedAgent.moveTo(
          initialPosition.x,
          initialPosition.y,
          0
        );
      }

      // Speak initial message if provided
      if (initialMessage) {
        await loadedAgent.speak(initialMessage);
      }

      return loadedAgent;
    } catch (err) {
      if (!mountedRef.current) throw err;

      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    isClient,
    name,
    basePath,
    autoShow,
    initialPosition,
    initialMessage,
    loadAgent,
  ]);

  // Unload function
  const unload = useCallback(() => {
    if (agent) {
      agent.destroy();
      unloadAgent(agentNameRef.current);
      setAgent(null);
    }
  }, [agent, unloadAgent]);

  // Reload function
  const reload = useCallback(async (): Promise<Agent> => {
    unload();
    return await load();
  }, [load, unload]);

  // Auto-load on mount
  useEffect(() => {
    if (!isClient || !autoLoad) return;

    load().catch((err) => {
      console.error("Failed to auto-load agent:", err);
    });
  }, [isClient, autoLoad, load]);

  // Auto-cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (agent && autoCleanup) {
        agent.destroy();
        unloadAgent(agentNameRef.current);
      }
    };
  }, [agent, autoCleanup, unloadAgent]);

  // Convenience method wrappers
  const show = useCallback(async () => {
    if (!agent) throw new Error("Agent not loaded");
    await agent.show();
  }, [agent]);

  const hide = useCallback(async () => {
    if (!agent) throw new Error("Agent not loaded");
    await agent.hide();
  }, [agent]);

  const play = useCallback(
    async (animation: string) => {
      if (!agent) throw new Error("Agent not loaded");
      await agent.play(animation);
    },
    [agent]
  );

  const animate = useCallback(async () => {
    if (!agent) throw new Error("Agent not loaded");
    await agent.animate();
  }, [agent]);

  const speak = useCallback(
    async (text: string, hold?: boolean) => {
      if (!agent) throw new Error("Agent not loaded");
      await agent.speak(text, hold);
    },
    [agent]
  );

  const moveTo = useCallback(
    async (x: number, y: number, duration?: number) => {
      if (!agent) throw new Error("Agent not loaded");
      await agent.moveTo(x, y, duration);
    },
    [agent]
  );

  const gestureAt = useCallback(
    async (x: number, y: number) => {
      if (!agent) throw new Error("Agent not loaded");
      await agent.gestureAt(x, y);
    },
    [agent]
  );

  const stop = useCallback(() => {
    if (!agent) throw new Error("Agent not loaded");
    agent.stop();
  }, [agent]);

  const stopCurrent = useCallback(() => {
    if (!agent) throw new Error("Agent not loaded");
    agent.stopCurrent();
  }, [agent]);

  const pause = useCallback(() => {
    if (!agent) throw new Error("Agent not loaded");
    agent.pause();
  }, [agent]);

  const resume = useCallback(() => {
    if (!agent) throw new Error("Agent not loaded");
    agent.resume();
  }, [agent]);

  const delay = useCallback(
    async (ms: number) => {
      if (!agent) throw new Error("Agent not loaded");
      await agent.delay(ms);
    },
    [agent]
  );

  const closeBalloon = useCallback(() => {
    if (!agent) throw new Error("Agent not loaded");
    agent.closeBalloon();
  }, [agent]);

  const getAnimations = useCallback((): string[] => {
    if (!agent) return [];
    return agent.getAnimations();
  }, [agent]);

  const hasAnimation = useCallback(
    (animName: string): boolean => {
      if (!agent) return false;
      return agent.hasAnimation(animName);
    },
    [agent]
  );

  const isVisible = useCallback((): boolean => {
    if (!agent) return false;
    return agent.isVisible();
  }, [agent]);

  return {
    // State
    agent,
    isLoading: loading,
    loading,
    error,

    // Lifecycle
    load,
    unload,
    reload,

    // Core Methods
    show,
    hide,
    play,
    animate,
    speak,
    moveTo,
    gestureAt,

    // Control Methods
    stop,
    stopCurrent,
    pause,
    resume,
    delay,
    closeBalloon,

    // Utility Methods
    getAnimations,
    hasAnimation,
    isVisible,
  };
}
