/**
 * TelemetryCollector tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TelemetryCollector,
  type TelemetryEvent,
  type TelemetryConfig,
} from '../../../src/telemetry/TelemetryCollector';

describe('TelemetryCollector', () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (collector) {
      collector.destroy();
    }
    vi.useRealTimers();
  });

  describe('Event Collection', () => {
    it('should track events when enabled', () => {
      collector = new TelemetryCollector({ enabled: true, transport: 'console' });

      const event: TelemetryEvent = {
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      };

      collector.track(event);

      const status = collector.getBufferStatus();
      expect(status.size).toBe(2); // session.start + test.event
    });

    it('should not track events when disabled', () => {
      collector = new TelemetryCollector({ enabled: false });

      const event: TelemetryEvent = {
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      };

      collector.track(event);

      const status = collector.getBufferStatus();
      expect(status.size).toBe(0);
    });

    it('should enrich events with session metadata', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({ enabled: true, transport: 'console' });

      const event: TelemetryEvent = {
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      };

      collector.track(event);
      void collector.flush();

      expect(consoleSpy).toHaveBeenCalled();
      const loggedEvents = consoleSpy.mock.calls[0][1] as TelemetryEvent[];
      const testEvent = loggedEvents.find(e => e.type === 'test.event');

      expect(testEvent).toBeDefined();
      expect(testEvent?.metadata?.sessionId).toBeDefined();
      expect(testEvent?.metadata?.eventId).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('Buffering and Batching', () => {
    it('should buffer events up to maxBufferSize', async () => {
      collector = new TelemetryCollector({
        enabled: true,
        maxBufferSize: 10,
        flushIntervalMs: 0,
      });

      // Track events
      for (let i = 0; i < 4; i++) {
        collector.track({
          type: 'test.event',
          timestamp: Date.now(),
          data: { count: i },
        });
      }

      const status = collector.getBufferStatus();
      expect(status.size).toBeGreaterThan(0); // Has buffered events
    });

    it('should auto-flush when buffer is full', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        maxBufferSize: 3,
        transport: 'console',
        flushIntervalMs: 0,
      });

      // Track more events than buffer size
      for (let i = 0; i < 5; i++) {
        collector.track({
          type: 'test.event',
          timestamp: Date.now(),
          data: { count: i },
        });
      }

      // Should have flushed at least once
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should flush on timer interval', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        flushIntervalMs: 100,
        transport: 'console',
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      });

      // Advance timer
      await vi.advanceTimersByTimeAsync(100);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should manually flush events', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        transport: 'console',
        flushIntervalMs: 0,
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      });

      await collector.flush();

      expect(consoleSpy).toHaveBeenCalled();
      expect(collector.getBufferStatus().size).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Sampling Strategies', () => {
    it('should always sample with "always" strategy', () => {
      collector = new TelemetryCollector({
        enabled: true,
        sampling: 'always',
        flushIntervalMs: 0,
      });

      for (let i = 0; i < 10; i++) {
        collector.track({
          type: 'test.event',
          timestamp: Date.now(),
          data: { count: i },
        });
      }

      const status = collector.getBufferStatus();
      expect(status.size).toBe(11); // session.start + 10 events
    });

    it('should never sample with "never" strategy', () => {
      collector = new TelemetryCollector({
        enabled: true,
        sampling: 'never',
        flushIntervalMs: 0,
      });

      for (let i = 0; i < 10; i++) {
        collector.track({
          type: 'test.event',
          timestamp: Date.now(),
          data: { count: i },
        });
      }

      const status = collector.getBufferStatus();
      expect(status.size).toBe(0); // Nothing sampled (session.start uses always sampling)
    });

    it('should probabilistically sample with configured rate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      collector = new TelemetryCollector({
        enabled: true,
        sampling: 'probabilistic',
        samplingRate: 0.5,
        flushIntervalMs: 0,
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      });

      // Random 0.3 < 0.5, should be sampled
      const status = collector.getBufferStatus();
      expect(status.size).toBe(2); // session.start + event

      vi.mocked(Math.random).mockRestore();
    });

    it('should throttle events per type', () => {
      collector = new TelemetryCollector({
        enabled: true,
        sampling: 'throttled',
        samplingRate: 1.0,
        maxEventsPerWindow: 2,
        throttleWindowMs: 1000,
        flushIntervalMs: 0,
      });

      // Track 5 events of same type
      for (let i = 0; i < 5; i++) {
        collector.track({
          type: 'test.event',
          timestamp: Date.now(),
          data: { count: i },
        });
      }

      const status = collector.getBufferStatus();
      // session.start + 2 throttled events (maxEventsPerWindow)
      expect(status.size).toBeLessThanOrEqual(3);
    });
  });

  describe('Privacy and PII Redaction', () => {
    it('should redact PII when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        redactPII: true,
        transport: 'console',
        flushIntervalMs: 0,
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: {
          email: 'user@example.com',
          password: 'secret123',
          message: 'Contact me at user@example.com',
        },
      });

      void collector.flush();

      const loggedEvents = consoleSpy.mock.calls[0][1] as TelemetryEvent[];
      const testEvent = loggedEvents.find(e => e.type === 'test.event');

      expect(testEvent?.data.email).toBe('[REDACTED]');
      expect(testEvent?.data.password).toBe('[REDACTED]');
      expect(testEvent?.data.message).toContain('[REDACTED]');

      consoleSpy.mockRestore();
    });

    it('should redact custom fields', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        redactPII: true,
        redactFields: ['customSecret', 'apiToken'],
        transport: 'console',
        flushIntervalMs: 0,
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: {
          customSecret: 'mysecret',
          apiToken: 'token123',
          publicData: 'visible',
        },
      });

      void collector.flush();

      const loggedEvents = consoleSpy.mock.calls[0][1] as TelemetryEvent[];
      const testEvent = loggedEvents.find(e => e.type === 'test.event');

      expect(testEvent?.data.customSecret).toBe('[REDACTED]');
      expect(testEvent?.data.apiToken).toBe('[REDACTED]');
      expect(testEvent?.data.publicData).toBe('visible');

      consoleSpy.mockRestore();
    });

    it('should not redact when disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        redactPII: false,
        transport: 'console',
        flushIntervalMs: 0,
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: {
          email: 'user@example.com',
          password: 'secret123',
        },
      });

      void collector.flush();

      const loggedEvents = consoleSpy.mock.calls[0][1] as TelemetryEvent[];
      const testEvent = loggedEvents.find(e => e.type === 'test.event');

      expect(testEvent?.data.email).toBe('user@example.com');
      expect(testEvent?.data.password).toBe('secret123');

      consoleSpy.mockRestore();
    });
  });

  describe('Transport Backends', () => {
    it('should send to console transport', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        transport: 'console',
        flushIntervalMs: 0,
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      });

      await collector.flush();

      expect(consoleSpy).toHaveBeenCalledWith('[Telemetry] Events:', expect.any(Array));

      consoleSpy.mockRestore();
    });

    it('should send to custom transport', async () => {
      const customTransport = vi.fn().mockResolvedValue(undefined);
      collector = new TelemetryCollector({
        enabled: true,
        transport: 'custom',
        customTransport,
        flushIntervalMs: 0,
      });

      collector.track({
        type: 'test.event',
        timestamp: Date.now(),
        data: { foo: 'bar' },
      });

      await collector.flush();

      expect(customTransport).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('Helper Methods', () => {
    it('should track performance metrics', () => {
      collector = new TelemetryCollector({
        enabled: true,
        flushIntervalMs: 0,
      });

      collector.trackPerformance({
        name: 'api.latency',
        value: 150,
        unit: 'ms',
        tags: { endpoint: '/api/test' },
      });

      const status = collector.getBufferStatus();
      expect(status.size).toBe(2); // session.start + performance metric
    });

    it('should track errors', () => {
      collector = new TelemetryCollector({
        enabled: true,
        flushIntervalMs: 0,
      });

      const error = new Error('Test error');
      collector.trackError(error, { context: 'test' });

      const status = collector.getBufferStatus();
      expect(status.size).toBe(2); // session.start + error
    });

    it('should track feature usage', () => {
      collector = new TelemetryCollector({
        enabled: true,
        flushIntervalMs: 0,
      });

      collector.trackUsage('proactive.suggestion', {
        action: 'accept',
        suggestionId: '123',
      });

      const status = collector.getBufferStatus();
      expect(status.size).toBe(2); // session.start + usage
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      collector = new TelemetryCollector({
        enabled: true,
        sampling: 'always',
        flushIntervalMs: 0,
      });

      collector.updateConfig({
        sampling: 'never',
        maxBufferSize: 100,
      });

      const config = collector.getConfig();
      expect(config.sampling).toBe('never');
      expect(config.maxBufferSize).toBe(100);
    });

    it('should restart timer when interval changes', () => {
      collector = new TelemetryCollector({
        enabled: true,
        flushIntervalMs: 1000,
      });

      collector.updateConfig({
        flushIntervalMs: 500,
      });

      const config = collector.getConfig();
      expect(config.flushIntervalMs).toBe(500);
    });
  });

  describe('Session Management', () => {
    it('should track session metrics', () => {
      collector = new TelemetryCollector({
        enabled: true,
        flushIntervalMs: 0,
      });

      // Track some events
      for (let i = 0; i < 3; i++) {
        collector.track({
          type: 'test.event',
          timestamp: Date.now(),
          data: { count: i },
        });
      }

      const metrics = collector.getSessionMetrics();
      expect(metrics.sessionId).toBeDefined();
      expect(metrics.eventCount).toBe(4); // session.start + 3 events
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should track session start and end', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      collector = new TelemetryCollector({
        enabled: true,
        transport: 'console',
        flushIntervalMs: 0,
      });

      collector.destroy();

      await vi.runAllTimersAsync();

      const calls = consoleSpy.mock.calls;
      const events = calls.flatMap(call => call[1] as TelemetryEvent[]);

      const startEvent = events.find(e => e.type === 'session.start');
      const endEvent = events.find(e => e.type === 'session.end');

      expect(startEvent).toBeDefined();
      expect(endEvent).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('Buffer Status', () => {
    it('should report buffer utilization', () => {
      collector = new TelemetryCollector({
        enabled: true,
        maxBufferSize: 10,
        flushIntervalMs: 0,
      });

      for (let i = 0; i < 5; i++) {
        collector.track({
          type: 'test.event',
          timestamp: Date.now(),
          data: { count: i },
        });
      }

      const status = collector.getBufferStatus();
      expect(status.size).toBe(6); // session.start + 5 events
      expect(status.maxSize).toBe(10);
      expect(status.utilizationRate).toBe(0.6);
    });
  });
});
