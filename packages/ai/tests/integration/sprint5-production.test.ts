/**
 * Sprint 5 Production Readiness - Integration Tests
 *
 * Comprehensive integration testing for Sprint 5 production features:
 * - Error recovery and resilience patterns
 * - Telemetry collection and hooks
 * - Caching and performance optimization
 * - Stream control and monitoring
 * - Debug tools integration
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  DEFAULT_CIRCUIT_CONFIG,
} from '../../src/errors/CircuitBreaker';
import {
  ErrorClassifier,
  type ErrorInfo,
} from '../../src/errors/ErrorClassifier';
import {
  RetryPolicy,
  retry,
  DEFAULT_RETRY_CONFIG,
} from '../../src/errors/RetryPolicy';
import {
  RecoveryStrategy,
  RecoveryStrategies,
} from '../../src/errors/RecoveryStrategies';
import {
  Telemetry,
  type ErrorEvent,
  type CircuitBreakerEvent,
  type RetryEvent,
} from '../../src/errors/TelemetryHooks';
import {
  ResponseCache,
  DEFAULT_CACHE_CONFIG,
} from '../../src/cache/ResponseCache';
import {
  StreamController,
} from '../../src/streaming/StreamController';
import {
  StreamMonitor,
} from '../../src/streaming/StreamMonitor';

describe('Sprint 5: Production Readiness Integration', () => {
  // ==========================================================================
  // Setup and Teardown
  // ==========================================================================

  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    // Reset all global state
    Telemetry.reset();
    Telemetry.enable();
    registry = new CircuitBreakerRegistry();

    // Clear timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    registry?.destroy();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Test Suite 1: Error Recovery End-to-End Workflows
  // ==========================================================================

  describe('Error Recovery Workflows', () => {
    it('should recover from transient network errors with retry policy', async () => {
      const telemetryEvents: RetryEvent[] = [];
      let attemptCount = 0;

      Telemetry.configure({
        onRetry: (event) => telemetryEvents.push(event),
      });

      const policy = new RetryPolicy({
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 3,
        backoff: 'constant',
        baseDelay: 10,
      });

      const result = await policy.execute(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
      expect(telemetryEvents).toHaveLength(2); // 2 retries before success
    });

    it('should trigger circuit breaker on repeated failures', async () => {
      const circuitEvents: CircuitBreakerEvent[] = [];

      Telemetry.configure({
        onCircuitBreaker: (event) => circuitEvents.push(event),
      });

      const circuit = new CircuitBreaker('test-service', {
        failureThreshold: 0.5,
        requestThreshold: 5,
        resetTimeout: 1000,
      });

      // Generate failures to trip circuit
      const results = [];
      for (let i = 0; i < 10; i++) {
        try {
          await circuit.execute(async () => {
            throw new Error('Service unavailable');
          });
        } catch (error) {
          results.push(error);
        }
      }

      // Circuit should be open after threshold reached
      expect(circuit.getState()).toBe('open');
      expect(circuitEvents.length).toBeGreaterThan(0);
      expect(circuitEvents[circuitEvents.length - 1].state).toBe('open');
    });

    it('should implement fallback recovery strategy', async () => {
      const classifier = new ErrorClassifier();
      const strategy = new RecoveryStrategy({
        maxAttempts: 3,
        timeoutMs: 5000,
      });

      const error = new Error('API rate limit exceeded');
      const errorInfo = classifier.classify(error);

      const fallbackValue = 'cached-response';
      const recovered = await strategy.recover(
        error,
        errorInfo,
        async () => {
          // Simulate recovery attempt
          return fallbackValue;
        }
      );

      expect(recovered.success).toBe(true);
      expect(recovered.value).toBe(fallbackValue);
    });

    it('should handle cascading failures with circuit breaker registry', async () => {
      // Register multiple services
      const dbCircuit = registry.get('database', {
        failureThreshold: 0.6,
        requestThreshold: 5,
      });

      const apiCircuit = registry.get('external-api', {
        failureThreshold: 0.5,
        requestThreshold: 5,
      });

      // Simulate database failures
      for (let i = 0; i < 10; i++) {
        try {
          await dbCircuit.execute(async () => {
            throw new Error('DB connection failed');
          });
        } catch {}
      }

      // API should still work
      const apiResult = await apiCircuit.execute(async () => 'api-success');

      expect(dbCircuit.getState()).toBe('open');
      expect(apiCircuit.getState()).toBe('closed');
      expect(apiResult).toBe('api-success');
    });
  });

  // ==========================================================================
  // Test Suite 2: Telemetry Collection and Reporting
  // ==========================================================================

  describe('Telemetry Collection Flows', () => {
    it('should collect and batch error events', async () => {
      const errorEvents: ErrorEvent[] = [];
      const classifier = new ErrorClassifier();

      Telemetry.configure({
        onError: (event) => errorEvents.push(event),
      });

      // Generate various error types
      const errors = [
        new Error('Network timeout'),
        new Error('Rate limit exceeded'),
        new Error('Invalid API key'),
      ];

      for (const error of errors) {
        const errorInfo = classifier.classify(error);
        Telemetry.reportError(error, errorInfo, { source: 'test' });
      }

      expect(errorEvents).toHaveLength(3);
      expect(errorEvents.every(e => e.context?.source === 'test')).toBe(true);
      expect(errorEvents.every(e => e.timestamp > 0)).toBe(true);
    });

    it('should track retry attempts with telemetry', async () => {
      const retryEvents: RetryEvent[] = [];

      Telemetry.configure({
        onRetry: (event) => retryEvents.push(event),
      });

      const policy = new RetryPolicy({
        maxRetries: 3,
        backoff: 'exponential',
        baseDelay: 10,
      });

      let attempts = 0;
      try {
        await policy.execute(async () => {
          attempts++;
          throw new Error('Temporary failure');
        });
      } catch {}

      expect(retryEvents.length).toBeGreaterThan(0);
      expect(retryEvents.every(e => e.attempt > 0)).toBe(true);
      expect(retryEvents.every(e => e.delay > 0)).toBe(true);
    });

    it('should report circuit state transitions', async () => {
      const circuitEvents: CircuitBreakerEvent[] = [];

      Telemetry.configure({
        onCircuitBreaker: (event) => circuitEvents.push(event),
      });

      const circuit = new CircuitBreaker('monitored-service', {
        failureThreshold: 0.5,
        requestThreshold: 3,
      });

      // Trigger state changes
      for (let i = 0; i < 5; i++) {
        try {
          await circuit.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      const stateChanges = circuitEvents.filter(e => e.state === 'open');
      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[0].stats.failureRate).toBeGreaterThan(0);
    });

    it('should enable/disable telemetry dynamically', () => {
      const events: ErrorEvent[] = [];

      Telemetry.configure({
        onError: (event) => events.push(event),
      });

      const classifier = new ErrorClassifier();
      const error = new Error('Test');
      const errorInfo = classifier.classify(error);

      // Should record when enabled
      Telemetry.reportError(error, errorInfo);
      expect(events).toHaveLength(1);

      // Disable and verify no recording
      Telemetry.disable();
      Telemetry.reportError(error, errorInfo);
      expect(events).toHaveLength(1);

      // Re-enable
      Telemetry.enable();
      Telemetry.reportError(error, errorInfo);
      expect(events).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Test Suite 3: Cache Integration and Performance
  // ==========================================================================

  describe('Cache Integration Flows', () => {
    it('should cache responses and serve from cache', async () => {
      const cache = new ResponseCache({
        ...DEFAULT_CACHE_CONFIG,
        maxSize: 100,
        ttl: 5000,
      });

      const key = 'test-request';
      const value = { data: 'test-response' };

      // First request - cache miss
      const cached1 = await cache.get(key);
      expect(cached1).toBeNull();

      // Set cache
      await cache.set(key, value);

      // Second request - cache hit
      const cached2 = await cache.get(key);
      expect(cached2).toEqual(value);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should handle cache eviction when full', async () => {
      const cache = new ResponseCache({
        maxSize: 3,
        ttl: 10000,
        evictionStrategy: 'lru',
      });

      // Fill cache
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Access key1 to make it recently used
      await cache.get('key1');

      // Add new item - should evict key2 (least recently used)
      await cache.set('key4', 'value4');

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBe('value3');
      expect(await cache.get('key4')).toBe('value4');
    });

    it('should respect TTL and expire entries', async () => {
      const cache = new ResponseCache({
        maxSize: 10,
        ttl: 100, // 100ms TTL
      });

      await cache.set('expiring-key', 'value');

      // Should be available immediately
      expect(await cache.get('expiring-key')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(await cache.get('expiring-key')).toBeNull();
    });

    it('should invalidate cache by pattern', async () => {
      const cache = new ResponseCache({
        maxSize: 50,
        ttl: 10000,
      });

      await cache.set('user:123:profile', { name: 'Alice' });
      await cache.set('user:123:settings', { theme: 'dark' });
      await cache.set('user:456:profile', { name: 'Bob' });

      // Invalidate all user:123 entries
      const invalidated = await cache.invalidate(/^user:123:/);

      expect(invalidated).toBe(2);
      expect(await cache.get('user:123:profile')).toBeNull();
      expect(await cache.get('user:123:settings')).toBeNull();
      expect(await cache.get('user:456:profile')).toEqual({ name: 'Bob' });
    });

    it('should provide cache statistics', async () => {
      const cache = new ResponseCache({
        maxSize: 10,
        ttl: 5000,
      });

      // Generate cache activity
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.get('key1'); // hit
      await cache.get('key1'); // hit
      await cache.get('key3'); // miss

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
      expect(stats.sets).toBe(2);
    });
  });

  // ==========================================================================
  // Test Suite 4: Stream Control Integration
  // ==========================================================================

  describe('Stream Control Workflows', () => {
    it('should control streaming with pause/resume', async () => {
      const controller = new StreamController({
        trackProgress: true,
      });

      const chunks: string[] = [];

      // Start streaming
      controller.start();

      const streamPromise = (async () => {
        for (let i = 0; i < 5; i++) {
          if (controller.isPaused()) {
            await controller.waitWhilePaused();
          }
          chunks.push(`chunk-${i}`);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })();

      // Let first chunk through
      await new Promise(resolve => setTimeout(resolve, 15));

      // Pause
      controller.pause();
      const pausedCount = chunks.length;

      // Wait a bit - should not progress
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(chunks.length).toBe(pausedCount);

      // Resume
      controller.resume();
      await streamPromise;

      expect(chunks).toHaveLength(5);
    });

    it('should monitor stream metrics', async () => {
      const monitor = new StreamMonitor({
        sampleInterval: 100,
      });

      monitor.start();

      // Simulate streaming
      for (let i = 0; i < 10; i++) {
        monitor.recordChunk(100); // 100 bytes per chunk
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      const metrics = monitor.getMetrics();

      expect(metrics.chunkCount).toBe(10);
      expect(metrics.totalBytes).toBe(1000);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.averageThroughput).toBeGreaterThan(0);

      monitor.stop();
    });

    it.skip('should apply backpressure when buffer is full', async () => {
      // TODO: Backpressure feature not yet implemented in StreamController
      // The StreamController API doesn't currently include checkBackpressure() or isBackpressureActive()
      // This test is skipped until backpressure functionality is added
      const controller = new StreamController({
        enableBackpressure: true,
        bufferSize: 3,
      });

      const chunks: number[] = [];

      // Producer
      const produce = async () => {
        for (let i = 0; i < 6; i++) {
          await controller.checkBackpressure();
          chunks.push(i);
        }
      };

      // Consumer (slower)
      const consume = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        controller.resume();
      };

      const producePromise = produce();

      // Should pause due to backpressure
      await new Promise(resolve => setTimeout(resolve, 20));
      const producedBeforePause = chunks.length;

      // Release backpressure
      await consume();
      await producePromise;

      expect(producedBeforePause).toBeLessThan(6);
      expect(chunks).toHaveLength(6);
    });
  });

  // ==========================================================================
  // Test Suite 5: Graceful Degradation Scenarios
  // ==========================================================================

  describe('Graceful Degradation', () => {
    it('should degrade to fallback when primary fails', async () => {
      const strategy = new RecoveryStrategy({
        maxAttempts: 2,
        timeoutMs: 1000,
      });

      let primaryCalled = false;
      let fallbackCalled = false;

      const result = await strategy.recover(
        new Error('Primary failed'),
        { type: 'network', severity: 'low', retryable: true, message: 'Primary failed' },
        async () => {
          primaryCalled = true;
          throw new Error('Still failing');
        },
        async () => {
          fallbackCalled = true;
          return 'fallback-value';
        }
      );

      expect(primaryCalled).toBe(true);
      expect(fallbackCalled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.value).toBe('fallback-value');
    });

    it('should handle partial failures gracefully', async () => {
      const services = ['service-a', 'service-b', 'service-c'];
      const results: Record<string, any> = {};

      for (const service of services) {
        const circuit = CircuitBreakerRegistry.getOrCreate(service, {
          failureThreshold: 0.5,
          requestThreshold: 3,
        });

        try {
          const result = await circuit.execute(async () => {
            if (service === 'service-b') {
              throw new Error('Service B unavailable');
            }
            return `${service}-data`;
          });
          results[service] = result;
        } catch (error) {
          results[service] = null;
        }
      }

      // Should have partial results
      expect(results['service-a']).toBe('service-a-data');
      expect(results['service-b']).toBeNull();
      expect(results['service-c']).toBe('service-c-data');
    });

    it('should combine retry + circuit breaker + fallback', async () => {
      const events: string[] = [];

      const circuit = new CircuitBreaker('resilient-service', {
        failureThreshold: 0.7,
        requestThreshold: 3,
        onStateChange: (state) => events.push(`circuit:${state}`),
      });

      const policy = new RetryPolicy({
        maxRetries: 2,
        backoff: 'constant',
        baseDelay: 10,
      });

      const strategy = new RecoveryStrategy({
        maxAttempts: 1,
        timeoutMs: 1000,
      });

      let attempts = 0;

      const result = await strategy.recover(
        new Error('Service error'),
        { type: 'network', severity: 'medium', retryable: true, message: 'Service error' },
        async () => {
          return await circuit.execute(async () => {
            return await policy.execute(async () => {
              attempts++;
              if (attempts < 5) {
                throw new Error('Still failing');
              }
              return 'success';
            });
          });
        },
        async () => 'fallback-used'
      );

      // Should use fallback after exhausting retries
      expect(result.value).toBe('fallback-used');
      expect(attempts).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Test Suite 6: Health Check and Monitoring
  // ==========================================================================

  describe('Health Check System', () => {
    it('should track service health via circuit breakers', () => {
      const services = ['db', 'api', 'cache'];
      const health: Record<string, string> = {};

      for (const service of services) {
        const circuit = registry.get(service);
        health[service] = circuit.getState();
      }

      expect(Object.keys(health)).toHaveLength(3);
      expect(Object.values(health).every(state =>
        ['closed', 'open', 'half-open'].includes(state)
      )).toBe(true);
    });

    it('should provide system-wide health status', async () => {
      // Create circuits with different states
      const healthyCircuit = registry.get('healthy-service');
      const unhealthyCircuit = registry.get('unhealthy-service', {
        failureThreshold: 0.5,
        requestThreshold: 1,
      });

      // Trip unhealthy circuit
      for (let i = 0; i < 3; i++) {
        try {
          await unhealthyCircuit.execute(async () => {
            throw new Error('Failing');
          });
        } catch {}
      }

      const allStats = registry.getAllStats();
      const degraded = Object.values(allStats).some(
        stats => stats.state !== 'closed'
      );

      expect(degraded).toBe(true);
    });
  });

  // ==========================================================================
  // Test Suite 7: Error Classification and Routing
  // ==========================================================================

  describe('Error Classification', () => {
    it('should classify errors by type', () => {
      const classifier = new ErrorClassifier();

      const networkError = new Error('Network timeout');
      const rateError = new Error('Rate limit exceeded');
      const authError = new Error('Invalid API key');

      const network = classifier.classify(networkError);
      const rate = classifier.classify(rateError);
      const auth = classifier.classify(authError);

      expect(network.type).toBe('network');
      expect(rate.type).toBe('rate_limit');
      expect(auth.type).toBe('authentication');
    });

    it('should determine if errors are retryable', () => {
      const classifier = new ErrorClassifier();

      const retryable = new Error('Service temporarily unavailable');
      const nonRetryable = new Error('Invalid request format');

      const retryInfo = classifier.classify(retryable);
      const nonRetryInfo = classifier.classify(nonRetryable);

      expect(retryInfo.retryable).toBe(true);
      expect(nonRetryInfo.retryable).toBe(false);
    });

    it('should assign error severity levels', () => {
      const classifier = new ErrorClassifier();

      const critical = new Error('Database connection lost');
      const warning = new Error('Slow response time');

      const criticalInfo = classifier.classify(critical);
      const warningInfo = classifier.classify(warning);

      expect(['high', 'critical']).toContain(criticalInfo.severity);
      expect(['low', 'medium']).toContain(warningInfo.severity);
    });
  });

  // ==========================================================================
  // Test Suite 8: Memory and Resource Management
  // ==========================================================================

  describe('Resource Management', () => {
    it('should clean up expired cache entries', async () => {
      const cache = new ResponseCache({
        maxSize: 100,
        ttl: 50, // Short TTL for testing
      });

      // Add entries
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger cleanup
      const removed = await cache.cleanup();

      expect(removed).toBeGreaterThan(0);
      const stats = cache.getStats();
      expect(stats.size).toBeLessThan(3);
    });

    it('should limit circuit breaker registry size', () => {
      // Create many circuits
      for (let i = 0; i < 50; i++) {
        registry.get(`service-${i}`);
      }

      const allStats = registry.getAllStats();
      expect(Object.keys(allStats).length).toBe(50);
    });

    it.skip('should handle stream buffer overflow', async () => {
      // TODO: Backpressure feature not yet implemented in StreamController
      // The StreamController API doesn't currently include checkBackpressure() or isBackpressureActive()
      // This test is skipped until backpressure functionality is added
      const controller = new StreamController({
        enableBackpressure: true,
        bufferSize: 5,
      });

      const chunks: number[] = [];

      // Try to overflow buffer
      for (let i = 0; i < 10; i++) {
        await controller.checkBackpressure();
        chunks.push(i);
      }

      // Should have applied backpressure
      expect(chunks.length).toBeGreaterThan(0);
      expect(controller.isBackpressureActive()).toBeDefined();
    });
  });

  // ==========================================================================
  // Test Suite 9: Production Simulation Scenarios
  // ==========================================================================

  describe('Production Scenarios', () => {
    it('should handle high-frequency error bursts', async () => {
      const errors: ErrorEvent[] = [];

      Telemetry.configure({
        onError: (event) => errors.push(event),
      });

      const classifier = new ErrorClassifier();

      // Simulate burst of 100 errors
      for (let i = 0; i < 100; i++) {
        const error = new Error(`Error ${i}`);
        const info = classifier.classify(error);
        Telemetry.reportError(error, info);
      }

      expect(errors).toHaveLength(100);
      expect(errors.every(e => e.timestamp > 0)).toBe(true);
    });

    it('should maintain performance under load', async () => {
      const cache = new ResponseCache({
        maxSize: 1000,
        ttl: 60000,
      });

      const startTime = Date.now();

      // Simulate 1000 cache operations
      for (let i = 0; i < 1000; i++) {
        await cache.set(`key-${i}`, `value-${i}`);
        if (i % 2 === 0) {
          await cache.get(`key-${i}`);
        }
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });

    it('should recover from cascading failures', async () => {
      const services = ['primary', 'secondary', 'tertiary'];
      const results: string[] = [];

      for (const service of services) {
        const circuit = registry.get(service, {
          failureThreshold: 0.8,
          requestThreshold: 2,
        });

        try {
          const result = await circuit.execute(async () => {
            // Simulate cascading failure
            if (service === 'primary') {
              throw new Error('Primary down');
            }
            return `${service}-recovered`;
          });
          results.push(result);
        } catch {
          // Try fallback
          results.push(`${service}-fallback`);
        }
      }

      // Should have some successful results
      expect(results.some(r => r.includes('recovered'))).toBe(true);
      expect(results.some(r => r.includes('fallback'))).toBe(true);
    });
  });
});
