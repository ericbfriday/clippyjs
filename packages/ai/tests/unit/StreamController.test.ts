import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamController, StreamState, StreamProgress } from '../../src/streaming/StreamController';

describe('StreamController', () => {
  let controller: StreamController;
  let onStateChange: ReturnType<typeof vi.fn>;
  let onProgress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onStateChange = vi.fn();
    onProgress = vi.fn();
    controller = new StreamController({
      trackProgress: true,
      onStateChange,
      onProgress,
    });
  });

  describe('State Machine', () => {
    it('starts in idle state', () => {
      expect(controller.getState()).toBe('idle');
    });

    it('transitions to streaming when stream starts', () => {
      controller.start();
      expect(controller.getState()).toBe('streaming');
      expect(onStateChange).toHaveBeenCalledWith('streaming');
    });

    it('transitions from streaming to paused', () => {
      controller.start();
      controller.pause();
      expect(controller.getState()).toBe('paused');
      expect(onStateChange).toHaveBeenCalledWith('paused');
    });

    it('transitions from paused to streaming on resume', () => {
      controller.start();
      controller.pause();
      controller.resume();
      expect(controller.getState()).toBe('streaming');
      expect(onStateChange).toHaveBeenCalledTimes(3); // start, pause, resume
    });

    it('transitions to cancelled from streaming', () => {
      controller.start();
      controller.cancel();
      expect(controller.getState()).toBe('cancelled');
      expect(onStateChange).toHaveBeenCalledWith('cancelled');
    });

    it('transitions to completed when complete', () => {
      controller.start();
      controller.complete();
      expect(controller.getState()).toBe('completed');
      expect(onStateChange).toHaveBeenCalledWith('completed');
    });

    it('transitions to error when setError is called', () => {
      controller.start();
      const error = new Error('Test error');
      controller.setError(error);
      expect(controller.getState()).toBe('error');
      expect(onStateChange).toHaveBeenCalledWith('error');
    });

    it('throws error when pausing non-streaming state', () => {
      expect(() => controller.pause()).toThrow('Cannot pause stream in idle state');
    });

    it('throws error when resuming non-paused state', () => {
      controller.start();
      expect(() => controller.resume()).toThrow('Cannot resume stream in streaming state');
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      controller.start();
    });

    it('initializes progress with zeros', () => {
      const progress = controller.getProgress();
      expect(progress).toEqual({
        bytes: 0,
        tokens: 0,
        chunks: 0,
        percentage: 0,
      });
    });

    it('updates progress when updateProgress is called', () => {
      controller.updateProgress(100, 25);
      const progress = controller.getProgress();
      expect(progress.bytes).toBe(100);
      expect(progress.tokens).toBe(25);
      expect(progress.chunks).toBe(1);
      expect(onProgress).toHaveBeenCalled();
    });

    it('accumulates progress across multiple updates', () => {
      controller.updateProgress(100, 25);
      controller.updateProgress(200, 50);
      controller.updateProgress(150, 30);

      const progress = controller.getProgress();
      expect(progress.bytes).toBe(450);
      expect(progress.tokens).toBe(105);
      expect(progress.chunks).toBe(3);
    });

    it('calculates percentage with total bytes', () => {
      const controllerWithTotal = new StreamController({
        trackProgress: true,
        estimatedTotalBytes: 1000,
      });
      controllerWithTotal.start();
      controllerWithTotal.updateProgress(250, 50);

      const progress = controllerWithTotal.getProgress();
      expect(progress.percentage).toBe(25);
    });

    it('calculates estimated time remaining', () => {
      vi.useFakeTimers();
      const controllerWithTotal = new StreamController({
        trackProgress: true,
        estimatedTotalBytes: 1000,
      });
      controllerWithTotal.start();

      vi.advanceTimersByTime(1000); // 1 second
      controllerWithTotal.updateProgress(250, 50);

      const progress = controllerWithTotal.getProgress();
      // 25% done in 1s = 3s remaining for remaining 75%
      expect(progress.estimatedTimeRemaining).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('calculates average rate', () => {
      vi.useFakeTimers();
      controller.start();

      vi.advanceTimersByTime(1000); // 1 second
      controller.updateProgress(100, 50);

      const progress = controller.getProgress();
      expect(progress.avgRate).toBe(50); // 50 tokens per second

      vi.useRealTimers();
    });
  });

  describe('Pause/Resume Behavior', () => {
    beforeEach(() => {
      controller.start();
    });

    it('does not update progress when paused', () => {
      controller.pause();
      controller.updateProgress(100, 25);

      const progress = controller.getProgress();
      expect(progress.bytes).toBe(0);
      expect(progress.tokens).toBe(0);
    });

    it('resumes updating progress after resume', () => {
      controller.pause();
      controller.resume();
      controller.updateProgress(100, 25);

      const progress = controller.getProgress();
      expect(progress.bytes).toBe(100);
      expect(progress.tokens).toBe(25);
    });

    it('tracks paused time separately from active time', () => {
      vi.useFakeTimers();
      const startTime = Date.now();
      controller.start();

      vi.advanceTimersByTime(1000); // Stream for 1s
      controller.updateProgress(100, 25);

      controller.pause();
      vi.advanceTimersByTime(2000); // Pause for 2s

      controller.resume();
      vi.advanceTimersByTime(1000); // Stream for 1s more
      controller.updateProgress(100, 25);

      const progress = controller.getProgress();
      // Total elapsed: 4s, but paused: 2s, so active: 2s
      // Rate should be calculated on active time only
      expect(progress.avgRate).toBe(25); // 50 tokens / 2 active seconds

      vi.useRealTimers();
    });
  });

  describe('AbortController Integration', () => {
    it('provides signal for cancellable requests', () => {
      const signal = controller.getSignal();
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('aborts signal when cancelled', () => {
      const signal = controller.getSignal();
      controller.start();
      controller.cancel();

      expect(signal.aborted).toBe(true);
    });

    it('resets signal on start', () => {
      controller.start();
      const firstSignal = controller.getSignal();
      controller.cancel();

      controller.reset();
      controller.start();
      const secondSignal = controller.getSignal();

      expect(firstSignal.aborted).toBe(true);
      expect(secondSignal.aborted).toBe(false);
      expect(firstSignal).not.toBe(secondSignal);
    });
  });

  describe('Reset Functionality', () => {
    it('resets to initial state', () => {
      controller.start();
      controller.updateProgress(100, 25);
      controller.complete();

      controller.reset();

      expect(controller.getState()).toBe('idle');
      const progress = controller.getProgress();
      expect(progress).toEqual({
        bytes: 0,
        tokens: 0,
        chunks: 0,
        percentage: 0,
      });
    });

    it('allows starting again after reset', () => {
      controller.start();
      controller.complete();
      controller.reset();

      expect(() => controller.start()).not.toThrow();
      expect(controller.getState()).toBe('streaming');
    });
  });

  describe('Configuration', () => {
    it('respects trackProgress flag', () => {
      const noTrackController = new StreamController({
        trackProgress: false,
      });
      noTrackController.start();
      noTrackController.updateProgress(100, 25);

      const progress = noTrackController.getProgress();
      // Progress still tracked but not calculated
      expect(progress.avgRate).toBeUndefined();
    });

    it('calls onStateChange callback', () => {
      const callback = vi.fn();
      const callbackController = new StreamController({
        onStateChange: callback,
      });

      callbackController.start();
      expect(callback).toHaveBeenCalledWith('streaming');

      callbackController.pause();
      expect(callback).toHaveBeenCalledWith('paused');
    });

    it('calls onProgress callback', () => {
      const callback = vi.fn();
      const callbackController = new StreamController({
        onProgress: callback,
      });

      callbackController.start();
      callbackController.updateProgress(100, 25);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          bytes: 100,
          tokens: 25,
          chunks: 1,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles zero progress updates gracefully', () => {
      controller.start();
      controller.updateProgress(0, 0);

      const progress = controller.getProgress();
      expect(progress.bytes).toBe(0);
      expect(progress.tokens).toBe(0);
      expect(progress.chunks).toBe(1); // Still counts as a chunk
    });

    it('handles multiple pause/resume cycles', () => {
      controller.start();

      for (let i = 0; i < 5; i++) {
        controller.pause();
        controller.resume();
      }

      expect(controller.getState()).toBe('streaming');
      expect(onStateChange).toHaveBeenCalledTimes(11); // start + 5*2
    });

    it('does not allow operations after completion', () => {
      controller.start();
      controller.complete();

      expect(() => controller.pause()).toThrow();
      expect(() => controller.updateProgress(100, 25)).not.toThrow();
      // Progress updates are silently ignored after completion
    });

    it('does not allow operations after cancellation', () => {
      controller.start();
      controller.cancel();

      expect(() => controller.resume()).toThrow();
    });
  });
});
