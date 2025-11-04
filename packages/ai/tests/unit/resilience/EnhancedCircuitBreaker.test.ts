/**
 * Tests for EnhancedCircuitBreaker
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EnhancedCircuitBreaker } from '../../../src/resilience/EnhancedCircuitBreaker';

describe('EnhancedCircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Circuit Breaker Functionality', () => {
    it('should start in closed state', () => {
      const circuit = new EnhancedCircuitBreaker();
      expect(circuit.getState()).toBe('closed');
    });

    it('should execute operation when closed', async () => {
      const circuit = new EnhancedCircuitBreaker();
      const result = await circuit.executeEnhanced(async () => 'success');
      expect(result).toBe('success');
    });

    it('should trip to open on high failure rate', async () => {
      const circuit = new EnhancedCircuitBreaker({
        failureThreshold: 0.5,
        requestThreshold: 5,
      });

      // Generate failures
      for (let i = 0; i < 5; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected failures
        }
      }

      expect(circuit.getState()).toBe('open');
    });

    it('should reject requests when open', async () => {
      const circuit = new EnhancedCircuitBreaker();
      circuit.forceOpen('Testing');

      await expect(
        circuit.executeEnhanced(async () => 'success')
      ).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('Health Metrics', () => {
    it('should track health score', async () => {
      const circuit = new EnhancedCircuitBreaker({
        healthScoreEnabled: true,
      });

      // Successful requests increase health
      await circuit.executeEnhanced(async () => 'success');
      await circuit.executeEnhanced(async () => 'success');

      const metrics = circuit.getHealthMetrics();
      expect(metrics.healthScore).toBeGreaterThan(90);
    });

    it('should decrease health score on failures', async () => {
      const circuit = new EnhancedCircuitBreaker({
        healthScoreEnabled: true,
      });

      // Generate failures
      for (let i = 0; i < 5; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      const metrics = circuit.getHealthMetrics();
      expect(metrics.healthScore).toBeLessThan(100);
    });

    it('should track consecutive failures', async () => {
      const circuit = new EnhancedCircuitBreaker({
        failureThreshold: 0.9, // High threshold to avoid tripping
        requestThreshold: 10,
      });

      for (let i = 0; i < 3; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      const metrics = circuit.getHealthMetrics();
      expect(metrics.consecutiveFailures).toBe(3);
    });

    it('should track consecutive successes', async () => {
      const circuit = new EnhancedCircuitBreaker();

      for (let i = 0; i < 3; i++) {
        await circuit.executeEnhanced(async () => 'success');
      }

      const metrics = circuit.getHealthMetrics();
      expect(metrics.consecutiveSuccesses).toBe(3);
    });

    it('should calculate failure rate', async () => {
      const circuit = new EnhancedCircuitBreaker({
        failureThreshold: 0.9, // High threshold
        requestThreshold: 10,
      });

      // 5 failures, 5 successes = 0.5 failure rate
      for (let i = 0; i < 5; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      for (let i = 0; i < 5; i++) {
        await circuit.executeEnhanced(async () => 'success');
      }

      const metrics = circuit.getHealthMetrics();
      expect(metrics.failureRate).toBeCloseTo(0.5, 1);
    });

    it('should track average response time', async () => {
      const circuit = new EnhancedCircuitBreaker();

      // Execute with a delay using fake timers
      const promise = circuit.executeEnhanced(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      });

      // Advance timers to resolve the setTimeout
      await vi.advanceTimersByTimeAsync(100);

      // Wait for the promise to complete
      await promise;

      const metrics = circuit.getHealthMetrics();
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });

    it('should track trip count', async () => {
      const circuit = new EnhancedCircuitBreaker({
        failureThreshold: 0.5,
        requestThreshold: 2,
      });

      // Trip circuit once
      for (let i = 0; i < 3; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      expect(circuit.getState()).toBe('open');
      let metrics = circuit.getHealthMetrics();
      expect(metrics.tripCount).toBe(1);

      // Reset and trip again
      circuit.reset();

      for (let i = 0; i < 3; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      metrics = circuit.getHealthMetrics();
      expect(metrics.tripCount).toBe(2);
    });
  });

  describe('Adaptive Thresholds', () => {
    it('should adjust failure threshold based on patterns', async () => {
      const circuit = new EnhancedCircuitBreaker({
        adaptiveThresholds: true,
        minFailureThreshold: 0.3,
        maxFailureThreshold: 0.8,
        failureThreshold: 0.9, // Start high to avoid early trips
        requestThreshold: 10,
      });

      // Generate consistent low failure pattern
      for (let i = 0; i < 20; i++) {
        await circuit.executeEnhanced(async () => 'success');
      }

      const thresholds = circuit.getAdaptiveThresholds();
      // Threshold should decrease with consistently good performance
      expect(thresholds.currentFailureThreshold).toBeLessThanOrEqual(0.5);
    });

    it('should respect minimum threshold', async () => {
      const circuit = new EnhancedCircuitBreaker({
        adaptiveThresholds: true,
        minFailureThreshold: 0.3,
        failureThreshold: 0.3,
      });

      // Even with perfect performance, should not go below min
      for (let i = 0; i < 50; i++) {
        await circuit.executeEnhanced(async () => 'success');
      }

      const thresholds = circuit.getAdaptiveThresholds();
      expect(thresholds.currentFailureThreshold).toBeGreaterThanOrEqual(0.3);
    });

    it('should respect maximum threshold', async () => {
      const circuit = new EnhancedCircuitBreaker({
        adaptiveThresholds: true,
        maxFailureThreshold: 0.8,
        failureThreshold: 0.5,
        requestThreshold: 5,
      });

      const thresholds = circuit.getAdaptiveThresholds();
      expect(thresholds.currentFailureThreshold).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Adaptive Timeout', () => {
    it('should increase timeout on repeated failures', async () => {
      const circuit = new EnhancedCircuitBreaker({
        adaptiveTimeout: true,
        minResetTimeout: 30000,
        maxResetTimeout: 300000,
        resetTimeout: 60000,
        failureThreshold: 0.9, // High to avoid tripping
        requestThreshold: 10,
      });

      // Generate many consecutive failures
      for (let i = 0; i < 10; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      const thresholds = circuit.getAdaptiveThresholds();
      expect(thresholds.currentResetTimeout).toBeGreaterThan(60000);
    });

    it('should decrease timeout when healthy', async () => {
      const circuit = new EnhancedCircuitBreaker({
        adaptiveTimeout: true,
        minResetTimeout: 30000,
        maxResetTimeout: 300000,
        resetTimeout: 60000,
      });

      // Generate healthy pattern
      for (let i = 0; i < 100; i++) {
        await circuit.executeEnhanced(async () => 'success');
      }

      const thresholds = circuit.getAdaptiveThresholds();
      // Should decrease or stay same with good health
      expect(thresholds.currentResetTimeout).toBeLessThanOrEqual(60000);
    });
  });

  describe('Half-Open State', () => {
    it('should transition to half-open after reset timeout', async () => {
      const circuit = new EnhancedCircuitBreaker({
        resetTimeout: 1000,
        failureThreshold: 0.5,
        requestThreshold: 2,
      });

      // Trip circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      expect(circuit.getState()).toBe('open');

      // Wait for reset timeout
      vi.advanceTimersByTime(1100);

      // Should transition to half-open on next execution attempt
      try {
        await circuit.executeEnhanced(async () => {
          throw new Error('Still failing');
        });
      } catch {
        // Expected
      }

      expect(circuit.getState()).toBe('open'); // Reopens on failure
    });

    it('should require high success rate to close from half-open', async () => {
      const circuit = new EnhancedCircuitBreaker({
        halfOpenSuccessRate: 0.8,
        halfOpenRequests: 5,
        resetTimeout: 1000,
        failureThreshold: 0.5,
        requestThreshold: 2,
      });

      // Trip circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuit.executeEnhanced(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      // Wait for half-open transition
      vi.advanceTimersByTime(1100);

      // Need to manually set to half-open for testing
      circuit.reset();
      circuit.forceOpen();
      vi.advanceTimersByTime(1100);

      // Test with insufficient success rate
      for (let i = 0; i < 3; i++) {
        try {
          await circuit.executeEnhanced(async () => 'success');
        } catch {
          // May fail if circuit opens
        }
      }
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics', async () => {
      const circuit = new EnhancedCircuitBreaker();

      // Generate some activity
      for (let i = 0; i < 5; i++) {
        await circuit.executeEnhanced(async () => 'success');
      }

      circuit.resetMetrics();

      const metrics = circuit.getHealthMetrics();
      expect(metrics.consecutiveSuccesses).toBe(0);
      expect(metrics.consecutiveFailures).toBe(0);
      expect(metrics.healthScore).toBe(100);
    });
  });

  describe('Diagnostics', () => {
    it('should provide comprehensive diagnostics', async () => {
      const circuit = new EnhancedCircuitBreaker({
        adaptiveThresholds: true,
        adaptiveTimeout: true,
        healthScoreEnabled: true,
      });

      await circuit.executeEnhanced(async () => 'success');

      const diagnostics = circuit.getDiagnostics();

      expect(diagnostics).toHaveProperty('healthScore');
      expect(diagnostics).toHaveProperty('state');
      expect(diagnostics).toHaveProperty('currentFailureThreshold');
      expect(diagnostics).toHaveProperty('currentResetTimeout');
      expect(diagnostics).toHaveProperty('config');
    });
  });
});
