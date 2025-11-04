/**
 * Sprint 5 Performance Benchmarks
 *
 * Performance benchmarking for Sprint 5 production features:
 * - Error recovery overhead
 * - Telemetry collection performance
 * - Cache operation benchmarks
 * - Stream processing throughput
 * - Memory usage profiling
 *
 * @packageDocumentation
 */

import { describe, it, bench, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
} from '../../src/errors/CircuitBreaker';
import {
  ErrorClassifier,
} from '../../src/errors/ErrorClassifier';
import {
  RetryPolicy,
} from '../../src/errors/RetryPolicy';
import {
  RecoveryStrategy,
} from '../../src/errors/RecoveryStrategies';
import {
  Telemetry,
} from '../../src/errors/TelemetryHooks';
import {
  ResponseCache,
} from '../../src/cache/ResponseCache';
import {
  StreamController,
} from '../../src/streaming/StreamController';
import {
  StreamMonitor,
} from '../../src/streaming/StreamMonitor';

describe('Sprint 5: Performance Benchmarks', () => {
  // ==========================================================================
  // Setup
  // ==========================================================================

  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    Telemetry.reset();
    registry = new CircuitBreakerRegistry();
  });

  // ==========================================================================
  // Benchmark Suite 1: Error Classification Performance
  // ==========================================================================

  describe('Error Classification Benchmarks', () => {
    bench('classify single error', () => {
      const classifier = new ErrorClassifier();
      const error = new Error('Test error');
      classifier.classify(error);
    });

    bench('classify 100 errors', () => {
      const classifier = new ErrorClassifier();
      for (let i = 0; i < 100; i++) {
        const error = new Error(`Error ${i}`);
        classifier.classify(error);
      }
    });

    bench('classify with custom config', () => {
      const classifier = new ErrorClassifier({
        defaultType: 'unknown',
        customClassifiers: [
          (error) => {
            if (error.message.includes('custom')) {
              return { type: 'custom', severity: 'low', retryable: false };
            }
          },
        ],
      });
      const error = new Error('custom error');
      classifier.classify(error);
    });
  });

  // ==========================================================================
  // Benchmark Suite 2: Circuit Breaker Performance
  // ==========================================================================

  describe('Circuit Breaker Benchmarks', () => {
    bench('circuit breaker successful execution', async () => {
      const circuit = new CircuitBreaker('bench-service');
      await circuit.execute(async () => 'success');
    });

    bench('circuit breaker with failures', async () => {
      const circuit = new CircuitBreaker('bench-failing', {
        failureThreshold: 0.9,
        requestThreshold: 10,
      });

      for (let i = 0; i < 10; i++) {
        try {
          await circuit.execute(async () => {
            if (i % 3 === 0) throw new Error('Fail');
            return 'success';
          });
        } catch {}
      }
    });

    bench('circuit breaker registry lookup', () => {
      registry.get('test-service');
    });

    bench('get all circuits (100 registered)', () => {
      // Setup
      for (let i = 0; i < 100; i++) {
        registry.get(`service-${i}`);
      }

      // Benchmark
      registry.getAllStats();
    });
  });

  // ==========================================================================
  // Benchmark Suite 3: Retry Policy Performance
  // ==========================================================================

  describe('Retry Policy Benchmarks', () => {
    bench('successful execution (no retries)', async () => {
      const policy = new RetryPolicy({ maxRetries: 3 });
      await policy.execute(async () => 'success');
    });

    bench('exponential backoff calculation', async () => {
      const policy = new RetryPolicy({
        maxRetries: 5,
        backoff: 'exponential',
        baseDelay: 10,
      });

      let attempt = 0;
      try {
        await policy.execute(async () => {
          attempt++;
          if (attempt < 3) throw new Error('Retry');
          return 'success';
        });
      } catch {}
    });

    bench('jittered backoff calculation', async () => {
      const policy = new RetryPolicy({
        maxRetries: 5,
        backoff: 'exponential',
        baseDelay: 10,
        jitter: true,
      });

      let attempt = 0;
      try {
        await policy.execute(async () => {
          attempt++;
          if (attempt < 3) throw new Error('Retry');
          return 'success';
        });
      } catch {}
    });
  });

  // ==========================================================================
  // Benchmark Suite 4: Telemetry Performance
  // ==========================================================================

  describe('Telemetry Benchmarks', () => {
    bench('report error event', () => {
      Telemetry.configure({
        onError: () => {},
      });

      const classifier = new ErrorClassifier();
      const error = new Error('Test');
      const info = classifier.classify(error);
      Telemetry.reportError(error, info);
    });

    bench('report 1000 error events', () => {
      const events: any[] = [];
      Telemetry.configure({
        onError: (event) => events.push(event),
      });

      const classifier = new ErrorClassifier();

      for (let i = 0; i < 1000; i++) {
        const error = new Error(`Error ${i}`);
        const info = classifier.classify(error);
        Telemetry.reportError(error, info);
      }
    });

    bench('report circuit breaker event', () => {
      Telemetry.configure({
        onCircuitBreaker: () => {},
      });

      Telemetry.reportCircuitBreaker('test', 'open', 'threshold exceeded', {
        failureRate: 0.6,
        totalRequests: 100,
        failures: 60,
        successes: 40,
      });
    });

    bench('report retry event', () => {
      Telemetry.configure({
        onRetry: () => {},
      });

      const classifier = new ErrorClassifier();
      const error = new Error('Test');
      const info = classifier.classify(error);

      Telemetry.reportRetry(1, 3, 100, info);
    });

    bench('telemetry with async callback', async () => {
      Telemetry.configure({
        onError: async (event) => {
          await new Promise(resolve => setTimeout(resolve, 1));
        },
      });

      const classifier = new ErrorClassifier();
      const error = new Error('Test');
      const info = classifier.classify(error);
      Telemetry.reportError(error, info);
    });
  });

  // ==========================================================================
  // Benchmark Suite 5: Cache Performance
  // ==========================================================================

  describe('Cache Benchmarks', () => {
    bench('cache set operation', async () => {
      const cache = new ResponseCache({ maxSize: 1000 });
      await cache.set('test-key', { data: 'test-value' });
    });

    bench('cache get operation (hit)', async () => {
      const cache = new ResponseCache({ maxSize: 1000 });
      await cache.set('test-key', { data: 'test-value' });
      await cache.get('test-key');
    });

    bench('cache get operation (miss)', async () => {
      const cache = new ResponseCache({ maxSize: 1000 });
      await cache.get('non-existent-key');
    });

    bench('cache set/get 100 entries', async () => {
      const cache = new ResponseCache({ maxSize: 1000 });

      for (let i = 0; i < 100; i++) {
        await cache.set(`key-${i}`, { data: `value-${i}` });
      }

      for (let i = 0; i < 100; i++) {
        await cache.get(`key-${i}`);
      }
    });

    bench('cache with LRU eviction', async () => {
      const cache = new ResponseCache({
        maxSize: 10,
        evictionStrategy: 'lru',
      });

      // Fill cache beyond capacity
      for (let i = 0; i < 20; i++) {
        await cache.set(`key-${i}`, { data: `value-${i}` });
      }
    });

    bench('cache invalidation by pattern', async () => {
      const cache = new ResponseCache({ maxSize: 1000 });

      // Setup
      for (let i = 0; i < 100; i++) {
        await cache.set(`user:${i}:profile`, { name: `User ${i}` });
      }

      // Benchmark
      await cache.invalidate(/^user:5/);
    });

    bench('cache statistics calculation', async () => {
      const cache = new ResponseCache({ maxSize: 1000 });

      // Generate activity
      for (let i = 0; i < 50; i++) {
        await cache.set(`key-${i}`, `value-${i}`);
        await cache.get(`key-${i}`);
      }

      // Benchmark
      cache.getStats();
    });
  });

  // ==========================================================================
  // Benchmark Suite 6: Stream Processing Performance
  // ==========================================================================

  describe('Stream Processing Benchmarks', () => {
    bench('stream controller pause/resume', () => {
      const controller = new StreamController();
      controller.pause();
      controller.resume();
    });

    bench('stream controller backpressure check', async () => {
      const controller = new StreamController({
        enableBackpressure: true,
        bufferSize: 100,
      });
      await controller.checkBackpressure();
    });

    bench('stream monitor record chunk', () => {
      const monitor = new StreamMonitor();
      monitor.start();
      monitor.recordChunk(1024); // 1KB chunk
    });

    bench('stream monitor with 1000 chunks', () => {
      const monitor = new StreamMonitor();
      monitor.start();

      for (let i = 0; i < 1000; i++) {
        monitor.recordChunk(1024);
      }

      monitor.getMetrics();
      monitor.stop();
    });

    bench('stream metrics calculation', () => {
      const monitor = new StreamMonitor();
      monitor.start();

      for (let i = 0; i < 100; i++) {
        monitor.recordChunk(1024);
      }

      monitor.getMetrics();
    });
  });

  // ==========================================================================
  // Benchmark Suite 7: Recovery Strategy Performance
  // ==========================================================================

  describe('Recovery Strategy Benchmarks', () => {
    bench('successful recovery', async () => {
      const strategy = new RecoveryStrategy();
      const classifier = new ErrorClassifier();
      const error = new Error('Test');
      const info = classifier.classify(error);

      await strategy.recover(
        error,
        info,
        async () => 'recovered'
      );
    });

    bench('recovery with fallback', async () => {
      const strategy = new RecoveryStrategy({ maxAttempts: 2 });
      const classifier = new ErrorClassifier();
      const error = new Error('Test');
      const info = classifier.classify(error);

      let attempts = 0;
      await strategy.recover(
        error,
        info,
        async () => {
          attempts++;
          if (attempts < 3) throw new Error('Still failing');
          return 'recovered';
        },
        async () => 'fallback'
      );
    });
  });

  // ==========================================================================
  // Benchmark Suite 8: Combined Operations (Real-world Scenarios)
  // ==========================================================================

  describe('Combined Operations Benchmarks', () => {
    bench('full error handling pipeline', async () => {
      const classifier = new ErrorClassifier();
      const circuit = new CircuitBreaker('bench-pipeline');
      const policy = new RetryPolicy({ maxRetries: 2, baseDelay: 1 });
      const strategy = new RecoveryStrategy({ maxAttempts: 1 });

      const events: any[] = [];
      Telemetry.configure({
        onError: (event) => events.push(event),
        onRetry: (event) => events.push(event),
      });

      let attempts = 0;
      try {
        await circuit.execute(async () => {
          return await policy.execute(async () => {
            attempts++;
            if (attempts < 2) throw new Error('Transient');
            return 'success';
          });
        });
      } catch (error) {
        const info = classifier.classify(error);
        Telemetry.reportError(error, info);
      }
    });

    bench('cached request with circuit breaker', async () => {
      const cache = new ResponseCache({ maxSize: 100 });
      const circuit = new CircuitBreaker('cached-service');

      const key = 'cached-request';

      // Check cache
      let result = await cache.get(key);

      if (!result) {
        // Execute with circuit breaker
        result = await circuit.execute(async () => {
          return { data: 'response' };
        });

        // Cache result
        await cache.set(key, result);
      }
    });

    bench('resilient streaming with monitoring', async () => {
      const controller = new StreamController({
        enableBackpressure: true,
        bufferSize: 50,
      });
      const monitor = new StreamMonitor();
      const circuit = new CircuitBreaker('stream-source');

      monitor.start();

      try {
        await circuit.execute(async () => {
          for (let i = 0; i < 10; i++) {
            await controller.checkBackpressure();
            monitor.recordChunk(1024);
          }
        });
      } finally {
        monitor.stop();
      }
    });
  });

  // ==========================================================================
  // Benchmark Suite 9: Memory and Resource Usage
  // ==========================================================================

  describe('Resource Usage Benchmarks', () => {
    bench('create 100 circuit breakers', () => {
      for (let i = 0; i < 100; i++) {
        registry.get(`service-${i}`);
      }
    });

    bench('cache with 1000 entries', async () => {
      const cache = new ResponseCache({ maxSize: 1000 });

      for (let i = 0; i < 1000; i++) {
        await cache.set(`key-${i}`, {
          data: `value-${i}`,
          timestamp: Date.now(),
        });
      }
    });

    bench('telemetry with 1000 events', () => {
      const events: any[] = [];
      Telemetry.configure({
        onError: (event) => events.push(event),
      });

      const classifier = new ErrorClassifier();

      for (let i = 0; i < 1000; i++) {
        const error = new Error(`Error ${i}`);
        const info = classifier.classify(error);
        Telemetry.reportError(error, info, { index: i });
      }
    });

    bench('stream monitor with extended session', () => {
      const monitor = new StreamMonitor();
      monitor.start();

      // Simulate 1 hour of streaming (sampled)
      for (let i = 0; i < 3600; i++) {
        monitor.recordChunk(1024);
      }

      monitor.getMetrics();
      monitor.stop();
    });
  });

  // ==========================================================================
  // Benchmark Suite 10: Overhead Measurement
  // ==========================================================================

  describe('Overhead Benchmarks', () => {
    bench('baseline function call', async () => {
      const fn = async () => 'result';
      await fn();
    });

    bench('function call with circuit breaker', async () => {
      const circuit = new CircuitBreaker('overhead-test');
      const fn = async () => 'result';
      await circuit.execute(fn);
    });

    bench('function call with retry policy', async () => {
      const policy = new RetryPolicy({ maxRetries: 0 });
      const fn = async () => 'result';
      await policy.execute(fn);
    });

    bench('function call with telemetry', async () => {
      Telemetry.configure({ onError: () => {} });
      const classifier = new ErrorClassifier();

      const fn = async () => {
        try {
          return 'result';
        } catch (error) {
          const info = classifier.classify(error);
          Telemetry.reportError(error, info);
          throw error;
        }
      };

      await fn();
    });

    bench('function call with full resilience stack', async () => {
      const circuit = new CircuitBreaker('full-stack');
      const policy = new RetryPolicy({ maxRetries: 1 });
      const cache = new ResponseCache({ maxSize: 100 });

      Telemetry.configure({ onError: () => {} });

      const key = 'test-key';
      let result = await cache.get(key);

      if (!result) {
        result = await circuit.execute(async () => {
          return await policy.execute(async () => 'result');
        });
        await cache.set(key, result);
      }
    });
  });
});

// ==========================================================================
// Performance Targets
// ==========================================================================

/**
 * Sprint 5 Performance Targets:
 *
 * Error Classification:
 * - Single classification: < 1ms
 * - 100 classifications: < 50ms
 *
 * Circuit Breaker:
 * - Successful execution: < 1ms overhead
 * - Registry lookup: < 0.1ms
 *
 * Retry Policy:
 * - No retries overhead: < 0.5ms
 * - Backoff calculation: < 0.1ms per attempt
 *
 * Telemetry:
 * - Report event: < 0.5ms (sync)
 * - 1000 events: < 100ms (batched)
 *
 * Cache:
 * - Set operation: < 1ms
 * - Get operation (hit): < 0.5ms
 * - Get operation (miss): < 0.1ms
 * - 100 operations: < 50ms
 *
 * Stream Processing:
 * - Record chunk: < 0.1ms
 * - 1000 chunks: < 50ms
 * - Metrics calculation: < 1ms
 *
 * Overhead:
 * - Circuit breaker: < 1ms additional
 * - Retry policy: < 0.5ms additional
 * - Full stack: < 5ms additional
 *
 * Resource Usage:
 * - 100 circuit breakers: < 10MB
 * - 1000 cache entries: < 50MB
 * - 1000 telemetry events: < 20MB
 */
