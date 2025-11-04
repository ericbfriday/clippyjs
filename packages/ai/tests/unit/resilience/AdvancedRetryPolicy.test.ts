/**
 * Tests for AdvancedRetryPolicy
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AdvancedRetryPolicy } from '../../../src/resilience/AdvancedRetryPolicy';
import { CircuitBreaker } from '../../../src/errors/CircuitBreaker';

describe('AdvancedRetryPolicy', () => {
  let pendingPromises: Promise<any>[] = [];
  let originalDateNow: () => number;
  let mockTime: number;

  beforeEach(() => {
    // Mock Date.now() for tests that need fake timers
    mockTime = Date.now();
    originalDateNow = Date.now;
    Date.now = vi.fn(() => mockTime);

    vi.useFakeTimers();
    pendingPromises = [];
  });

  afterEach(async () => {
    // Restore real timers first to allow promises to resolve
    vi.useRealTimers();

    // Wait for all pending promises to settle to prevent unhandled rejections
    await Promise.allSettled(pendingPromises);
    pendingPromises = [];

    // Restore Date.now()
    Date.now = originalDateNow;
    vi.restoreAllMocks();
  });

  describe('Basic Retry Functionality', () => {
    it('should succeed on first attempt', async () => {
      // Use real timers for this simple test
      vi.useRealTimers();

      const policy = new AdvancedRetryPolicy({ maxRetries: 3 });
      let attempts = 0;

      const result = await policy.executeAdvanced(async () => {
        attempts++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure and succeed', async () => {
      const policy = new AdvancedRetryPolicy({
        maxRetries: 3,
        initialDelay: 100,
        retryImmediately: true,
      });
      let attempts = 0;

      const promise = policy.executeAdvanced(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      // Advance timers for retries
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const policy = new AdvancedRetryPolicy({
        maxRetries: 2,
        initialDelay: 10,
      });
      let attempts = 0;

      const promise = policy.executeAdvanced(async () => {
        attempts++;
        throw new Error('Persistent failure');
      });

      // Track promise for cleanup
      pendingPromises.push(promise.catch(() => {}));

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Operation failed after 3 attempts');
      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Retry Budget', () => {
    it('should enforce retry budget', async () => {
      // Use real timers to avoid Date.now() issues
      vi.useRealTimers();

      const policy = new AdvancedRetryPolicy({
        retryBudget: 2,
        budgetWindow: 1000,
        maxRetries: 3,
        initialDelay: 10,
      });

      let attempts = 0;
      const failingOp = async () => {
        attempts++;
        throw new Error('Failure');
      };

      // First operation uses budget
      const promise1 = policy.executeAdvanced(failingOp);
      pendingPromises.push(promise1.catch(() => {}));
      await expect(promise1).rejects.toThrow();

      // Second operation uses budget
      const promise2 = policy.executeAdvanced(failingOp);
      pendingPromises.push(promise2.catch(() => {}));
      await expect(promise2).rejects.toThrow();

      // Third operation should be rejected due to budget
      const promise3 = policy.executeAdvanced(failingOp);
      pendingPromises.push(promise3.catch(() => {}));
      await expect(promise3).rejects.toThrow('Retry budget exhausted');
    });

    it('should reset budget after window expires', async () => {
      const policy = new AdvancedRetryPolicy({
        retryBudget: 1,
        budgetWindow: 1000,
        maxRetries: 1,
        initialDelay: 10,
      });

      // Use budget
      const promise1 = policy.executeAdvanced(async () => {
        throw new Error('Failure');
      });
      pendingPromises.push(promise1.catch(() => {}));
      await vi.runAllTimersAsync();
      await expect(promise1).rejects.toThrow('Operation failed');

      // Advance both timers and Date.now mock
      mockTime += 1100;
      vi.advanceTimersByTime(1100);

      // Should succeed now (new budget window)
      const promise2 = policy.executeAdvanced(async () => {
        throw new Error('Failure');
      });
      pendingPromises.push(promise2.catch(() => {}));
      await vi.runAllTimersAsync();
      await expect(promise2).rejects.toThrow('Operation failed');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should reject when circuit is open', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 0.5,
        requestThreshold: 1,
      });
      circuitBreaker.forceOpen('Testing');

      const policy = new AdvancedRetryPolicy({
        circuitBreakerIntegration: true,
      });

      await expect(
        policy.executeAdvanced(
          async () => 'success',
          undefined,
          circuitBreaker
        )
      ).rejects.toThrow('Circuit breaker is open');
    });

    it('should execute through circuit breaker when closed', async () => {
      // Use real timers for this simple test
      vi.useRealTimers();

      const circuitBreaker = new CircuitBreaker();

      const policy = new AdvancedRetryPolicy({
        circuitBreakerIntegration: true,
      });

      const result = await policy.executeAdvanced(
        async () => 'success',
        undefined,
        circuitBreaker
      );

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should track circuit breaker trips in metrics', async () => {
      const circuitBreaker = new CircuitBreaker();
      circuitBreaker.forceOpen('Testing');

      const policy = new AdvancedRetryPolicy({
        circuitBreakerIntegration: true,
      });

      try {
        await policy.executeAdvanced(
          async () => 'success',
          undefined,
          circuitBreaker
        );
      } catch {
        // Expected to fail
      }

      const metrics = policy.getMetrics();
      expect(metrics.circuitBreakerTrips).toBe(1);
    });
  });

  describe('Adaptive Backoff', () => {
    it('should adjust backoff multiplier based on success rate', async () => {
      const policy = new AdvancedRetryPolicy({
        adaptiveBackoff: true,
        adaptiveThreshold: 0.7,
        maxRetries: 1,
        initialDelay: 100,
      });

      // Simulate low success rate (failures)
      for (let i = 0; i < 10; i++) {
        const promise = policy.executeAdvanced(async () => {
          throw new Error('Failure');
        });
        pendingPromises.push(promise.catch(() => {}));

        await vi.runAllTimersAsync();

        try {
          await promise;
        } catch {
          // Expected failures
        }
      }

      const state = policy.getAdaptiveState();
      expect(state.backoffMultiplier).toBeGreaterThan(1.0);
    });

    it('should decrease backoff multiplier on high success rate', async () => {
      // Use real timers for this test
      vi.useRealTimers();

      const policy = new AdvancedRetryPolicy({
        adaptiveBackoff: true,
        adaptiveThreshold: 0.7,
        maxRetries: 1,
        initialDelay: 100,
      });

      // Simulate high success rate
      for (let i = 0; i < 15; i++) {
        await policy.executeAdvanced(async () => 'success');
      }

      const state = policy.getAdaptiveState();
      expect(state.backoffMultiplier).toBeLessThan(1.0);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track successful retries', async () => {
      const policy = new AdvancedRetryPolicy({
        maxRetries: 3,
        initialDelay: 10,
      });

      let attempts = 0;
      const promise = policy.executeAdvanced(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      await vi.runAllTimersAsync();
      await promise;

      const metrics = policy.getMetrics();
      expect(metrics.successfulRetries).toBe(1); // 2 failures, 1 success on retry
      expect(metrics.totalAttempts).toBe(3);
    });

    it('should track failed retries', async () => {
      const policy = new AdvancedRetryPolicy({
        maxRetries: 2,
        initialDelay: 10,
      });

      const promise = policy.executeAdvanced(async () => {
        throw new Error('Persistent failure');
      });
      pendingPromises.push(promise.catch(() => {}));

      await vi.runAllTimersAsync();

      try {
        await promise;
      } catch {
        // Expected to fail
      }

      const metrics = policy.getMetrics();
      expect(metrics.failedRetries).toBe(1);
      expect(metrics.totalAttempts).toBe(3);
    });

    it('should calculate success rate', async () => {
      // Use real timers for this test
      vi.useRealTimers();

      const policy = new AdvancedRetryPolicy({
        maxRetries: 2,
        initialDelay: 10,
      });

      // One successful retry (fails first, then succeeds)
      let attempts1 = 0;
      await policy.executeAdvanced(async () => {
        attempts1++;
        if (attempts1 < 2) {
          throw new Error('Temp failure');
        }
        return 'success';
      });

      // One failed retry
      const promise = policy.executeAdvanced(async () => {
        throw new Error('Failure');
      });
      pendingPromises.push(promise.catch(() => {}));

      try {
        await promise;
      } catch {
        // Expected
      }

      const metrics = policy.getMetrics();
      // Should have 1 successful retry and 1 failed retry = 50% success rate
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.successfulRetries).toBe(1);
      expect(metrics.failedRetries).toBe(1);
    });

    it('should track average delay', async () => {
      const policy = new AdvancedRetryPolicy({
        maxRetries: 2,
        initialDelay: 100,
      });

      let attempts = 0;
      const promise = policy.executeAdvanced(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      await vi.runAllTimersAsync();
      await promise;

      const metrics = policy.getMetrics();
      expect(metrics.averageDelay).toBeGreaterThan(0);
    });
  });

  describe('Abort Signal', () => {
    it('should cancel operation with abort signal', async () => {
      const policy = new AdvancedRetryPolicy({
        maxRetries: 3,
        initialDelay: 100,
      });

      const controller = new AbortController();
      let attempts = 0;

      const promise = policy.executeAdvanced(
        async () => {
          attempts++;
          // Abort after first failure to trigger cancellation during sleep
          if (attempts === 1) {
            setTimeout(() => controller.abort(), 50);
          }
          throw new Error('Failure');
        },
        undefined,
        undefined,
        controller.signal
      );

      // Track promise for cleanup
      pendingPromises.push(promise.catch(() => {}));

      // Run all timers to execute the operation and abort
      await vi.runAllTimersAsync();

      // Should reject with cancellation error (either from check or from sleep)
      await expect(promise).rejects.toThrow(/Operation cancelled|Sleep cancelled/);
      expect(attempts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Reset', () => {
    it('should reset metrics and state', async () => {
      const policy = new AdvancedRetryPolicy({
        maxRetries: 2,
        initialDelay: 10,
      });

      // Generate some metrics
      const promise = policy.executeAdvanced(async () => {
        throw new Error('Failure');
      });
      pendingPromises.push(promise.catch(() => {}));

      await vi.runAllTimersAsync();

      try {
        await promise;
      } catch {
        // Expected
      }

      let metrics = policy.getMetrics();
      expect(metrics.totalAttempts).toBeGreaterThan(0);

      // Reset
      policy.reset();

      metrics = policy.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successfulRetries).toBe(0);
      expect(metrics.failedRetries).toBe(0);
    });
  });
});
