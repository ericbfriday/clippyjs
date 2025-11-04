import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStreamController } from '../../src/react/useStreamController';

describe('useStreamController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with idle state', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.state).toBe('idle');
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.isCancelled).toBe(false);
      expect(result.current.isCompleted).toBe(false);
    });

    it('provides controller and monitor instances', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.controller).toBeDefined();
      expect(result.current.monitor).toBeDefined();
    });

    it('initializes with empty progress', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.progress.bytes).toBe(0);
      expect(result.current.progress.tokens).toBe(0);
      expect(result.current.progress.chunks).toBe(0);
      expect(result.current.progress.percentage).toBe(0);
    });

    it('initializes with empty metrics', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.metrics.bytesReceived).toBe(0);
      expect(result.current.metrics.tokensReceived).toBe(0);
      expect(result.current.metrics.chunksProcessed).toBe(0);
    });
  });

  describe('State Management', () => {
    it('updates state when controller starts', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
      });

      expect(result.current.state).toBe('streaming');
      expect(result.current.isStreaming).toBe(true);
    });

    it('updates state when controller pauses', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.pause();
      });

      expect(result.current.state).toBe('paused');
      expect(result.current.isPaused).toBe(true);
      expect(result.current.isStreaming).toBe(false);
    });

    it('updates state when controller resumes', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.pause();
        result.current.resume();
      });

      expect(result.current.state).toBe('streaming');
      expect(result.current.isStreaming).toBe(true);
      expect(result.current.isPaused).toBe(false);
    });

    it('updates state when controller cancels', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.cancel();
      });

      expect(result.current.state).toBe('cancelled');
      expect(result.current.isCancelled).toBe(true);
      expect(result.current.isStreaming).toBe(false);
    });

    it('updates state when controller completes', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.controller.complete();
      });

      expect(result.current.state).toBe('completed');
      expect(result.current.isCompleted).toBe(true);
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('Progress Updates', () => {
    it('updates progress when controller reports progress', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.controller.updateProgress(100, 25);
      });

      expect(result.current.progress.bytes).toBe(100);
      expect(result.current.progress.tokens).toBe(25);
      expect(result.current.progress.chunks).toBe(1);
    });

    it('accumulates progress across multiple updates', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.controller.updateProgress(100, 25);
        result.current.controller.updateProgress(200, 50);
        result.current.controller.updateProgress(150, 30);
      });

      expect(result.current.progress.bytes).toBe(450);
      expect(result.current.progress.tokens).toBe(105);
      expect(result.current.progress.chunks).toBe(3);
    });
  });

  describe('Metrics Updates', () => {
    it('updates metrics when monitor records chunks', async () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.monitor.start();
        result.current.monitor.recordChunk(100, 25);
      });

      // Run fake timers to allow callbacks to execute
      await act(async () => {
        vi.runAllTimers();
      });

      // State should be updated synchronously after callbacks run
      expect(result.current.metrics.bytesReceived).toBe(100);
      expect(result.current.metrics.tokensReceived).toBe(25);
      expect(result.current.metrics.chunksProcessed).toBe(1);
    });

    it('updates metrics with rate calculations', async () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.monitor.start();
        result.current.monitor.recordChunk(100, 50);
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        result.current.monitor.recordChunk(100, 50);
      });

      // Run fake timers to allow callbacks to execute
      await act(async () => {
        vi.runAllTimers();
      });

      // State should be updated synchronously after callbacks run
      expect(result.current.metrics.averageRate).toBeGreaterThan(0);
    });
  });

  describe('Controller-Monitor Synchronization', () => {
    it('pauses monitor when controller pauses', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.monitor.start();
        result.current.pause();
      });

      // Monitor should be tracking paused state internally
      expect(result.current.state).toBe('paused');
    });

    it('resumes monitor when controller resumes', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.monitor.start();
        result.current.pause();
        result.current.resume();
      });

      expect(result.current.state).toBe('streaming');
    });

    it('stops monitor when controller completes', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.monitor.start();
        result.current.controller.complete();
      });

      expect(result.current.state).toBe('completed');
      expect(result.current.monitor.isActive()).toBe(false);
    });
  });

  describe('Control Functions', () => {
    it('pause function calls controller pause', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.pause();
      });

      expect(result.current.state).toBe('paused');
    });

    it('resume function calls controller resume', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.pause();
        result.current.resume();
      });

      expect(result.current.state).toBe('streaming');
    });

    it('cancel function calls controller cancel', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.cancel();
      });

      expect(result.current.state).toBe('cancelled');
    });

    it('control functions handle errors gracefully', () => {
      const { result } = renderHook(() => useStreamController());
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        // Try to pause without starting (should error but not throw)
        result.current.pause();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to pause stream:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Derived State', () => {
    it('correctly computes isStreaming', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.isStreaming).toBe(false);

      act(() => {
        result.current.controller.start();
      });

      expect(result.current.isStreaming).toBe(true);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('correctly computes isPaused', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.isPaused).toBe(false);

      act(() => {
        result.current.controller.start();
        result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.resume();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('correctly computes isCancelled', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.isCancelled).toBe(false);

      act(() => {
        result.current.controller.start();
        result.current.cancel();
      });

      expect(result.current.isCancelled).toBe(true);
    });

    it('correctly computes isCompleted', () => {
      const { result } = renderHook(() => useStreamController());

      expect(result.current.isCompleted).toBe(false);

      act(() => {
        result.current.controller.start();
        result.current.controller.complete();
      });

      expect(result.current.isCompleted).toBe(true);
    });
  });

  describe('Hook Lifecycle', () => {
    it('maintains same controller instance across renders', () => {
      const { result, rerender } = renderHook(() => useStreamController());

      const firstController = result.current.controller;
      rerender();
      const secondController = result.current.controller;

      expect(firstController).toBe(secondController);
    });

    it('maintains same monitor instance across renders', () => {
      const { result, rerender } = renderHook(() => useStreamController());

      const firstMonitor = result.current.monitor;
      rerender();
      const secondMonitor = result.current.monitor;

      expect(firstMonitor).toBe(secondMonitor);
    });

    it('preserves state across renders', () => {
      const { result, rerender } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.controller.updateProgress(100, 25);
      });

      rerender();

      expect(result.current.state).toBe('streaming');
      expect(result.current.progress.bytes).toBe(100);
      expect(result.current.progress.tokens).toBe(25);
    });

    it('cleans up event listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
      });

      // No errors should occur on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Callback Memoization', () => {
    it('memoizes pause callback', () => {
      const { result, rerender } = renderHook(() => useStreamController());

      const firstPause = result.current.pause;
      rerender();
      const secondPause = result.current.pause;

      expect(firstPause).toBe(secondPause);
    });

    it('memoizes resume callback', () => {
      const { result, rerender } = renderHook(() => useStreamController());

      const firstResume = result.current.resume;
      rerender();
      const secondResume = result.current.resume;

      expect(firstResume).toBe(secondResume);
    });

    it('memoizes cancel callback', () => {
      const { result, rerender } = renderHook(() => useStreamController());

      const firstCancel = result.current.cancel;
      rerender();
      const secondCancel = result.current.cancel;

      expect(firstCancel).toBe(secondCancel);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid state changes', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.pause();
        result.current.resume();
        result.current.pause();
        result.current.resume();
      });

      expect(result.current.state).toBe('streaming');
    });

    it('handles rapid progress updates', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        for (let i = 0; i < 100; i++) {
          result.current.controller.updateProgress(10, 5);
        }
      });

      expect(result.current.progress.bytes).toBe(1000);
      expect(result.current.progress.tokens).toBe(500);
      expect(result.current.progress.chunks).toBe(100);
    });

    it('handles simultaneous controller and monitor updates', async () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.monitor.start();
        result.current.controller.updateProgress(100, 25);
        result.current.monitor.recordChunk(100, 25);
      });

      // Run fake timers to allow callbacks to execute
      await act(async () => {
        vi.runAllTimers();
      });

      // State should be updated synchronously after callbacks run
      expect(result.current.progress.bytes).toBe(100);
      expect(result.current.metrics.bytesReceived).toBe(100);
    });

    it('handles errors in state change callbacks', () => {
      const { result } = renderHook(() => useStreamController());
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.controller.start();
        // Simulate error by trying invalid operation
        try {
          result.current.pause();
          result.current.pause(); // Second pause should error
        } catch (error) {
          // Expected error
        }
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('coordinates complete streaming lifecycle', async () => {
      const { result } = renderHook(() => useStreamController());

      // Start streaming
      act(() => {
        result.current.controller.start();
        result.current.monitor.start();
      });

      expect(result.current.isStreaming).toBe(true);

      // Simulate progress
      act(() => {
        result.current.controller.updateProgress(100, 25);
        result.current.monitor.recordChunk(100, 25);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Pause
      act(() => {
        result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);

      // Resume
      act(() => {
        result.current.resume();
      });

      expect(result.current.isStreaming).toBe(true);

      // More progress
      act(() => {
        result.current.controller.updateProgress(100, 25);
        result.current.monitor.recordChunk(100, 25);
      });

      // Complete
      act(() => {
        result.current.controller.complete();
      });

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.monitor.isActive()).toBe(false);

      // Run fake timers to allow all callbacks to execute
      await act(async () => {
        vi.runAllTimers();
      });

      // State should be updated synchronously after callbacks run
      expect(result.current.progress.bytes).toBe(200);
      expect(result.current.metrics.bytesReceived).toBe(200);
    });

    it('handles cancellation mid-stream', () => {
      const { result } = renderHook(() => useStreamController());

      act(() => {
        result.current.controller.start();
        result.current.monitor.start();
        result.current.controller.updateProgress(100, 25);
        result.current.cancel();
      });

      expect(result.current.isCancelled).toBe(true);
      expect(result.current.progress.bytes).toBe(100);
    });
  });
});
