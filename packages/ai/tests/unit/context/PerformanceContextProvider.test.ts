import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceContextProvider } from '../../../src/context/PerformanceContextProvider';

describe('PerformanceContextProvider', () => {
  let provider: PerformanceContextProvider;

  beforeEach(() => {
    // Mock performance API
    const mockPerformance = {
      getEntriesByType: vi.fn((type: string) => {
        if (type === 'navigation') {
          return [
            {
              domContentLoadedEventEnd: 1500,
              loadEventEnd: 2000,
              domInteractive: 1200,
            },
          ];
        }
        if (type === 'paint') {
          return [
            {
              name: 'first-contentful-paint',
              startTime: 800,
            },
          ];
        }
        return [];
      }),
      now: vi.fn(() => Date.now()),
    };

    vi.stubGlobal('performance', mockPerformance);
    vi.stubGlobal('PerformanceObserver', undefined);
    vi.stubGlobal('navigator', {});

    provider = new PerformanceContextProvider();
  });

  describe('Basic Properties', () => {
    it('should have correct name and enabled state', () => {
      expect(provider.name).toBe('performance');
      expect(provider.enabled).toBe(true);
    });

    it('should implement ContextProvider interface', () => {
      expect(provider.gather).toBeDefined();
      expect(typeof provider.gather).toBe('function');
      expect(provider.shouldInclude).toBeDefined();
      expect(typeof provider.shouldInclude).toBe('function');
    });
  });

  describe('Navigation Timing', () => {
    it('should gather navigation timing metrics', async () => {
      const context = await provider.gather();

      expect(context.provider).toBe('performance');
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.data.navigation).toBeDefined();
      expect(context.data.navigation.domContentLoaded).toBe(1500);
      expect(context.data.navigation.loadComplete).toBe(2000);
      expect(context.data.navigation.timeToInteractive).toBe(1200);
    });

    it('should handle missing navigation timing', async () => {
      vi.mocked(performance.getEntriesByType).mockReturnValue([]);

      const context = await provider.gather();

      expect(context.data.navigation.domContentLoaded).toBe(0);
      expect(context.data.navigation.loadComplete).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(performance.getEntriesByType).mockImplementation(() => {
        throw new Error('Performance API error');
      });

      const context = await provider.gather();

      expect(context.data.navigation).toBeDefined();
      expect(context.data.navigation.domContentLoaded).toBe(0);
    });
  });

  describe('Paint Timing', () => {
    it('should gather First Contentful Paint', async () => {
      const context = await provider.gather();

      expect(context.data.paint).toBeDefined();
      expect(context.data.paint.fcp).toBe(800);
    });

    it('should handle missing FCP', async () => {
      vi.mocked(performance.getEntriesByType).mockImplementation((type: string) => {
        if (type === 'paint') return [];
        return [];
      });

      const context = await provider.gather();

      expect(context.data.paint.fcp).toBeUndefined();
    });

    it('should include LCP if observed', async () => {
      const context = await provider.gather();

      // LCP requires PerformanceObserver, will be undefined in this test
      expect(context.data.paint.lcp).toBeUndefined();
    });
  });

  describe('Web Vitals', () => {
    it('should gather Core Web Vitals', async () => {
      const context = await provider.gather();

      expect(context.data.vitals).toBeDefined();
      // Values will be undefined without PerformanceObserver
      expect(context.data.vitals.cls).toBeUndefined();
      expect(context.data.vitals.fid).toBeUndefined();
    });

    it('should setup PerformanceObserver for vitals tracking', () => {
      // Mock PerformanceObserver
      const observeSpy = vi.fn();
      const mockObserver = {
        observe: observeSpy,
        disconnect: vi.fn(),
      };

      vi.stubGlobal(
        'PerformanceObserver',
        vi.fn(() => mockObserver)
      );

      provider = new PerformanceContextProvider();

      // Should attempt to observe performance entries
      expect(observeSpy).toHaveBeenCalled();

      // Note: Testing actual LCP updates requires real browser environment
      // In jsdom, the observers are set up but won't fire without real rendering
    });
  });

  describe('Memory Information', () => {
    it('should gather memory info when available', async () => {
      vi.stubGlobal('performance', {
        ...performance,
        memory: {
          usedJSHeapSize: 50000000,
          totalJSHeapSize: 100000000,
          jsHeapSizeLimit: 200000000,
        },
      });

      const context = await provider.gather();

      expect(context.data.memory).toBeDefined();
      expect(context.data.memory?.usedJSHeapSize).toBe(50000000);
      expect(context.data.memory?.totalJSHeapSize).toBe(100000000);
      expect(context.data.memory?.jsHeapSizeLimit).toBe(200000000);
    });

    it('should return undefined when memory API unavailable', async () => {
      const context = await provider.gather();

      expect(context.data.memory).toBeUndefined();
    });
  });

  describe('Network Information', () => {
    it('should gather network info when available', async () => {
      vi.stubGlobal('navigator', {
        connection: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
        },
      });

      const context = await provider.gather();

      expect(context.data.network).toBeDefined();
      expect(context.data.network?.effectiveType).toBe('4g');
      expect(context.data.network?.downlink).toBe(10);
      expect(context.data.network?.rtt).toBe(50);
    });

    it('should return undefined when network API unavailable', async () => {
      const context = await provider.gather();

      expect(context.data.network).toBeUndefined();
    });
  });

  describe('shouldInclude', () => {
    it('should include for user-prompt triggers', () => {
      expect(provider.shouldInclude('user-prompt')).toBe(true);
    });

    it('should not include for proactive triggers', () => {
      expect(provider.shouldInclude('proactive')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle complete API failure gracefully', async () => {
      vi.stubGlobal('performance', undefined);

      const context = await provider.gather();

      expect(context.provider).toBe('performance');
      expect(context.data.navigation).toBeDefined();
    });

    it('should handle partial API failures', async () => {
      vi.mocked(performance.getEntriesByType).mockImplementation((type: string) => {
        if (type === 'navigation') {
          throw new Error('Navigation error');
        }
        return [];
      });

      const context = await provider.gather();

      expect(context.data.navigation).toBeDefined();
      expect(context.data.paint).toBeDefined();
    });
  });

  describe('PerformanceObserver Integration', () => {
    it('should setup observers when PerformanceObserver is available', () => {
      const observeSpy = vi.fn();
      vi.stubGlobal(
        'PerformanceObserver',
        vi.fn(() => ({
          observe: observeSpy,
          disconnect: vi.fn(),
        }))
      );

      provider = new PerformanceContextProvider();

      // Observers are set up in constructor
      expect(observeSpy).toHaveBeenCalled();
    });

    it('should handle PerformanceObserver errors', () => {
      vi.stubGlobal(
        'PerformanceObserver',
        vi.fn(() => {
          throw new Error('Observer error');
        })
      );

      // Should not throw during construction
      expect(() => new PerformanceContextProvider()).not.toThrow();
    });

    it('should handle unsupported observer types', () => {
      const observeSpy = vi.fn().mockImplementation(() => {
        throw new Error('Type not supported');
      });

      vi.stubGlobal(
        'PerformanceObserver',
        vi.fn(() => ({
          observe: observeSpy,
          disconnect: vi.fn(),
        }))
      );

      // Should not throw during construction
      expect(() => new PerformanceContextProvider()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should gather context quickly (<20ms)', async () => {
      const start = performance.now();
      await provider.gather();
      const end = performance.now();

      expect(end - start).toBeLessThan(20);
    });

    it('should handle multiple rapid calls', async () => {
      const results = await Promise.all([
        provider.gather(),
        provider.gather(),
        provider.gather(),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.provider).toBe('performance');
        expect(result.data.navigation).toBeDefined();
      });
    });
  });
});
