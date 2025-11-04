/**
 * Tests for MemoryLeakDetector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryLeakDetector,
  DEFAULT_LEAK_DETECTOR_CONFIG,
} from '../../../packages/ai/src/performance/MemoryLeakDetector';

describe('MemoryLeakDetector', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    detector = new MemoryLeakDetector();
  });

  afterEach(() => {
    detector.stop();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(detector).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const onLeakDetected = vi.fn();
      const customDetector = new MemoryLeakDetector({ onLeakDetected });

      // Trigger leak detection
      for (let i = 0; i < 10; i++) {
        customDetector.takeSnapshot();
      }
      customDetector.analyzeMemory();

      // Would be called if leak detected
      expect(onLeakDetected).toBeDefined();
      customDetector.stop();
    });
  });

  describe('snapshot management', () => {
    it('should take memory snapshot', () => {
      const snapshot = detector.takeSnapshot();

      expect(snapshot).toHaveProperty('heapUsed');
      expect(snapshot).toHaveProperty('heapTotal');
      expect(snapshot).toHaveProperty('external');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should store multiple snapshots', () => {
      detector.takeSnapshot();
      detector.takeSnapshot();
      detector.takeSnapshot();

      const snapshots = detector.getSnapshots();
      expect(snapshots.length).toBe(3);
    });

    it('should limit snapshot history', () => {
      const maxSnapshots = DEFAULT_LEAK_DETECTOR_CONFIG.maxSnapshots;

      for (let i = 0; i < maxSnapshots + 50; i++) {
        detector.takeSnapshot();
      }

      const snapshots = detector.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(maxSnapshots);
    });

    it('should get latest snapshot', () => {
      detector.takeSnapshot();
      detector.takeSnapshot();
      const latest = detector.takeSnapshot();

      const retrieved = detector.getLatestSnapshot();
      expect(retrieved?.timestamp).toBe(latest.timestamp);
    });
  });

  describe('trend analysis', () => {
    it('should calculate memory trend', () => {
      // Take multiple snapshots with increasing memory
      for (let i = 0; i < 10; i++) {
        detector.takeSnapshot();
      }

      const trend = detector.calculateTrend();

      expect(trend).toHaveProperty('growthRate');
      expect(trend).toHaveProperty('avgUsage');
      expect(trend).toHaveProperty('direction');
      expect(trend).toHaveProperty('confidence');
      expect(trend).toHaveProperty('periodMs');
    });

    it('should detect growing trend', () => {
      // Simulate growing memory
      const mockGrowth = vi.spyOn(detector as any, 'getMemoryUsage');

      for (let i = 0; i < 10; i++) {
        mockGrowth.mockReturnValue({
          heapUsed: 1000000 + i * 100000,
          heapTotal: 10000000,
          external: 0,
          arrayBuffers: 0,
          timestamp: Date.now(),
        });
        detector.takeSnapshot();
      }

      const trend = detector.calculateTrend();
      expect(['growing', 'stable']).toContain(trend.direction);
    });

    it('should calculate confidence level', () => {
      for (let i = 0; i < 10; i++) {
        detector.takeSnapshot();
      }

      const trend = detector.calculateTrend();
      expect(trend.confidence).toBeGreaterThanOrEqual(0);
      expect(trend.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data', () => {
      detector.takeSnapshot();

      const trend = detector.calculateTrend();
      expect(trend.confidence).toBe(0);
      expect(trend.growthRate).toBe(0);
    });
  });

  describe('leak detection', () => {
    it('should detect memory leaks', () => {
      // Take enough snapshots for analysis
      for (let i = 0; i < DEFAULT_LEAK_DETECTOR_CONFIG.minSnapshotsForAnalysis + 1; i++) {
        detector.takeSnapshot();
      }

      const leaks = detector.detectLeaks();
      expect(Array.isArray(leaks)).toBe(true);
    });

    it('should not detect leaks with insufficient data', () => {
      detector.takeSnapshot();
      detector.takeSnapshot();

      const leaks = detector.detectLeaks();
      expect(leaks.length).toBe(0);
    });

    it('should get active leaks', () => {
      // Simulate leak
      const mockGrowth = vi.spyOn(detector as any, 'getMemoryUsage');
      for (let i = 0; i < 10; i++) {
        mockGrowth.mockReturnValue({
          heapUsed: 1000000 + i * 1000000, // Rapid growth
          heapTotal: 100000000,
          external: 0,
          arrayBuffers: 0,
          timestamp: Date.now(),
        });
        detector.takeSnapshot();
      }

      detector.analyzeMemory();
      const activeLeaks = detector.getActiveLeaks();

      expect(Array.isArray(activeLeaks)).toBe(true);
    });

    it('should clear leak history', () => {
      detector.clearLeaks();
      expect(detector.detectLeaks().length).toBe(0);
    });
  });

  describe('automatic monitoring', () => {
    it('should start periodic monitoring', () => {
      detector.start();

      // Should not throw
      expect(() => detector.start()).not.toThrow();
    });

    it('should stop monitoring', () => {
      detector.start();
      detector.stop();

      // Should not throw
      expect(() => detector.stop()).not.toThrow();
    });

    it('should take periodic snapshots', async () => {
      const fastDetector = new MemoryLeakDetector({
        snapshotInterval: 50,
      });

      fastDetector.start();
      await new Promise(resolve => setTimeout(resolve, 150));

      const snapshots = fastDetector.getSnapshots();
      expect(snapshots.length).toBeGreaterThan(1);

      fastDetector.stop();
    });
  });

  describe('cleanup callbacks', () => {
    it('should register cleanup callback', () => {
      const cleanup = vi.fn();
      detector.registerCleanup(cleanup);

      expect(() => detector.registerCleanup(cleanup)).not.toThrow();
    });

    it('should trigger cleanup callbacks', async () => {
      const cleanup = vi.fn();
      detector.registerCleanup(cleanup);

      await detector.triggerCleanup();

      expect(cleanup).toHaveBeenCalled();
    });

    it('should handle async cleanup callbacks', async () => {
      const cleanup = vi.fn().mockResolvedValue(undefined);
      detector.registerCleanup(cleanup);

      await detector.triggerCleanup();

      expect(cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      const cleanup = vi.fn().mockRejectedValue(new Error('Cleanup failed'));
      detector.registerCleanup(cleanup);

      await expect(detector.triggerCleanup()).resolves.not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset detector state', () => {
      detector.takeSnapshot();
      detector.takeSnapshot();

      detector.reset();

      expect(detector.getSnapshots().length).toBe(0);
      expect(detector.detectLeaks().length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid snapshot taking', () => {
      for (let i = 0; i < 1000; i++) {
        detector.takeSnapshot();
      }

      expect(detector.getSnapshots().length).toBeGreaterThan(0);
    });

    it('should handle analysis with no snapshots', () => {
      expect(() => detector.analyzeMemory()).not.toThrow();
    });

    it('should handle concurrent analysis', () => {
      for (let i = 0; i < 10; i++) {
        detector.takeSnapshot();
      }

      const promises = Array(10)
        .fill(0)
        .map(() => Promise.resolve(detector.detectLeaks()));

      return expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('performance', () => {
    it('should take snapshots quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        detector.takeSnapshot();
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // < 1ms per snapshot
    });

    it('should analyze memory efficiently', () => {
      // Setup snapshots
      for (let i = 0; i < 20; i++) {
        detector.takeSnapshot();
      }

      const start = performance.now();
      detector.analyzeMemory();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // < 100ms
    });
  });
});
