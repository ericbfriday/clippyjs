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
  // Ref mirror of `agent` so method wrappers (show/speak/...) see the current
  // agent even when called right after `await load()` in the same closure,
  // before React has re-rendered with the new state.
  const agentRef = useRef<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const agentNameRef = useRef(name);

  const setAgentState = useCallback(
    (next: Agent | null) => {
      agentRef.current = next;
      setAgent(next);
    },
    []
  );

  // Handle agent name changes - cleanup old agent when name changes
  useEffect(() => {
    if (agentNameRef.current !== name) {
      // Name changed - unload the old agent
      const oldName = agentNameRef.current;
      const oldAgent = agentRef.current ?? getAgent(oldName);
      if (oldAgent && autoCleanup) {
        oldAgent.destroy();
        unloadAgent(oldName);
      }
      agentNameRef.current = name;
      setAgentState(null);
      setError(null);
    }
  }, [name, autoCleanup, getAgent, unloadAgent, setAgentState]);

  // Load function
  const load = useCallback(async (): Promise<Agent> => {
    // SSR safety check - use direct window check instead of state to avoid timing issues in tests
    if (typeof window === "undefined") {
      throw new Error("Cannot load agent during SSR");
    }

    try {
      setLoading(true);
      setError(null);

      const loadedAgent = await loadAgent(name, {
        basePath,
      });

      if (!mountedRef.current) throw new Error("Component unmounted");

      setAgentState(loadedAgent);

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
    name,
    basePath,
    autoShow,
    initialPosition,
    initialMessage,
    loadAgent,
    setAgentState,
  ]);

  // Unload function
  const unload = useCallback(() => {
    if (agentRef.current) {
      agentRef.current.destroy();
      unloadAgent(agentNameRef.current);
      setAgentState(null);
    }
  }, [unloadAgent, setAgentState]);

  // Reload function
  const reload = useCallback(async (): Promise<Agent> => {
    unload();
    return await load();
  }, [load, unload]);

  // Auto-load on mount
  useEffect(() => {
    if (typeof window === "undefined" || !autoLoad) return;

    load().catch((err) => {
      console.error("Failed to auto-load agent:", err);
    });
  }, [autoLoad, load]);

  // Auto-cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (agentRef.current && autoCleanup) {
        agentRef.current.destroy();
        unloadAgent(agentNameRef.current);
      }
    };
  }, [autoCleanup, unloadAgent]);

  // Convenience method wrappers — read agentRef so they stay valid across
  // renders and immediately after load() resolves
  const show = useCallback(async () => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    await current.show();
  }, []);

  const hide = useCallback(async () => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    await current.hide();
  }, []);

  const play = useCallback(
    async (animation: string) => {
      const current = agentRef.current;
      if (!current) throw new Error("Agent not loaded");
      await current.play(animation);
    },
    []
  );

  const animate = useCallback(async () => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    await current.animate();
  }, []);

  const speak = useCallback(
    async (text: string, hold?: boolean) => {
      const current = agentRef.current;
      if (!current) throw new Error("Agent not loaded");
      await current.speak(text, hold);
    },
    []
  );

  const moveTo = useCallback(
    async (x: number, y: number, duration?: number) => {
      const current = agentRef.current;
      if (!current) throw new Error("Agent not loaded");
      await current.moveTo(x, y, duration);
    },
    []
  );

  const gestureAt = useCallback(
    async (x: number, y: number) => {
      const current = agentRef.current;
      if (!current) throw new Error("Agent not loaded");
      await current.gestureAt(x, y);
    },
    []
  );

  const stop = useCallback(() => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    current.stop();
  }, []);

  const stopCurrent = useCallback(() => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    current.stopCurrent();
  }, []);

  const pause = useCallback(() => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    current.pause();
  }, []);

  const resume = useCallback(() => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    current.resume();
  }, []);

  const delay = useCallback(
    async (ms: number) => {
      const current = agentRef.current;
      if (!current) throw new Error("Agent not loaded");
      await current.delay(ms);
    },
    []
  );

  const closeBalloon = useCallback(() => {
    const current = agentRef.current;
    if (!current) throw new Error("Agent not loaded");
    current.closeBalloon();
  }, []);

  const getAnimations = useCallback((): string[] => {
    const current = agentRef.current;
    if (!current) return [];
    return current.getAnimations();
  }, []);

  const hasAnimation = useCallback(
    (animName: string): boolean => {
      const current = agentRef.current;
      if (!current) return false;
      return current.hasAnimation(animName);
    },
    []
  );

  const isVisible = useCallback((): boolean => {
    const current = agentRef.current;
    if (!current) return false;
    return current.isVisible();
  }, []);

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
