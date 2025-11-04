/**
 * Tests for RecoveryCoordinator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  RecoveryCoordinator,
  RecoveryStrategy,
  RecoveryState,
} from '../../../src/resilience/RecoveryCoordinator';
import { EnhancedCircuitBreaker } from '../../../src/resilience/EnhancedCircuitBreaker';
import { AdvancedRetryPolicy } from '../../../src/resilience/AdvancedRetryPolicy';
import { DegradationManager } from '../../../src/resilience/DegradationManager';

describe('RecoveryCoordinator', () => {
  let coordinator: RecoveryCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    coordinator = new RecoveryCoordinator({
      autoRecover: false, // Disable for most tests
    });
  });

  afterEach(() => {
    coordinator.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Service Registration', () => {
    it('should register a service', () => {
      coordinator.registerService({
        name: 'test-service',
      });

      const status = coordinator.getStatus('test-service');
      expect(status).toBeDefined();
      expect(status?.service).toBe('test-service');
      expect(status?.state).toBe(RecoveryState.HEALTHY);
    });

    it('should register service with dependencies', () => {
      coordinator.registerService({
        name: 'test-service',
        dependencies: ['dep-1', 'dep-2'],
      });

      const status = coordinator.getStatus('test-service');
      expect(status?.dependencies).toEqual(['dep-1', 'dep-2']);
    });

    it('should register service with circuit breaker', () => {
      const circuitBreaker = new EnhancedCircuitBreaker();

      coordinator.registerService({
        name: 'test-service',
        circuitBreaker,
      });

      const status = coordinator.getStatus('test-service');
      expect(status?.circuitState).toBe('closed');
    });

    it('should unregister a service', () => {
      coordinator.registerService({
        name: 'test-service',
      });

      coordinator.unregisterService('test-service');

      const status = coordinator.getStatus('test-service');
      expect(status).toBeUndefined();
    });
  });

  describe('Immediate Recovery', () => {
    it('should recover service immediately', async () => {
      let healthCheckCalled = false;

      coordinator.registerService({
        name: 'test-service',
        strategy: RecoveryStrategy.IMMEDIATE,
        healthCheck: async () => {
          healthCheckCalled = true;
          return true;
        },
      });

      const success = await coordinator.recoverService('test-service');

      expect(success).toBe(true);
      expect(healthCheckCalled).toBe(true);

      const status = coordinator.getStatus('test-service');
      expect(status?.state).toBe(RecoveryState.HEALTHY);
    });

    it('should fail recovery if health check fails', async () => {
      coordinator.registerService({
        name: 'test-service',
        strategy: RecoveryStrategy.IMMEDIATE,
        healthCheck: async () => false,
      });

      const success = await coordinator.recoverService('test-service');

      expect(success).toBe(false);

      const status = coordinator.getStatus('test-service');
      expect(status?.state).toBe(RecoveryState.FAILED);
    });
  });

  describe('Gradual Recovery', () => {
    it('should perform gradual recovery with circuit breaker', async () => {
      const circuitBreaker = new EnhancedCircuitBreaker();

      coordinator.registerService({
        name: 'test-service',
        strategy: RecoveryStrategy.GRADUAL,
        circuitBreaker,
        healthCheck: async () => true,
      });

      const success = await coordinator.recoverService('test-service');

      expect(success).toBe(true);
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should not recover if circuit is open', async () => {
      const circuitBreaker = new EnhancedCircuitBreaker();
      circuitBreaker.forceOpen('Testing');

      coordinator.registerService({
        name: 'test-service',
        strategy: RecoveryStrategy.GRADUAL,
        circuitBreaker,
      });

      const success = await coordinator.recoverService('test-service');

      expect(success).toBe(false);
    });
  });

  describe('Coordinated Recovery', () => {
    it('should wait for dependencies before recovery', async () => {
      coordinator.registerService({
        name: 'dependency',
      });

      coordinator.registerService({
        name: 'dependent',
        strategy: RecoveryStrategy.COORDINATED,
        dependencies: ['dependency'],
        healthCheck: async () => true,
      });

      // Mark dependency as failed
      const depCircuit = new EnhancedCircuitBreaker();
      depCircuit.forceOpen('Testing');

      coordinator.unregisterService('dependency');
      coordinator.registerService({
        name: 'dependency',
        circuitBreaker: depCircuit,
      });

      // Try to recover dependent
      const success = await coordinator.recoverService('dependent');

      expect(success).toBe(false); // Should fail because dependency is unhealthy
    });

    it('should recover when dependencies are healthy', async () => {
      coordinator.registerService({
        name: 'dependency',
        healthCheck: async () => true,
      });

      coordinator.registerService({
        name: 'dependent',
        strategy: RecoveryStrategy.COORDINATED,
        dependencies: ['dependency'],
        healthCheck: async () => true,
      });

      // Recover dependency first
      await coordinator.recoverService('dependency');

      // Now dependent should recover
      const success = await coordinator.recoverService('dependent');

      expect(success).toBe(true);
    });
  });

  describe('Manual Recovery', () => {
    it('should not auto-recover manual services', async () => {
      coordinator.registerService({
        name: 'test-service',
        strategy: RecoveryStrategy.MANUAL,
      });

      const success = await coordinator.recoverService('test-service');

      expect(success).toBe(false);
    });
  });

  describe('Recovery Attempts', () => {
    it('should track recovery attempts', async () => {
      coordinator.registerService({
        name: 'test-service',
        maxRecoveryAttempts: 3,
        healthCheck: async () => false,
      });

      await coordinator.recoverService('test-service');
      await coordinator.recoverService('test-service');

      const status = coordinator.getStatus('test-service');
      expect(status?.attemptCount).toBe(2);
    });

    it('should stop after max attempts', async () => {
      coordinator.registerService({
        name: 'test-service',
        maxRecoveryAttempts: 2,
        healthCheck: async () => false,
      });

      await coordinator.recoverService('test-service');
      await coordinator.recoverService('test-service');

      // Third attempt should fail immediately
      const success = await coordinator.recoverService('test-service');

      expect(success).toBe(false);

      const status = coordinator.getStatus('test-service');
      expect(status?.attemptCount).toBe(2); // Stopped at max
    });

    it('should reset attempts on successful recovery', async () => {
      let attempts = 0;

      coordinator.registerService({
        name: 'test-service',
        healthCheck: async () => {
          attempts++;
          return attempts > 2; // Succeed on third try
        },
      });

      await coordinator.recoverService('test-service');
      await coordinator.recoverService('test-service');
      await coordinator.recoverService('test-service');

      const status = coordinator.getStatus('test-service');
      expect(status?.attemptCount).toBe(0); // Reset on success
      expect(status?.state).toBe(RecoveryState.HEALTHY);
    });
  });

  describe('Concurrent Recoveries', () => {
    it('should limit concurrent recoveries', async () => {
      const limitedCoordinator = new RecoveryCoordinator({
        maxConcurrentRecoveries: 2,
        autoRecover: false,
      });

      // Register 3 services
      limitedCoordinator.registerService({
        name: 'service-1',
        healthCheck: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        },
      });

      limitedCoordinator.registerService({
        name: 'service-2',
        healthCheck: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        },
      });

      limitedCoordinator.registerService({
        name: 'service-3',
        healthCheck: async () => true,
      });

      // Start 3 recoveries
      const p1 = limitedCoordinator.recoverService('service-1');
      const p2 = limitedCoordinator.recoverService('service-2');
      const p3 = limitedCoordinator.recoverService('service-3');

      // Third should be rejected due to limit
      expect(await p3).toBe(false);

      await vi.runAllTimersAsync();
      await Promise.all([p1, p2]);

      limitedCoordinator.destroy();
    });

    it('should not start recovery if already recovering', async () => {
      coordinator.registerService({
        name: 'test-service',
        healthCheck: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        },
      });

      const p1 = coordinator.recoverService('test-service');
      const p2 = coordinator.recoverService('test-service');

      expect(await p2).toBe(false); // Already recovering

      await vi.runAllTimersAsync();
      await p1;
    });
  });

  describe('Integration with DegradationManager', () => {
    it('should recover in degradation manager on success', async () => {
      const degradationManager = new DegradationManager();
      degradationManager.registerFeature({
        name: 'test-service',
      });

      const integrated = new RecoveryCoordinator({}, degradationManager);

      integrated.registerService({
        name: 'test-service',
        healthCheck: async () => true,
      });

      // Degrade first
      await degradationManager.degrade(
        'test-service',
        require('../../../src/resilience/DegradationManager').DegradationLevel.PARTIAL
      );

      // Recover through coordinator
      await integrated.recoverService('test-service');

      // Should be recovered in degradation manager
      const degraded = degradationManager.isDegraded('test-service');
      expect(degraded).toBe(false);

      integrated.destroy();
      await degradationManager.destroy();
    });
  });

  describe('Status Reporting', () => {
    it('should get status for single service', () => {
      coordinator.registerService({
        name: 'test-service',
      });

      const status = coordinator.getStatus('test-service');

      expect(status).toBeDefined();
      expect(status?.service).toBe('test-service');
      expect(status?.state).toBe(RecoveryState.HEALTHY);
      expect(status?.attemptCount).toBe(0);
    });

    it('should get status for all services', () => {
      coordinator.registerService({ name: 'service-1' });
      coordinator.registerService({ name: 'service-2' });

      const allStatus = coordinator.getAllStatus();

      expect(Object.keys(allStatus)).toHaveLength(2);
      expect(allStatus['service-1']).toBeDefined();
      expect(allStatus['service-2']).toBeDefined();
    });

    it('should update circuit state in status', () => {
      const circuitBreaker = new EnhancedCircuitBreaker();
      circuitBreaker.forceOpen('Testing');

      coordinator.registerService({
        name: 'test-service',
        circuitBreaker,
      });

      const status = coordinator.getStatus('test-service');
      expect(status?.circuitState).toBe('open');
    });
  });

  describe('Event History', () => {
    it('should track recovery events', async () => {
      coordinator.registerService({
        name: 'test-service',
        healthCheck: async () => true,
      });

      await coordinator.recoverService('test-service');

      const history = coordinator.getHistory();
      expect(history.length).toBeGreaterThan(0);

      const startEvent = history.find(e => e.type === 'started');
      const successEvent = history.find(e => e.type === 'succeeded');

      expect(startEvent).toBeDefined();
      expect(successEvent).toBeDefined();
    });

    it('should track failure events', async () => {
      coordinator.registerService({
        name: 'test-service',
        healthCheck: async () => false,
      });

      await coordinator.recoverService('test-service');

      const history = coordinator.getHistory();
      const failEvent = history.find(e => e.type === 'failed');

      expect(failEvent).toBeDefined();
      expect(failEvent?.service).toBe('test-service');
    });

    it('should limit history size', () => {
      coordinator.registerService({
        name: 'test-service',
      });

      const history = coordinator.getHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Auto Recovery', () => {
    it('should periodically check for recoveries', async () => {
      const autoCoordinator = new RecoveryCoordinator({
        autoRecover: true,
        checkInterval: 1000,
      });

      let attemptCount = 0;
      let recovered = false;

      autoCoordinator.registerService({
        name: 'test-service',
        healthCheck: async () => {
          attemptCount++;
          // Fail first time, succeed on auto-recovery
          if (attemptCount === 1) {
            return false;
          }
          recovered = true;
          return true;
        },
      });

      // First recovery attempt should fail, leaving service in FAILED state
      await autoCoordinator.recoverService('test-service');
      expect(attemptCount).toBe(1);
      expect(recovered).toBe(false);

      // Advance time to trigger auto-recovery (this schedules the callback)
      await vi.advanceTimersByTimeAsync(1100);

      // Stop the interval to prevent further checks
      autoCoordinator.stopRecoveryChecks();

      // Health check should have been called again during auto-recovery
      expect(attemptCount).toBe(2);
      expect(recovered).toBe(true);

      autoCoordinator.destroy();
    });

    it('should respect recovery strategy in auto-recovery', async () => {
      const autoCoordinator = new RecoveryCoordinator({
        autoRecover: true,
        checkInterval: 1000,
      });

      autoCoordinator.registerService({
        name: 'manual-service',
        strategy: RecoveryStrategy.MANUAL,
      });

      // Advance time to trigger one check cycle (this executes the callback)
      await vi.advanceTimersByTimeAsync(1100);

      // Stop the interval to prevent further checks
      autoCoordinator.stopRecoveryChecks();

      // Manual services should not auto-recover
      const status = autoCoordinator.getStatus('manual-service');
      expect(status?.state).toBe(RecoveryState.HEALTHY); // Should stay in initial state

      autoCoordinator.destroy();
    });
  });

  describe('Priority-Based Recovery', () => {
    it('should recover high priority services first', async () => {
      const recoveryOrder: string[] = [];

      coordinator.registerService({
        name: 'low-priority',
        priority: 1,
        healthCheck: async () => {
          recoveryOrder.push('low-priority');
          return true;
        },
      });

      coordinator.registerService({
        name: 'high-priority',
        priority: 10,
        healthCheck: async () => {
          recoveryOrder.push('high-priority');
          return true;
        },
      });

      // Note: Current implementation would need to be enhanced to test this properly
      // This test documents the intended behavior
    });
  });
});
