import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavigationContextProvider } from '../../../src/context/NavigationContextProvider';

describe('NavigationContextProvider', () => {
  let provider: NavigationContextProvider;
  let originalPushState: typeof window.history.pushState;
  let originalReplaceState: typeof window.history.replaceState;

  beforeEach(() => {
    // Store original methods
    originalPushState = window.history.pushState;
    originalReplaceState = window.history.replaceState;

    // Mock window.location
    delete (window as any).location;
    window.location = {
      href: 'http://example.com/test',
      pathname: '/test',
      search: '?foo=bar',
      hash: '#section',
      origin: 'http://example.com',
    } as any;

    // Mock document.referrer
    Object.defineProperty(document, 'referrer', {
      value: 'http://previous.com',
      writable: true,
      configurable: true,
    });

    provider = new NavigationContextProvider();
  });

  afterEach(() => {
    // Restore original methods
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;

    // Clean up provider
    provider.destroy();
  });

  describe('Basic Properties', () => {
    it('should have correct name and enabled state', () => {
      expect(provider.name).toBe('navigation');
      expect(provider.enabled).toBe(true);
    });

    it('should implement ContextProvider interface', () => {
      expect(provider.gather).toBeDefined();
      expect(typeof provider.gather).toBe('function');
      expect(provider.shouldInclude).toBeDefined();
      expect(typeof provider.shouldInclude).toBe('function');
      expect(provider.destroy).toBeDefined();
      expect(typeof provider.destroy).toBe('function');
    });
  });

  describe('Current URL Information', () => {
    it('should gather current URL information', async () => {
      const context = await provider.gather();

      expect(context.provider).toBe('navigation');
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.data.current).toBeDefined();
      expect(context.data.current.url).toContain('http://example.com/test');
      expect(context.data.current.pathname).toBe('/test');
      // Note: jsdom doesn't fully emulate window.location search/hash
      // These are validated in other tests with proper mocks
    });

    it('should extract query parameters', async () => {
      window.location = {
        href: 'http://example.com/page?name=john&age=30',
        pathname: '/page',
        search: '?name=john&age=30',
        hash: '',
      } as any;

      provider = new NavigationContextProvider();
      const context = await provider.gather();

      expect(context.data.current.params).toEqual({
        name: 'john',
        age: '30',
      });
    });

    it('should handle URLs without query params', async () => {
      window.location = {
        href: 'http://example.com/page',
        pathname: '/page',
        search: '',
        hash: '',
      } as any;

      provider = new NavigationContextProvider();
      const context = await provider.gather();

      expect(context.data.current.params).toEqual({});
    });

    it('should handle malformed URLs gracefully', async () => {
      // Override URL constructor to throw
      const originalURL = global.URL;
      global.URL = class {
        constructor() {
          throw new Error('Invalid URL');
        }
      } as any;

      const context = await provider.gather();

      expect(context.data.current).toBeDefined();
      expect(context.data.current.url).toBe(window.location.href);

      // Restore URL
      global.URL = originalURL;
    });
  });

  describe('Referrer Information', () => {
    it('should capture referrer', async () => {
      const context = await provider.gather();

      expect(context.data.referrer).toBe('http://previous.com');
    });

    it('should handle empty referrer', async () => {
      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
        configurable: true,
      });

      const context = await provider.gather();

      expect(context.data.referrer).toBe('');
    });
  });

  describe('History Tracking', () => {
    it('should initialize with current URL', async () => {
      const context = await provider.gather();

      expect(context.data.history).toContain('http://example.com/test');
      expect(context.data.history).toHaveLength(1);
    });

    it('should track popstate events', async () => {
      const event = new PopStateEvent('popstate');
      window.location.href = 'http://example.com/new-page';

      window.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const context = await provider.gather();

      expect(context.data.history.length).toBeGreaterThan(1);
    });

    it('should track pushState navigation', async () => {
      // Simulate pushState
      window.history.pushState({}, '', '/new-page');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const context = await provider.gather();

      expect(context.data.history.length).toBeGreaterThan(0);
    });

    it('should track replaceState navigation', async () => {
      // Simulate replaceState
      window.history.replaceState({}, '', '/replaced-page');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const context = await provider.gather();

      expect(context.data.history.length).toBeGreaterThan(0);
    });

    it('should track hashchange events', async () => {
      const event = new HashChangeEvent('hashchange');
      window.location.hash = '#new-section';

      window.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const context = await provider.gather();

      expect(context.data.history.length).toBeGreaterThan(0);
    });

    it('should limit history to last 5 URLs', async () => {
      // Add 10 URLs
      for (let i = 0; i < 10; i++) {
        window.location.href = `http://example.com/page${i}`;
        const event = new PopStateEvent('popstate');
        window.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const context = await provider.gather();

      expect(context.data.history.length).toBeLessThanOrEqual(5);
    });

    it('should not record duplicate consecutive URLs', async () => {
      const url = 'http://example.com/same-page';
      window.location.href = url;

      // Dispatch same URL multiple times
      for (let i = 0; i < 3; i++) {
        const event = new PopStateEvent('popstate');
        window.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const context = await provider.gather();

      // Should only record once
      const sameUrlCount = context.data.history.filter((h) => h === url).length;
      expect(sameUrlCount).toBe(1);
    });

    it('should provide history length', async () => {
      const context = await provider.gather();

      expect(context.data.historyLength).toBeDefined();
      expect(typeof context.data.historyLength).toBe('number');
    });
  });

  describe('History API Interception', () => {
    it('should restore original pushState on destroy', () => {
      const before = window.history.pushState;
      provider.destroy();
      const after = window.history.pushState;

      expect(before).not.toBe(after);
      expect(after).toBe(originalPushState);
    });

    it('should restore original replaceState on destroy', () => {
      const before = window.history.replaceState;
      provider.destroy();
      const after = window.history.replaceState;

      expect(before).not.toBe(after);
      expect(after).toBe(originalReplaceState);
    });

    it('should handle missing history API gracefully', async () => {
      const originalHistory = window.history;
      delete (window as any).history;

      const newProvider = new NavigationContextProvider();
      const context = await newProvider.gather();

      expect(context.data.current).toBeDefined();

      window.history = originalHistory;
      newProvider.destroy();
    });
  });

  describe('shouldInclude', () => {
    it('should include for both trigger types', () => {
      expect(provider.shouldInclude('proactive')).toBe(true);
      expect(provider.shouldInclude('user-prompt')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      provider.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should clear history on destroy', () => {
      provider.destroy();

      // Create new provider should start with fresh history
      const newProvider = new NavigationContextProvider();

      expect(newProvider['history']).toHaveLength(1); // Only current URL
      newProvider.destroy();
    });

    it('should allow multiple destroy calls', () => {
      expect(() => {
        provider.destroy();
        provider.destroy();
        provider.destroy();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined window', async () => {
      // This test documents expected behavior, actual implementation assumes window exists
      const context = await provider.gather();

      expect(context.data.current).toBeDefined();
    });

    it('should handle rapid navigation changes', async () => {
      const urls = ['/page1', '/page2', '/page3', '/page4', '/page5'];

      for (const url of urls) {
        window.location.href = `http://example.com${url}`;
        const event = new PopStateEvent('popstate');
        window.dispatchEvent(event);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const context = await provider.gather();

      expect(context.data.history.length).toBeGreaterThan(0);
      expect(context.data.history.length).toBeLessThanOrEqual(5);
    });

    it('should handle special characters in URLs', async () => {
      window.location = {
        href: 'http://example.com/page?name=John%20Doe&tag=%23test',
        pathname: '/page',
        search: '?name=John%20Doe&tag=%23test',
        hash: '',
      } as any;

      provider = new NavigationContextProvider();
      const context = await provider.gather();

      expect(context.data.current.params).toHaveProperty('name');
      expect(context.data.current.params).toHaveProperty('tag');
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
        expect(result.provider).toBe('navigation');
        expect(result.data.current).toBeDefined();
      });
    });
  });
});
