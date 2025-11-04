import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewportContextProvider } from '../../../src/context/ViewportContextProvider';

describe('ViewportContextProvider', () => {
  let provider: ViewportContextProvider;

  beforeEach(() => {
    // Reset window mocks
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 2,
      scrollX: 0,
      scrollY: 0,
      pageXOffset: 0,
      pageYOffset: 0,
      matchMedia: vi.fn((query: string) => ({
        matches: query === '(orientation: landscape)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.stubGlobal('document', {
      documentElement: {
        scrollWidth: 2000,
        scrollHeight: 3000,
      },
    });

    vi.stubGlobal('navigator', {
      maxTouchPoints: 0,
    });

    provider = new ViewportContextProvider();
  });

  describe('Basic Properties', () => {
    it('should have correct name and enabled state', () => {
      expect(provider.name).toBe('viewport');
      expect(provider.enabled).toBe(true);
    });

    it('should implement ContextProvider interface', () => {
      expect(provider.gather).toBeDefined();
      expect(typeof provider.gather).toBe('function');
      expect(provider.shouldInclude).toBeDefined();
      expect(typeof provider.shouldInclude).toBe('function');
    });
  });

  describe('Context Gathering', () => {
    it('should gather viewport dimensions', async () => {
      const context = await provider.gather();

      expect(context.provider).toBe('viewport');
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.data.viewport).toBeDefined();
      expect(context.data.viewport.width).toBe(1920);
      expect(context.data.viewport.height).toBe(1080);
    });

    it('should detect device pixel ratio', async () => {
      const context = await provider.gather();

      expect(context.data.viewport.devicePixelRatio).toBe(2);
    });

    it('should fallback to 1 for missing devicePixelRatio', async () => {
      vi.stubGlobal('window', {
        ...window,
        devicePixelRatio: undefined,
      });

      const context = await provider.gather();

      expect(context.data.viewport.devicePixelRatio).toBe(1);
    });

    it('should detect landscape orientation', async () => {
      const context = await provider.gather();

      expect(context.data.viewport.orientation).toBe('landscape');
    });

    it('should detect portrait orientation', async () => {
      vi.stubGlobal('window', {
        ...window,
        innerWidth: 768,
        innerHeight: 1024,
        matchMedia: vi.fn((query: string) => ({
          matches: query === '(orientation: portrait)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const context = await provider.gather();

      expect(context.data.viewport.orientation).toBe('portrait');
    });

    it('should fallback to dimension comparison for orientation', async () => {
      vi.stubGlobal('window', {
        ...window,
        innerWidth: 768,
        innerHeight: 1024,
        matchMedia: undefined,
      });

      const context = await provider.gather();

      expect(context.data.viewport.orientation).toBe('portrait');
    });
  });

  describe('Scroll Information', () => {
    it('should gather scroll position', async () => {
      vi.stubGlobal('window', {
        ...window,
        scrollX: 100,
        scrollY: 500,
      });

      const context = await provider.gather();

      expect(context.data.scroll.x).toBe(100);
      expect(context.data.scroll.y).toBe(500);
    });

    it('should calculate scroll percentages', async () => {
      vi.stubGlobal('window', {
        ...window,
        innerWidth: 1920,
        innerHeight: 1080,
        scrollX: 40, // maxX = 2000 - 1920 = 80, so 40/80 = 50%
        scrollY: 960, // maxY = 3000 - 1080 = 1920, so 960/1920 = 50%
      });

      const context = await provider.gather();

      expect(context.data.scroll.percentX).toBe(50);
      expect(context.data.scroll.percentY).toBe(50);
    });

    it('should handle zero scroll percentages', async () => {
      vi.stubGlobal('window', {
        ...window,
        scrollX: 0,
        scrollY: 0,
      });

      const context = await provider.gather();

      expect(context.data.scroll.percentX).toBe(0);
      expect(context.data.scroll.percentY).toBe(0);
    });

    it('should handle page smaller than viewport', async () => {
      vi.stubGlobal('document', {
        documentElement: {
          scrollWidth: 1000,
          scrollHeight: 500,
        },
      });

      const context = await provider.gather();

      expect(context.data.scroll.maxX).toBe(0);
      expect(context.data.scroll.maxY).toBe(0);
      expect(context.data.scroll.percentX).toBe(0);
      expect(context.data.scroll.percentY).toBe(0);
    });

    it('should use pageXOffset/pageYOffset fallback', async () => {
      vi.stubGlobal('window', {
        ...window,
        scrollX: undefined,
        scrollY: undefined,
        pageXOffset: 200,
        pageYOffset: 400,
      });

      const context = await provider.gather();

      expect(context.data.scroll.x).toBe(200);
      expect(context.data.scroll.y).toBe(400);
    });
  });

  describe('Touch Detection', () => {
    it('should detect touch capability via ontouchstart', async () => {
      vi.stubGlobal('window', {
        ...window,
        ontouchstart: {},
      });

      const context = await provider.gather();

      expect(context.data.touch).toBe(true);
    });

    it('should detect touch capability via maxTouchPoints', async () => {
      vi.stubGlobal('navigator', {
        maxTouchPoints: 5,
      });

      const context = await provider.gather();

      expect(context.data.touch).toBe(true);
    });

    it('should detect no touch capability', async () => {
      const context = await provider.gather();

      expect(context.data.touch).toBe(false);
    });
  });

  describe('Visible Area', () => {
    it('should calculate visible area bounds', async () => {
      vi.stubGlobal('window', {
        ...window,
        innerWidth: 1920,
        innerHeight: 1080,
        scrollX: 100,
        scrollY: 500,
      });

      const context = await provider.gather();

      expect(context.data.visibleArea).toBeDefined();
      expect(context.data.visibleArea?.top).toBe(500);
      expect(context.data.visibleArea?.left).toBe(100);
      expect(context.data.visibleArea?.bottom).toBe(1580);
      expect(context.data.visibleArea?.right).toBe(2020);
    });

    it('should handle errors gracefully', async () => {
      vi.stubGlobal('window', {
        ...window,
        scrollX: undefined,
        scrollY: undefined,
        pageXOffset: undefined,
        pageYOffset: undefined,
      });

      const context = await provider.gather();

      // Should still gather other context even if visible area fails
      expect(context.data.viewport).toBeDefined();
      expect(context.data.scroll).toBeDefined();
    });
  });

  describe('shouldInclude', () => {
    it('should always include viewport context', () => {
      expect(provider.shouldInclude('proactive')).toBe(true);
      expect(provider.shouldInclude('user-prompt')).toBe(true);
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
        expect(result.provider).toBe('viewport');
        expect(result.data.viewport).toBeDefined();
      });
    });
  });
});
