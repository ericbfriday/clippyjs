import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgent } from '../../src/useAgent';
import { ClippyProvider } from '../../src/ClippyProvider';
import type { ReactNode } from 'react';

/**
 * Comprehensive interaction tests for useAgent hook
 * Tests all agent methods and their behavior
 */

// Create mock agent with all methods
const createMockAgent = () => ({
  show: vi.fn(() => Promise.resolve()),
  hide: vi.fn(() => Promise.resolve()),
  play: vi.fn(() => Promise.resolve()),
  animate: vi.fn(() => Promise.resolve()),
  speak: vi.fn(() => Promise.resolve()),
  moveTo: vi.fn(() => Promise.resolve()),
  gestureAt: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
  stopCurrent: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  delay: vi.fn(() => Promise.resolve()),
  closeBalloon: vi.fn(),
  getAnimations: vi.fn(() => ['Wave', 'Idle', 'GetAttention']),
  hasAnimation: vi.fn((name: string) => ['Wave', 'Idle', 'GetAttention'].includes(name)),
  isVisible: vi.fn(() => true),
  destroy: vi.fn(),
});

// Mock the core load function
vi.mock('../src', () => ({
  load: vi.fn(() => Promise.resolve(createMockAgent())),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ClippyProvider>{children}</ClippyProvider>;
}

describe('useAgent - Method Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('show method', () => {
    it('calls agent.show when invoked', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.show();
      });

      expect(result.current.agent?.show).toHaveBeenCalled();
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.show();
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('hide method', () => {
    it('calls agent.hide when invoked', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.hide();
      });

      expect(result.current.agent?.hide).toHaveBeenCalled();
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.hide();
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('play method', () => {
    it('calls agent.play with animation name', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.play('Wave');
      });

      expect(result.current.agent?.play).toHaveBeenCalledWith('Wave');
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.play('Wave');
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('animate method', () => {
    it('calls agent.animate when invoked', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.animate();
      });

      expect(result.current.agent?.animate).toHaveBeenCalled();
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.animate();
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('speak method', () => {
    it('calls agent.speak with text', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.speak('Hello, World!');
      });

      expect(result.current.agent?.speak).toHaveBeenCalledWith('Hello, World!', undefined);
    });

    it('calls agent.speak with text and hold flag', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.speak('Hello!', true);
      });

      expect(result.current.agent?.speak).toHaveBeenCalledWith('Hello!', true);
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.speak('Hello!');
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('moveTo method', () => {
    it('calls agent.moveTo with coordinates', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.moveTo(100, 200);
      });

      expect(result.current.agent?.moveTo).toHaveBeenCalledWith(100, 200, undefined);
    });

    it('calls agent.moveTo with coordinates and duration', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.moveTo(150, 250, 1000);
      });

      expect(result.current.agent?.moveTo).toHaveBeenCalledWith(150, 250, 1000);
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.moveTo(100, 200);
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('gestureAt method', () => {
    it('calls agent.gestureAt with coordinates', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.gestureAt(300, 400);
      });

      expect(result.current.agent?.gestureAt).toHaveBeenCalledWith(300, 400);
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.gestureAt(300, 400);
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('control methods', () => {
    it('stop calls agent.stop', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.agent?.stop).toHaveBeenCalled();
    });

    it('stopCurrent calls agent.stopCurrent', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      act(() => {
        result.current.stopCurrent();
      });

      expect(result.current.agent?.stopCurrent).toHaveBeenCalled();
    });

    it('pause calls agent.pause', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.agent?.pause).toHaveBeenCalled();
    });

    it('resume calls agent.resume', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      act(() => {
        result.current.resume();
      });

      expect(result.current.agent?.resume).toHaveBeenCalled();
    });

    it('closeBalloon calls agent.closeBalloon', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      act(() => {
        result.current.closeBalloon();
      });

      expect(result.current.agent?.closeBalloon).toHaveBeenCalled();
    });
  });

  describe('delay method', () => {
    it('calls agent.delay with milliseconds', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.delay(1000);
      });

      expect(result.current.agent?.delay).toHaveBeenCalledWith(1000);
    });

    it('throws error when agent not loaded', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await expect(async () => {
        await result.current.delay(1000);
      }).rejects.toThrow('Agent not loaded');
    });
  });

  describe('utility methods', () => {
    it('getAnimations returns animation list', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      const animations = result.current.getAnimations();

      expect(animations).toEqual(['Wave', 'Idle', 'GetAttention']);
      expect(result.current.agent?.getAnimations).toHaveBeenCalled();
    });

    it('getAnimations returns empty array when agent not loaded', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      const animations = result.current.getAnimations();

      expect(animations).toEqual([]);
    });

    it('hasAnimation checks for animation', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      const hasWave = result.current.hasAnimation('Wave');
      const hasUnknown = result.current.hasAnimation('Unknown');

      expect(hasWave).toBe(true);
      expect(hasUnknown).toBe(false);
      expect(result.current.agent?.hasAnimation).toHaveBeenCalled();
    });

    it('hasAnimation returns false when agent not loaded', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      const hasAnimation = result.current.hasAnimation('Wave');

      expect(hasAnimation).toBe(false);
    });

    it('isVisible checks visibility', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      const visible = result.current.isVisible();

      expect(visible).toBe(true);
      expect(result.current.agent?.isVisible).toHaveBeenCalled();
    });

    it('isVisible returns false when agent not loaded', () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      const visible = result.current.isVisible();

      expect(visible).toBe(false);
    });
  });

  describe('lifecycle methods', () => {
    it('reload unloads and loads agent', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.reload();
      });

      await waitFor(() => {
        // Agent should still be loaded after reload
        expect(result.current.agent).not.toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('complex interaction sequences', () => {
    it('supports chaining show, speak, and animate', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.show();
        await result.current.speak('Hello!');
        await result.current.animate();
      });

      expect(result.current.agent?.show).toHaveBeenCalled();
      expect(result.current.agent?.speak).toHaveBeenCalled();
      expect(result.current.agent?.animate).toHaveBeenCalled();
    });

    it('supports moveTo followed by gestureAt', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.moveTo(100, 100);
        await result.current.gestureAt(200, 200);
      });

      expect(result.current.agent?.moveTo).toHaveBeenCalledWith(100, 100, undefined);
      expect(result.current.agent?.gestureAt).toHaveBeenCalledWith(200, 200);
    });

    it('supports play, delay, play sequence', async () => {
      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      await act(async () => {
        await result.current.play('Wave');
        await result.current.delay(1000);
        await result.current.play('Idle');
      });

      expect(result.current.agent?.play).toHaveBeenCalledWith('Wave');
      expect(result.current.agent?.delay).toHaveBeenCalledWith(1000);
      expect(result.current.agent?.play).toHaveBeenCalledWith('Idle');
    });
  });
});
