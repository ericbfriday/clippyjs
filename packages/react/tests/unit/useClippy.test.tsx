import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClippy, ClippyProvider } from '../../src/ClippyProvider';
import type { ReactNode } from 'react';

/**
 * Unit tests for useClippy hook
 * Tests context hook for managing multiple agents
 */

// Mock the Agent class and loader
vi.mock('../src/Agent', () => ({
  Agent: vi.fn().mockImplementation(() => ({
    name: 'Clippy',
    show: vi.fn(() => Promise.resolve()),
    hide: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(),
    isVisible: vi.fn(() => false),
  })),
}));

vi.mock('../src/loader', () => ({
  load: vi.fn((name: string) =>
    Promise.resolve({
      name,
      show: vi.fn(() => Promise.resolve()),
      hide: vi.fn(() => Promise.resolve()),
      destroy: vi.fn(),
      isVisible: vi.fn(() => false),
    })
  ),
}));

// Wrapper component for testing hooks with context
function wrapper({ children }: { children: ReactNode }) {
  return <ClippyProvider>{children}</ClippyProvider>;
}

describe('useClippy Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('context access', () => {
    it('throws error when used outside ClippyProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useClippy());
      }).toThrow('useClippy must be used within a ClippyProvider');

      consoleSpy.mockRestore();
    });

    it('provides context when used inside ClippyProvider', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.loadAgent).toBeDefined();
      expect(result.current.unloadAgent).toBeDefined();
      expect(result.current.getAgent).toBeDefined();
      expect(result.current.agents).toBeDefined();
    });
  });

  describe('agents Map', () => {
    it('starts with empty agents Map', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(result.current.agents).toBeInstanceOf(Map);
      expect(result.current.agents.size).toBe(0);
    });
  });

  describe('loadAgent method', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(typeof result.current.loadAgent).toBe('function');
    });

    it('returns a Promise', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      const promise = result.current.loadAgent('Clippy');
      expect(promise).toBeInstanceOf(Promise);
    });

    it('accepts agent name parameter', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy');
      });

      // Should complete without error
      expect(result.current.agents.size).toBeGreaterThan(0);
    });

    it('accepts options parameter', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy', {
          basePath: '/custom/path/',
          show: false
        });
      });

      expect(result.current.agents.size).toBeGreaterThan(0);
    });
  });

  describe('unloadAgent method', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(typeof result.current.unloadAgent).toBe('function');
    });

    it('accepts agent name parameter', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(() => {
        result.current.unloadAgent('Clippy');
      }).not.toThrow();
    });

    it('does not error when unloading non-existent agent', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(() => {
        result.current.unloadAgent('NonExistent');
      }).not.toThrow();
    });
  });

  describe('getAgent method', () => {
    it('is a function', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(typeof result.current.getAgent).toBe('function');
    });

    it('returns undefined for non-existent agent', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      const agent = result.current.getAgent('NonExistent');
      expect(agent).toBeUndefined();
    });

    it('accepts agent name parameter', () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(() => {
        result.current.getAgent('Clippy');
      }).not.toThrow();
    });
  });

  describe('agent lifecycle', () => {
    it('adds agent to Map after loading', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      expect(result.current.agents.size).toBe(0);

      await act(async () => {
        await result.current.loadAgent('Clippy');
      });

      await waitFor(() => {
        expect(result.current.agents.size).toBe(1);
      });
    });

    it('removes agent from Map after unloading', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy');
      });

      await waitFor(() => {
        expect(result.current.agents.size).toBe(1);
      });

      act(() => {
        result.current.unloadAgent('Clippy');
      });

      expect(result.current.agents.size).toBe(0);
    });

    it('returns same agent when loading duplicate', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      let agent1: any;
      let agent2: any;

      await act(async () => {
        agent1 = await result.current.loadAgent('Clippy');
      });

      await act(async () => {
        agent2 = await result.current.loadAgent('Clippy');
      });

      expect(agent1).toBe(agent2);
      expect(result.current.agents.size).toBe(1);
    });
  });

  describe('multiple agents', () => {
    it('supports loading multiple different agents', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy');
        await result.current.loadAgent('Merlin');
        await result.current.loadAgent('Rover');
      });

      await waitFor(() => {
        expect(result.current.agents.size).toBe(3);
      });
    });

    it('retrieves correct agent by name', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy');
        await result.current.loadAgent('Merlin');
      });

      await waitFor(() => {
        const clippy = result.current.getAgent('Clippy');
        const merlin = result.current.getAgent('Merlin');

        expect(clippy).toBeDefined();
        expect(merlin).toBeDefined();
        expect(clippy).not.toBe(merlin);
      });
    });

    it('unloads specific agent without affecting others', async () => {
      const { result } = renderHook(() => useClippy(), { wrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy');
        await result.current.loadAgent('Merlin');
        await result.current.loadAgent('Rover');
      });

      await waitFor(() => {
        expect(result.current.agents.size).toBe(3);
      });

      act(() => {
        result.current.unloadAgent('Merlin');
      });

      expect(result.current.agents.size).toBe(2);
      expect(result.current.getAgent('Clippy')).toBeDefined();
      expect(result.current.getAgent('Merlin')).toBeUndefined();
      expect(result.current.getAgent('Rover')).toBeDefined();
    });
  });

  describe('maxAgents limit', () => {
    it('respects maxAgents limit from provider', async () => {
      function limitedWrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider maxAgents={2}>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useClippy(), { wrapper: limitedWrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy');
        await result.current.loadAgent('Merlin');
      });

      await waitFor(() => {
        expect(result.current.agents.size).toBe(2);
      });

      // Attempting to load third agent should throw
      await expect(async () => {
        await act(async () => {
          await result.current.loadAgent('Rover');
        });
      }).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('handles errors with onError callback', async () => {
      const onError = vi.fn();

      function errorWrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider maxAgents={1} onError={onError}>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useClippy(), { wrapper: errorWrapper });

      await act(async () => {
        await result.current.loadAgent('Clippy');
      });

      // Try to exceed maxAgents
      try {
        await act(async () => {
          await result.current.loadAgent('Merlin');
        });
      } catch (error) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});
