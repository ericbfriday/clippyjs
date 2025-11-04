/**
 * Tests for ResourceBudgetManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResourceBudgetManager,
  DEFAULT_BUDGETS,
  DEFAULT_ENFORCEMENT,
} from '../../../packages/ai/src/performance/ResourceBudget';

describe('ResourceBudgetManager', () => {
  let manager: ResourceBudgetManager;

  beforeEach(() => {
    manager = new ResourceBudgetManager();
  });

  describe('initialization', () => {
    it('should initialize with default budgets', () => {
      const budgets = manager.getBudgets();
      expect(budgets.memory).toBe(DEFAULT_BUDGETS.memory);
      expect(budgets.storage).toBe(DEFAULT_BUDGETS.storage);
      expect(budgets.network).toBe(DEFAULT_BUDGETS.network);
      expect(budgets.cpuTime).toBe(DEFAULT_BUDGETS.cpuTime);
    });

    it('should accept custom budgets', () => {
      const customBudgets = {
        memory: 50 * 1024 * 1024,
        network: 200 * 1024,
      };
      const customManager = new ResourceBudgetManager(customBudgets);
      const budgets = customManager.getBudgets();

      expect(budgets.memory).toBe(customBudgets.memory);
      expect(budgets.network).toBe(customBudgets.network);
    });

    it('should accept custom enforcement config', () => {
      const onViolation = vi.fn();
      const customManager = new ResourceBudgetManager({}, { onViolation });

      customManager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.9);
      customManager.enforceBudget();

      expect(onViolation).toHaveBeenCalled();
    });
  });

  describe('budget management', () => {
    it('should set budget for resource', () => {
      manager.setBudget('memory', 100 * 1024 * 1024);
      expect(manager.getBudget('memory')).toBe(100 * 1024 * 1024);
    });

    it('should throw error for negative budget', () => {
      expect(() => {
        manager.setBudget('memory', -1000);
      }).toThrow();
    });

    it('should throw error for zero budget', () => {
      expect(() => {
        manager.setBudget('memory', 0);
      }).toThrow();
    });

    it('should return all budgets', () => {
      const budgets = manager.getBudgets();
      expect(budgets).toHaveProperty('memory');
      expect(budgets).toHaveProperty('storage');
      expect(budgets).toHaveProperty('network');
      expect(budgets).toHaveProperty('cpuTime');
    });
  });

  describe('budget checking', () => {
    it('should allow operations within budget', () => {
      const smallUsage = 1000;
      expect(manager.checkBudget('memory', smallUsage)).toBe(true);
    });

    it('should reject operations exceeding budget', () => {
      const largeUsage = DEFAULT_BUDGETS.memory * 2;
      expect(manager.checkBudget('memory', largeUsage)).toBe(false);
    });

    it('should account for current usage', () => {
      const halfBudget = DEFAULT_BUDGETS.memory * 0.5;
      manager.recordUsage('memory', halfBudget);

      // Should still allow small operations
      expect(manager.checkBudget('memory', 1000)).toBe(true);

      // Should reject operations that would exceed budget
      expect(manager.checkBudget('memory', halfBudget)).toBe(false);
    });

    it('should use critical threshold for rejection', () => {
      const criticalThreshold = DEFAULT_ENFORCEMENT.criticalThreshold;
      const justUnderCritical = DEFAULT_BUDGETS.memory * (criticalThreshold - 0.01);

      expect(manager.checkBudget('memory', justUnderCritical)).toBe(true);

      const justOverCritical = DEFAULT_BUDGETS.memory * (criticalThreshold + 0.01);
      expect(manager.checkBudget('memory', justOverCritical)).toBe(false);
    });
  });

  describe('usage recording', () => {
    it('should record usage for resource', () => {
      const usage = 5 * 1024 * 1024;
      manager.recordUsage('memory', usage);

      expect(manager.getCurrentUsage('memory')).toBe(usage);
    });

    it('should track multiple measurements', () => {
      manager.recordUsage('memory', 1000);
      manager.recordUsage('memory', 2000);
      manager.recordUsage('memory', 3000);

      // Should return most recent for absolute resources
      expect(manager.getCurrentUsage('memory')).toBe(3000);
    });

    it('should calculate rate for network usage', () => {
      // Record multiple network measurements
      manager.recordUsage('network', 1000);
      manager.recordUsage('network', 2000);
      manager.recordUsage('network', 3000);

      const usage = manager.getCurrentUsage('network');
      // Should sum recent measurements for rate-based resources
      expect(usage).toBeGreaterThan(0);
    });

    it('should calculate rate for CPU usage', () => {
      manager.recordUsage('cpuTime', 100);
      manager.recordUsage('cpuTime', 200);

      const usage = manager.getCurrentUsage('cpuTime');
      expect(usage).toBeGreaterThan(0);
    });

    it('should limit measurement history', () => {
      // Record more than max measurements
      for (let i = 0; i < 150; i++) {
        manager.recordUsage('memory', i * 1000);
      }

      // Should still function correctly
      const usage = manager.getCurrentUsage('memory');
      expect(usage).toBeGreaterThan(0);
    });
  });

  describe('usage retrieval', () => {
    it('should get current usage for all resources', () => {
      manager.recordUsage('memory', 1000);
      manager.recordUsage('storage', 2000);
      manager.recordUsage('network', 3000);
      manager.recordUsage('cpuTime', 4000);

      const usage = manager.getUsage();
      expect(usage.memory).toBe(1000);
      expect(usage.storage).toBe(2000);
      expect(usage.timestamp).toBeGreaterThan(0);
    });

    it('should calculate usage percentage', () => {
      const halfBudget = DEFAULT_BUDGETS.memory * 0.5;
      manager.recordUsage('memory', halfBudget);

      const percentage = manager.getUsagePercentage('memory');
      expect(percentage).toBeCloseTo(0.5, 1);
    });

    it('should cap usage percentage at 1.0', () => {
      const overBudget = DEFAULT_BUDGETS.memory * 2;
      manager.recordUsage('memory', overBudget);

      const percentage = manager.getUsagePercentage('memory');
      expect(percentage).toBe(1.0);
    });

    it('should check if near limit', () => {
      const warningThreshold = DEFAULT_ENFORCEMENT.warningThreshold;
      const nearLimit = DEFAULT_BUDGETS.memory * (warningThreshold + 0.01);

      manager.recordUsage('memory', nearLimit);
      expect(manager.isNearLimit('memory')).toBe(true);
    });

    it('should check if over budget', () => {
      const overBudget = DEFAULT_BUDGETS.memory * 1.1;
      manager.recordUsage('memory', overBudget);

      expect(manager.isOverBudget('memory')).toBe(true);
    });
  });

  describe('violation tracking', () => {
    it('should detect warning violations', () => {
      const warningLevel = DEFAULT_BUDGETS.memory * DEFAULT_ENFORCEMENT.warningThreshold;
      manager.recordUsage('memory', warningLevel);
      manager.enforceBudget();

      const violations = manager.getViolations();
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('warning');
    });

    it('should detect critical violations', () => {
      const criticalLevel = DEFAULT_BUDGETS.memory * DEFAULT_ENFORCEMENT.criticalThreshold;
      manager.recordUsage('memory', criticalLevel);
      manager.enforceBudget();

      const violations = manager.getViolations();
      const critical = violations.find(v => v.severity === 'critical');
      expect(critical).toBeDefined();
    });

    it('should include violation details', () => {
      const criticalLevel = DEFAULT_BUDGETS.memory * DEFAULT_ENFORCEMENT.criticalThreshold;
      manager.recordUsage('memory', criticalLevel);
      manager.enforceBudget();

      const violations = manager.getViolations();
      const violation = violations[0];

      expect(violation.resource).toBe('memory');
      expect(violation.usage).toBeGreaterThan(0);
      expect(violation.limit).toBe(DEFAULT_BUDGETS.memory);
      expect(violation.timestamp).toBeGreaterThan(0);
    });

    it('should filter violations by time', () => {
      const now = Date.now();
      manager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.9);
      manager.enforceBudget();

      const recentViolations = manager.getViolations(now - 1000);
      expect(recentViolations.length).toBeGreaterThan(0);

      const oldViolations = manager.getViolations(now + 10000);
      expect(oldViolations.length).toBe(0);
    });

    it('should clear violations', () => {
      manager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.9);
      manager.enforceBudget();

      expect(manager.getViolations().length).toBeGreaterThan(0);

      manager.clearViolations();
      expect(manager.getViolations().length).toBe(0);
    });

    it('should call violation callback', () => {
      const onViolation = vi.fn();
      const customManager = new ResourceBudgetManager({}, { onViolation });

      customManager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.9);
      customManager.enforceBudget();

      expect(onViolation).toHaveBeenCalled();
      expect(onViolation.mock.calls[0][0]).toHaveProperty('resource', 'memory');
    });
  });

  describe('enforcement', () => {
    it('should enforce budgets periodically', () => {
      manager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.9);
      manager.enforceBudget();

      const violations = manager.getViolations();
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should clean up old measurements', () => {
      // Record old measurements
      for (let i = 0; i < 10; i++) {
        manager.recordUsage('memory', i * 1000);
      }

      // Wait and enforce
      manager.enforceBudget();

      // Should still function
      expect(manager.getCurrentUsage('memory')).toBeGreaterThanOrEqual(0);
    });
  });

  describe('throttling', () => {
    it('should throttle operations', () => {
      const operationId = 'test-op';
      manager.throttle(operationId, 1000);

      expect(manager.isThrottled(operationId)).toBe(true);
    });

    it('should unthrottle after duration', async () => {
      const operationId = 'test-op';
      manager.throttle(operationId, 100);

      expect(manager.isThrottled(operationId)).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(manager.isThrottled(operationId)).toBe(false);
    });
  });

  describe('health summary', () => {
    it('should generate health summary', () => {
      manager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.5);
      manager.recordUsage('storage', DEFAULT_BUDGETS.storage * 0.9);

      const summary = manager.getHealthSummary();

      expect(summary).toHaveProperty('healthy');
      expect(summary).toHaveProperty('warnings');
      expect(summary).toHaveProperty('critical');
      expect(summary).toHaveProperty('usage');
    });

    it('should mark as unhealthy with critical violations', () => {
      manager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.96);

      const summary = manager.getHealthSummary();
      expect(summary.healthy).toBe(false);
      expect(summary.critical.length).toBeGreaterThan(0);
    });

    it('should include warnings', () => {
      manager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.85);

      const summary = manager.getHealthSummary();
      expect(summary.warnings.length).toBeGreaterThan(0);
    });

    it('should include usage percentages', () => {
      manager.recordUsage('memory', DEFAULT_BUDGETS.memory * 0.5);

      const summary = manager.getHealthSummary();
      expect(summary.usage.memory).toBe(50);
    });
  });

  describe('reset', () => {
    it('should reset all measurements', () => {
      manager.recordUsage('memory', 5000);
      manager.recordUsage('storage', 10000);
      manager.recordUsage('network', 15000);

      manager.reset();

      expect(manager.getCurrentUsage('memory')).toBe(0);
      expect(manager.getCurrentUsage('storage')).toBe(0);
      expect(manager.getViolations().length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero usage', () => {
      expect(manager.getCurrentUsage('memory')).toBe(0);
      expect(manager.getUsagePercentage('memory')).toBe(0);
    });

    it('should handle rapid usage recording', () => {
      for (let i = 0; i < 1000; i++) {
        manager.recordUsage('memory', i);
      }

      // Should not crash
      expect(manager.getCurrentUsage('memory')).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent budget checks', () => {
      const checks = Array(100)
        .fill(0)
        .map(() => manager.checkBudget('memory', 1000));

      expect(checks.every(c => c === true)).toBe(true);
    });
  });

  describe('performance', () => {
    it('should perform budget checks quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        manager.checkBudget('memory', 1000);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // < 0.01ms per check
    });

    it('should record usage efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        manager.recordUsage('memory', i * 1000);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // < 0.02ms per record
    });
  });
});
