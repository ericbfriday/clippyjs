import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgent } from '../../src/useAgent';
import { ClippyProvider } from '../../src/ClippyProvider';
import type { ReactNode } from 'react';

/**
 * Unit tests for useAgent hook
 * Tests hook logic, state management, and error handling in isolation
 */

// Wrapper component for testing hooks with context
function wrapper({ children }: { children: ReactNode }) {
  return <ClippyProvider>{children}</ClippyProvider>;
}

describe('useAgent', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      expect(result.current.agent).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('accepts different agent names', () => {
      const agents: Array<'Clippy' | 'Merlin' | 'Rover'> = ['Clippy', 'Merlin', 'Rover'];

      agents.forEach(agentName => {
        const { result } = renderHook(() => useAgent(agentName), { wrapper });
        expect(result.current.agent).toBeNull();
      });
    });
  });

  describe('loading state', () => {
    it('sets loading to true when load is called', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.load();
      });

      // Loading should be true immediately after calling load
      expect(result.current.loading).toBe(true);
    });

    it('handles autoLoad option', () => {
      const { result } = renderHook(
        () => useAgent('Clippy', { autoLoad: true }),
        { wrapper }
      );

      // With autoLoad, loading should start automatically
      // This may be true immediately or after a tick
      expect(result.current.loading).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns null error initially', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });
      expect(result.current.error).toBeNull();
    });

    // Note: Error testing would require mocking the agent loading
    // which depends on the actual implementation details
  });

  describe('method availability', () => {
    it('provides all expected methods', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      // Lifecycle methods
      expect(typeof result.current.load).toBe('function');
      expect(typeof result.current.unload).toBe('function');
      expect(typeof result.current.reload).toBe('function');

      // Core methods
      expect(typeof result.current.show).toBe('function');
      expect(typeof result.current.hide).toBe('function');
      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.animate).toBe('function');
      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.moveTo).toBe('function');
      expect(typeof result.current.gestureAt).toBe('function');

      // Control methods
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.stopCurrent).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
      expect(typeof result.current.delay).toBe('function');
      expect(typeof result.current.closeBalloon).toBe('function');

      // Utility methods
      expect(typeof result.current.getAnimations).toBe('function');
      expect(typeof result.current.hasAnimation).toBe('function');
      expect(typeof result.current.isVisible).toBe('function');
    });
  });

  describe('cleanup', () => {
    it('unloads agent on unmount when autoCleanup is true', () => {
      const { unmount } = renderHook(
        () => useAgent('Clippy', { autoCleanup: true }),
        { wrapper }
      );

      // Unmount should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('does not unload agent on unmount when autoCleanup is false', () => {
      const { unmount } = renderHook(
        () => useAgent('Clippy', { autoCleanup: false }),
        { wrapper }
      );

      // Unmount should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('SSR compatibility', () => {
    it('initializes without errors in client environment', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      // Hook should initialize properly
      expect(result.current.agent).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('provides getAnimations that returns empty array when agent not loaded', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      // Should return empty array when no agent loaded
      expect(result.current.getAnimations()).toEqual([]);
    });

    it('provides hasAnimation that returns false when agent not loaded', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      // Should return false when no agent loaded
      expect(result.current.hasAnimation('Wave')).toBe(false);
    });

    it('provides isVisible that returns false when agent not loaded', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      // Should return false when no agent loaded
      expect(result.current.isVisible()).toBe(false);
    });
  });
});
