import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamMonitor, StreamMetrics } from '../../src/streaming/StreamMonitor';

describe('StreamMonitor', () => {
  let monitor: StreamMonitor;
  let onMetricsUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onMetricsUpdate = vi.fn();
    monitor = new StreamMonitor({
      detailedMetrics: true,
      samplingInterval: 1000,
      onMetricsUpdate,
    });
  });

  describe('Initialization', () => {
    it('starts with empty metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.bytesReceived).toBe(0);
      expect(metrics.tokensReceived).toBe(0);
      expect(metrics.chunksProcessed).toBe(0);
      expect(metrics.currentRate).toBe(0);
      expect(metrics.averageRate).toBe(0);
    });

    it('is not active initially', () => {
      expect(monitor.isActive()).toBe(false);
    });
  });

  describe('Basic Tracking', () => {
    beforeEach(() => {
      monitor.start();
    });

    it('tracks bytes received', () => {
      monitor.recordChunk(100, 25);
      expect(monitor.getBytesReceived()).toBe(100);

      monitor.recordChunk(200, 50);
      expect(monitor.getBytesReceived()).toBe(300);
    });

    it('tracks tokens received', () => {
      monitor.recordChunk(100, 25);
      expect(monitor.getTokensReceived()).toBe(25);

      monitor.recordChunk(200, 50);
      expect(monitor.getTokensReceived()).toBe(75);
    });

    it('tracks chunks processed', () => {
      monitor.recordChunk(100, 25);
      monitor.recordChunk(200, 50);
      monitor.recordChunk(150, 30);

      const metrics = monitor.getMetrics();
      expect(metrics.chunksProcessed).toBe(3);
    });

    it('calls onMetricsUpdate callback', () => {
      monitor.recordChunk(100, 25);
      expect(onMetricsUpdate).toHaveBeenCalled();
    });
  });

  describe('Rate Calculations', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      monitor.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calculates current rate', () => {
      monitor.recordChunk(100, 50);
      vi.advanceTimersByTime(1000); // 1 second

      monitor.recordChunk(100, 50);

      const rate = monitor.getCurrentRate();
      expect(rate).toBeGreaterThan(0);
    });

    it('calculates average rate', () => {
      monitor.recordChunk(100, 50);
      vi.advanceTimersByTime(1000); // 1 second

      const avgRate = monitor.getAverageRate();
      expect(avgRate).toBe(50); // 50 tokens / 1 second
    });

    it('tracks peak rate', () => {
      monitor.recordChunk(100, 25);
      vi.advanceTimersByTime(500);

      monitor.recordChunk(200, 100); // High rate burst
      vi.advanceTimersByTime(500);

      monitor.recordChunk(100, 25);

      const metrics = monitor.getMetrics();
      expect(metrics.peakRate).toBeGreaterThan(metrics.averageRate);
    });

    it('tracks minimum rate', () => {
      monitor.recordChunk(200, 100);
      vi.advanceTimersByTime(500);

      monitor.recordChunk(100, 25); // Low rate
      vi.advanceTimersByTime(1500);

      const metrics = monitor.getMetrics();
      expect(metrics.minRate).toBeGreaterThan(0);
      expect(metrics.minRate).toBeLessThan(metrics.peakRate);
    });

    it('uses rolling window for current rate', () => {
      // Record initial chunks
      monitor.recordChunk(100, 50);
      vi.advanceTimersByTime(500);
      monitor.recordChunk(100, 50);

      const rate1 = monitor.getCurrentRate();

      // Wait longer than sampling interval
      vi.advanceTimersByTime(2000);

      // New chunk after old ones expire from window
      monitor.recordChunk(100, 50);

      const rate2 = monitor.getCurrentRate();

      // Rates should be different due to window expiration
      expect(rate2).not.toBe(rate1);
    });
  });

  describe('Time Tracking', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      monitor.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('tracks elapsed time', () => {
      vi.advanceTimersByTime(5000); // 5 seconds
      monitor.recordChunk(100, 25);

      const metrics = monitor.getMetrics();
      expect(metrics.elapsedTime).toBeGreaterThanOrEqual(5000);
    });

    it('tracks active time excluding pauses', () => {
      vi.advanceTimersByTime(1000); // 1s streaming
      monitor.recordChunk(100, 25);

      monitor.pause();
      vi.advanceTimersByTime(2000); // 2s paused

      monitor.resume();
      vi.advanceTimersByTime(1000); // 1s streaming

      const metrics = monitor.getMetrics();
      expect(metrics.elapsedTime).toBeGreaterThanOrEqual(4000); // Total 4s
      expect(metrics.pausedTime).toBeGreaterThanOrEqual(2000); // Paused 2s
      expect(metrics.activeTime).toBeGreaterThanOrEqual(2000); // Active 2s
    });

    it('handles multiple pause/resume cycles', () => {
      vi.advanceTimersByTime(1000);
      monitor.pause();
      vi.advanceTimersByTime(1000);
      monitor.resume();

      vi.advanceTimersByTime(1000);
      monitor.pause();
      vi.advanceTimersByTime(1000);
      monitor.resume();

      vi.advanceTimersByTime(1000);

      const metrics = monitor.getMetrics();
      expect(metrics.pausedTime).toBeGreaterThanOrEqual(2000); // 2s total paused
      expect(metrics.activeTime).toBeGreaterThanOrEqual(3000); // 3s total active
    });
  });

  describe('Average Calculations', () => {
    beforeEach(() => {
      monitor.start();
    });

    it('calculates average chunk size', () => {
      monitor.recordChunk(100, 25);
      monitor.recordChunk(200, 50);
      monitor.recordChunk(300, 75);

      const metrics = monitor.getMetrics();
      expect(metrics.avgChunkSize).toBe(200); // (100 + 200 + 300) / 3
    });

    it('calculates average tokens per chunk', () => {
      monitor.recordChunk(100, 20);
      monitor.recordChunk(200, 40);
      monitor.recordChunk(300, 60);

      const metrics = monitor.getMetrics();
      expect(metrics.avgTokensPerChunk).toBe(40); // (20 + 40 + 60) / 3
    });
  });

  describe('Pause/Resume Behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      monitor.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('continues tracking when paused', () => {
      monitor.recordChunk(100, 25);
      monitor.pause();
      monitor.recordChunk(100, 25);

      expect(monitor.getBytesReceived()).toBe(200);
      expect(monitor.getTokensReceived()).toBe(50);
    });

    it('excludes paused time from rate calculations', () => {
      monitor.recordChunk(100, 50);
      vi.advanceTimersByTime(1000); // 1s active

      monitor.pause();
      vi.advanceTimersByTime(5000); // 5s paused

      monitor.resume();
      vi.advanceTimersByTime(1000); // 1s active

      monitor.recordChunk(100, 50);

      const metrics = monitor.getMetrics();
      // Average rate should be 50 tokens / 2 active seconds = 50 tokens/sec
      expect(metrics.averageRate).toBeCloseTo(50, 0);
    });
  });

  describe('Start/Stop Lifecycle', () => {
    it('activates on start', () => {
      monitor.start();
      expect(monitor.isActive()).toBe(true);
    });

    it('deactivates on stop', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isActive()).toBe(false);
    });

    it('ignores recordChunk when not active', () => {
      monitor.recordChunk(100, 25);

      expect(monitor.getBytesReceived()).toBe(0);
      expect(monitor.getTokensReceived()).toBe(0);
    });

    it('preserves metrics after stop', () => {
      monitor.start();
      monitor.recordChunk(100, 25);
      monitor.recordChunk(200, 50);
      monitor.stop();

      const metrics = monitor.getMetrics();
      expect(metrics.bytesReceived).toBe(300);
      expect(metrics.tokensReceived).toBe(75);
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      monitor.start();
      monitor.recordChunk(100, 25);
      monitor.recordChunk(200, 50);
    });

    it('resets all metrics to zero', () => {
      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.bytesReceived).toBe(0);
      expect(metrics.tokensReceived).toBe(0);
      expect(metrics.chunksProcessed).toBe(0);
      expect(metrics.currentRate).toBe(0);
      expect(metrics.averageRate).toBe(0);
    });

    it('deactivates monitor', () => {
      monitor.reset();
      expect(monitor.isActive()).toBe(false);
    });

    it('allows restarting after reset', () => {
      monitor.reset();
      monitor.start();

      expect(monitor.isActive()).toBe(true);
      monitor.recordChunk(100, 25);
      expect(monitor.getBytesReceived()).toBe(100);
    });
  });

  describe('Progress Conversion', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      monitor.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('converts metrics to progress object', () => {
      monitor.recordChunk(100, 25);
      vi.advanceTimersByTime(1000);

      const progress = monitor.toProgress();

      expect(progress.bytes).toBe(100);
      expect(progress.tokens).toBe(25);
      expect(progress.chunks).toBe(1);
      expect(progress.avgRate).toBeGreaterThan(0);
      expect(progress.percentage).toBe(0); // Controller manages percentage
    });
  });

  describe('Configuration', () => {
    it('respects detailedMetrics flag', () => {
      const simpleMonitor = new StreamMonitor({
        detailedMetrics: false,
      });
      simpleMonitor.start();
      simpleMonitor.recordChunk(100, 25);

      const metrics = simpleMonitor.getMetrics();
      // Still tracks basic metrics
      expect(metrics.bytesReceived).toBe(100);
      expect(metrics.tokensReceived).toBe(25);
    });

    it('respects custom sampling interval', () => {
      vi.useFakeTimers();
      const customMonitor = new StreamMonitor({
        detailedMetrics: true,
        samplingInterval: 2000, // 2 seconds
      });

      customMonitor.start();
      customMonitor.recordChunk(100, 50);

      vi.advanceTimersByTime(2500); // Past sampling interval

      customMonitor.recordChunk(100, 50);

      // Should recalculate rate with new window
      const rate = customMonitor.getCurrentRate();
      expect(rate).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('calls onMetricsUpdate callback', () => {
      const callback = vi.fn();
      const callbackMonitor = new StreamMonitor({
        onMetricsUpdate: callback,
      });

      callbackMonitor.start();
      callbackMonitor.recordChunk(100, 25);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          bytesReceived: 100,
          tokensReceived: 25,
          chunksProcessed: 1,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      monitor.start();
    });

    it('handles zero-byte chunks', () => {
      monitor.recordChunk(0, 0);

      const metrics = monitor.getMetrics();
      expect(metrics.chunksProcessed).toBe(1);
      expect(metrics.avgChunkSize).toBe(0);
    });

    it('handles very large chunks', () => {
      const largeBytes = 1024 * 1024 * 10; // 10MB
      const largeTokens = 100000;

      monitor.recordChunk(largeBytes, largeTokens);

      expect(monitor.getBytesReceived()).toBe(largeBytes);
      expect(monitor.getTokensReceived()).toBe(largeTokens);
    });

    it('handles rapid successive chunks', () => {
      vi.useFakeTimers();

      for (let i = 0; i < 100; i++) {
        monitor.recordChunk(10, 5);
        vi.advanceTimersByTime(10); // 10ms between chunks
      }

      const metrics = monitor.getMetrics();
      expect(metrics.chunksProcessed).toBe(100);
      expect(metrics.bytesReceived).toBe(1000);
      expect(metrics.tokensReceived).toBe(500);

      vi.useRealTimers();
    });

    it('handles pause at start', () => {
      monitor.pause();

      expect(() => monitor.recordChunk(100, 25)).not.toThrow();
    });

    it('handles multiple starts', () => {
      monitor.start();
      monitor.start();

      expect(monitor.isActive()).toBe(true);
    });

    it('handles multiple stops', () => {
      monitor.start();
      monitor.stop();
      monitor.stop();

      expect(monitor.isActive()).toBe(false);
    });
  });

  describe('Timestamp Tracking', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      monitor.start();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('tracks start time', () => {
      const startTime = Date.now();
      const metrics = monitor.getMetrics();
      expect(metrics.startTime).toBe(startTime);
    });

    it('updates last update time', () => {
      const initialMetrics = monitor.getMetrics();
      const initialTime = initialMetrics.lastUpdateTime;

      vi.advanceTimersByTime(1000);
      monitor.recordChunk(100, 25);

      const updatedMetrics = monitor.getMetrics();
      expect(updatedMetrics.lastUpdateTime).toBeGreaterThan(initialTime);
    });
  });
});
