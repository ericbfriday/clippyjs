/**
 * Tests for DegradationManager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  DegradationManager,
  DegradationLevel,
  FallbackStrategy,
} from '../../../src/resilience/DegradationManager';

// Mock fallback strategy
class MockFallbackStrategy implements FallbackStrategy {
  private available: boolean;
  private response: any;
  private quality: number;

  constructor(available = true, response: any = 'fallback', quality = 0.8) {
    this.available = available;
    this.response = response;
    this.quality = quality;
  }

  async execute(): Promise<any> {
    return this.response;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  getQualityScore(): number {
    return this.quality;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }
}

describe('DegradationManager', () => {
  let manager: DegradationManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new DegradationManager({
      autoDegrade: true,
      autoRecover: false, // Disable for most tests
    });
  });

  afterEach(() => {
    manager.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Feature Registration', () => {
    it('should register a feature', () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      const status = manager.getFeatureStatus('test-feature');
      expect(status).toBeDefined();
      expect(status?.name).toBe('test-feature');
      expect(status?.level).toBe(DegradationLevel.FULL);
    });

    it('should register feature with dependencies', () => {
      manager.registerFeature({
        name: 'dependent-feature',
        dependencies: ['dependency-1', 'dependency-2'],
      });

      const status = manager.getFeatureStatus('dependent-feature');
      expect(status?.dependencies).toEqual(['dependency-1', 'dependency-2']);
    });

    it('should register feature with fallback', () => {
      const fallback = new MockFallbackStrategy();

      manager.registerFeature({
        name: 'test-feature',
        fallback,
      });

      const status = manager.getFeatureStatus('test-feature');
      expect(status).toBeDefined();
    });

    it('should unregister a feature', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      await manager.unregisterFeature('test-feature');

      const status = manager.getFeatureStatus('test-feature');
      expect(status).toBeUndefined();
    });
  });

  describe('Feature Degradation', () => {
    it('should degrade a feature', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      await manager.degrade('test-feature', DegradationLevel.PARTIAL, 'Testing');

      const status = manager.getFeatureStatus('test-feature');
      expect(status?.level).toBe(DegradationLevel.PARTIAL);
      expect(status?.reason).toBe('Testing');
      expect(status?.degradedAt).toBeDefined();
    });

    it('should activate fallback on degradation', async () => {
      const fallback = new MockFallbackStrategy();

      manager.registerFeature({
        name: 'test-feature',
        fallback,
      });

      await manager.degrade('test-feature', DegradationLevel.PARTIAL);

      const status = manager.getFeatureStatus('test-feature');
      expect(status?.fallbackActive).toBe(true);
    });

    it('should not activate unavailable fallback', async () => {
      const fallback = new MockFallbackStrategy(false);

      manager.registerFeature({
        name: 'test-feature',
        fallback,
      });

      await manager.degrade('test-feature', DegradationLevel.PARTIAL);

      const status = manager.getFeatureStatus('test-feature');
      expect(status?.fallbackActive).toBe(false);
    });

    it('should throw error for unregistered feature', async () => {
      await expect(
        manager.degrade('unknown-feature', DegradationLevel.PARTIAL)
      ).rejects.toThrow('Feature not registered');
    });
  });

  describe('Feature Recovery', () => {
    it('should recover a feature', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      await manager.degrade('test-feature', DegradationLevel.PARTIAL);
      await manager.recover('test-feature');

      const status = manager.getFeatureStatus('test-feature');
      expect(status?.level).toBe(DegradationLevel.FULL);
      expect(status?.degradedAt).toBeUndefined();
      expect(status?.reason).toBeUndefined();
    });

    it('should not recover if dependencies unhealthy', async () => {
      manager.registerFeature({
        name: 'dependency',
      });

      manager.registerFeature({
        name: 'dependent',
        dependencies: ['dependency'],
      });

      await manager.degrade('dependency', DegradationLevel.UNAVAILABLE);
      await manager.degrade('dependent', DegradationLevel.PARTIAL);

      await manager.recover('dependent');

      const status = manager.getFeatureStatus('dependent');
      expect(status?.level).not.toBe(DegradationLevel.FULL);
    });

    it('should recover when dependencies become healthy', async () => {
      manager.registerFeature({
        name: 'dependency',
      });

      manager.registerFeature({
        name: 'dependent',
        dependencies: ['dependency'],
      });

      await manager.degrade('dependency', DegradationLevel.UNAVAILABLE);
      await manager.degrade('dependent', DegradationLevel.PARTIAL);

      // Recover dependency first
      await manager.recover('dependency');

      // Now dependent can recover
      await manager.recover('dependent');

      const status = manager.getFeatureStatus('dependent');
      expect(status?.level).toBe(DegradationLevel.FULL);
    });
  });

  describe('Dependency Management', () => {
    it('should cascade degradation to dependents', async () => {
      manager.registerFeature({
        name: 'dependency',
      });

      manager.registerFeature({
        name: 'dependent',
        dependencies: ['dependency'],
      });

      await manager.degrade('dependency', DegradationLevel.MINIMAL);

      const status = manager.getFeatureStatus('dependent');
      expect(status?.level).toBe(DegradationLevel.MINIMAL);
    });

    it('should degrade multiple dependents', async () => {
      manager.registerFeature({
        name: 'dependency',
      });

      manager.registerFeature({
        name: 'dependent-1',
        dependencies: ['dependency'],
      });

      manager.registerFeature({
        name: 'dependent-2',
        dependencies: ['dependency'],
      });

      await manager.degrade('dependency', DegradationLevel.UNAVAILABLE);

      expect(manager.getFeatureStatus('dependent-1')?.level).toBe(
        DegradationLevel.UNAVAILABLE
      );
      expect(manager.getFeatureStatus('dependent-2')?.level).toBe(
        DegradationLevel.UNAVAILABLE
      );
    });
  });

  describe('Fallback Execution', () => {
    it('should execute with fallback on degradation', async () => {
      const fallback = new MockFallbackStrategy(true, 'fallback-result');

      manager.registerFeature({
        name: 'test-feature',
        fallback,
      });

      await manager.degrade('test-feature', DegradationLevel.UNAVAILABLE);

      const result = await manager.executeWithFallback(
        'test-feature',
        async () => 'primary-result'
      );

      expect(result).toBe('fallback-result');
    });

    it('should use primary operation when not degraded', async () => {
      const fallback = new MockFallbackStrategy(true, 'fallback-result');

      manager.registerFeature({
        name: 'test-feature',
        fallback,
      });

      const result = await manager.executeWithFallback(
        'test-feature',
        async () => 'primary-result'
      );

      expect(result).toBe('primary-result');
    });

    it('should use fallback on operation failure with auto-degrade', async () => {
      const fallback = new MockFallbackStrategy(true, 'fallback-result');

      const autoManager = new DegradationManager({
        autoDegrade: true,
      });

      autoManager.registerFeature({
        name: 'test-feature',
        fallback,
      });

      const result = await autoManager.executeWithFallback('test-feature', async () => {
        throw new Error('Operation failed');
      });

      expect(result).toBe('fallback-result');

      const status = autoManager.getFeatureStatus('test-feature');
      expect(status?.level).toBe(DegradationLevel.PARTIAL);

      await autoManager.destroy();
    });

    it('should throw error if unavailable and no fallback', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      await manager.degrade('test-feature', DegradationLevel.UNAVAILABLE);

      await expect(
        manager.executeWithFallback('test-feature', async () => 'result')
      ).rejects.toThrow('Feature unavailable and no fallback');
    });
  });

  describe('Status Reporting', () => {
    it('should report degradation status', () => {
      manager.registerFeature({
        name: 'feature-1',
        priority: 10,
      });

      manager.registerFeature({
        name: 'feature-2',
        priority: 5,
      });

      const status = manager.getStatus();

      expect(status.globalLevel).toBe(DegradationLevel.FULL);
      expect(status.degradedCount).toBe(0);
      expect(status.unavailableCount).toBe(0);
      expect(status.healthScore).toBe(100);
    });

    it('should calculate health score based on priority', async () => {
      manager.registerFeature({
        name: 'high-priority',
        priority: 10,
      });

      manager.registerFeature({
        name: 'low-priority',
        priority: 1,
      });

      await manager.degrade('low-priority', DegradationLevel.UNAVAILABLE);

      const status = manager.getStatus();
      expect(status.healthScore).toBeGreaterThan(80); // High priority still healthy
    });

    it('should track degraded count', async () => {
      manager.registerFeature({ name: 'feature-1' });
      manager.registerFeature({ name: 'feature-2' });
      manager.registerFeature({ name: 'feature-3' });

      await manager.degrade('feature-1', DegradationLevel.PARTIAL);
      await manager.degrade('feature-2', DegradationLevel.MINIMAL);

      const status = manager.getStatus();
      expect(status.degradedCount).toBe(2);
    });

    it('should determine global degradation level', async () => {
      manager.registerFeature({ name: 'feature-1' });
      manager.registerFeature({ name: 'feature-2' });

      await manager.degrade('feature-1', DegradationLevel.UNAVAILABLE);

      const status = manager.getStatus();
      expect(status.globalLevel).not.toBe(DegradationLevel.FULL);
    });
  });

  describe('Event History', () => {
    it('should track degradation events', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      await manager.degrade('test-feature', DegradationLevel.PARTIAL);

      const history = manager.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe('degraded');
      expect(history[0].feature).toBe('test-feature');
    });

    it('should track recovery events', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      await manager.degrade('test-feature', DegradationLevel.PARTIAL);
      await manager.recover('test-feature');

      const history = manager.getHistory();
      const recoveryEvent = history.find(e => e.type === 'recovered');
      expect(recoveryEvent).toBeDefined();
      expect(recoveryEvent?.feature).toBe('test-feature');
    });

    it('should limit history size', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      // Generate many events
      for (let i = 0; i < 10; i++) {
        await manager.degrade('test-feature', DegradationLevel.PARTIAL);
        await manager.recover('test-feature');
      }

      const history = manager.getHistory(5);
      expect(history.length).toBe(5);
    });
  });

  describe('Auto Recovery', () => {
    it('should auto-recover features when enabled', async () => {
      const autoManager = new DegradationManager({
        autoRecover: true,
        recoveryCheckInterval: 1000,
      });

      autoManager.registerFeature({
        name: 'dependency',
        autoRecover: true,
      });

      autoManager.registerFeature({
        name: 'dependent',
        dependencies: ['dependency'],
        autoRecover: true,
      });

      await autoManager.degrade('dependency', DegradationLevel.UNAVAILABLE);
      await autoManager.degrade('dependent', DegradationLevel.PARTIAL);

      // Recover dependency
      await autoManager.recover('dependency');

      // Advance time to trigger auto-recovery check (this schedules the callback)
      await vi.advanceTimersByTimeAsync(1100);

      // Dependent should auto-recover
      const status = autoManager.getFeatureStatus('dependent');
      expect(status?.level).toBe(DegradationLevel.FULL);

      // Destroy to stop the interval and prevent infinite loop
      await autoManager.destroy();
    });
  });

  describe('isDegraded', () => {
    it('should return true for degraded features', async () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      await manager.degrade('test-feature', DegradationLevel.PARTIAL);

      expect(manager.isDegraded('test-feature')).toBe(true);
    });

    it('should return false for healthy features', () => {
      manager.registerFeature({
        name: 'test-feature',
      });

      expect(manager.isDegraded('test-feature')).toBe(false);
    });
  });
});
