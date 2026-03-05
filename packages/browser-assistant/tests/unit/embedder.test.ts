import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClippyEmbedder } from '../../src/core/embedder.js';

if (typeof CSSStyleSheet === 'undefined' || !CSSStyleSheet.prototype.replaceSync) {
  global.CSSStyleSheet = class {
    replaceSync(_css: string) {}
  } as unknown as typeof CSSStyleSheet;
}

describe('ClippyEmbedder', () => {
  let embedder: ClippyEmbedder;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app">App Content</div>';
    vi.useFakeTimers();
  });

  afterEach(() => {
    embedder?.destroy();
    vi.useRealTimers();
  });

  describe('init', () => {
    it('should throw if no apiKey is provided', async () => {
      embedder = new ClippyEmbedder({} as never);
      await expect(embedder.init()).rejects.toThrow('apiKey is required');
    });

    it('should mount shadow DOM on init', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();

      const host = document.querySelector('[data-clippy-host]');
      expect(host).not.toBeNull();
    });

    it('should call onReady callback after init', async () => {
      const onReady = vi.fn();
      embedder = new ClippyEmbedder({ apiKey: 'test-key', onReady });
      await embedder.init();

      expect(onReady).toHaveBeenCalledOnce();
    });

    it('should call onError callback when init fails', async () => {
      const onError = vi.fn();
      embedder = new ClippyEmbedder({ onError } as never);

      await expect(embedder.init()).rejects.toThrow();
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('should be idempotent on double init', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();
      await embedder.init();

      const hosts = document.querySelectorAll('[data-clippy-host]');
      expect(hosts.length).toBe(1);
    });

    it('should apply default position bottom-right', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();

      const host = document.querySelector('[data-clippy-host]');
      expect(host?.getAttribute('data-position')).toBe('bottom-right');
    });

    it('should apply custom position', async () => {
      embedder = new ClippyEmbedder({
        apiKey: 'test-key',
        position: 'top-left',
      });
      await embedder.init();

      const host = document.querySelector('[data-clippy-host]');
      expect(host?.getAttribute('data-position')).toBe('top-left');
    });
  });

  describe('showMessage', () => {
    it('should show message in balloon after init', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();

      embedder.showMessage('Hello World');

      const host = document.querySelector('[data-clippy-host]') as HTMLElement;
      const shadow = host.shadowRoot!;
      const balloon = shadow.querySelector('.clippy-balloon') as HTMLElement;
      expect(balloon.textContent).toBe('Hello World');
      expect(balloon.hidden).toBe(false);
    });

    it('should not throw when called before init', () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      expect(() => embedder.showMessage('Test')).not.toThrow();
    });
  });

  describe('hideMessage', () => {
    it('should hide the balloon', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();

      embedder.showMessage('Visible');
      embedder.hideMessage();

      const host = document.querySelector('[data-clippy-host]') as HTMLElement;
      const shadow = host.shadowRoot!;
      const balloon = shadow.querySelector('.clippy-balloon') as HTMLElement;
      expect(balloon.hidden).toBe(true);
    });
  });

  describe('gatherContext', () => {
    it('should return page and behavior context after init', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();

      const context = await embedder.gatherContext();
      expect(context).toHaveProperty('page');
      expect(context).toHaveProperty('behavior');
    });

    it('should return nulls when not initialized', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });

      const context = await embedder.gatherContext();
      expect(context.page).toBeNull();
      expect(context.behavior).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should remove shadow DOM from document', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();
      expect(document.querySelector('[data-clippy-host]')).not.toBeNull();

      embedder.destroy();
      expect(document.querySelector('[data-clippy-host]')).toBeNull();
    });

    it('should not throw when called without init', () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      expect(() => embedder.destroy()).not.toThrow();
    });

    it('should allow re-init after destroy', async () => {
      embedder = new ClippyEmbedder({ apiKey: 'test-key' });
      await embedder.init();
      embedder.destroy();
      expect(document.querySelector('[data-clippy-host]')).toBeNull();

      await embedder.init();
      expect(document.querySelector('[data-clippy-host]')).not.toBeNull();
    });

    it('should stop proactive behavior timer', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      embedder = new ClippyEmbedder({
        apiKey: 'test-key',
        proactive: { enabled: true, intrusionLevel: 'low', checkInterval: 1000 },
      });
      await embedder.init();
      embedder.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('proactive behavior', () => {
    it('should start proactive checks when enabled', async () => {
      embedder = new ClippyEmbedder({
        apiKey: 'test-key',
        proactive: { enabled: true, intrusionLevel: 'low', checkInterval: 5000 },
      });
      await embedder.init();

      await vi.advanceTimersByTimeAsync(5100);
    });

    it('should not start proactive checks when disabled', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const callsBefore = setIntervalSpy.mock.calls.length;

      embedder = new ClippyEmbedder({
        apiKey: 'test-key',
        proactive: { enabled: false, intrusionLevel: 'low', checkInterval: 30000 },
      });
      await embedder.init();

      expect(setIntervalSpy.mock.calls.length).toBe(callsBefore);
      setIntervalSpy.mockRestore();
    });
  });
});
