import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShadowRenderer } from '../../src/shadow/shadow-renderer.js';

if (typeof CSSStyleSheet === 'undefined' || !CSSStyleSheet.prototype.replaceSync) {
  global.CSSStyleSheet = class {
    replaceSync(_css: string) {}
  } as unknown as typeof CSSStyleSheet;
}

describe('ShadowRenderer', () => {
  let renderer: ShadowRenderer;

  const defaultOptions = {
    position: 'bottom-right' as const,
    theme: 'light' as const,
    zIndex: 9999,
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    renderer = new ShadowRenderer(defaultOptions);
  });

  afterEach(() => {
    renderer.unmount();
  });

  describe('constructor', () => {
    it('should create a host element with data attributes', () => {
      renderer.mount();
      const host = document.querySelector('[data-clippy-host]');
      expect(host).not.toBeNull();
      expect(host?.getAttribute('data-position')).toBe('bottom-right');
      expect(host?.getAttribute('data-theme')).toBe('light');
    });

    it('should set z-index CSS custom property', () => {
      renderer.mount();
      const host = document.querySelector('[data-clippy-host]') as HTMLElement;
      expect(host.style.getPropertyValue('--clippy-z-index')).toBe('9999');
    });

    it('should create agent, balloon, and chat slot elements', () => {
      expect(renderer.agentSlot).toBeDefined();
      expect(renderer.agentSlot.className).toBe('clippy-agent');
      expect(renderer.balloonSlot).toBeDefined();
      expect(renderer.balloonSlot.className).toBe('clippy-balloon');
      expect(renderer.chatSlot).toBeDefined();
      expect(renderer.chatSlot.className).toBe('clippy-chat');
    });

    it('should hide balloon and chat by default', () => {
      expect(renderer.balloonSlot.hidden).toBe(true);
      expect(renderer.chatSlot.hidden).toBe(true);
    });
  });

  describe('mount', () => {
    it('should append host to document.body', () => {
      renderer.mount();
      const host = document.querySelector('[data-clippy-host]');
      expect(host).not.toBeNull();
      expect(document.body.contains(host)).toBe(true);
    });
  });

  describe('unmount', () => {
    it('should remove host from document.body', () => {
      renderer.mount();
      expect(document.querySelector('[data-clippy-host]')).not.toBeNull();

      renderer.unmount();
      expect(document.querySelector('[data-clippy-host]')).toBeNull();
    });

    it('should not throw if called without mounting first', () => {
      expect(() => renderer.unmount()).not.toThrow();
    });

    it('should not throw if called multiple times', () => {
      renderer.mount();
      renderer.unmount();
      expect(() => renderer.unmount()).not.toThrow();
    });
  });

  describe('showBalloon', () => {
    it('should set text content on balloon slot', () => {
      renderer.showBalloon('Hello from Clippy!');
      expect(renderer.balloonSlot.textContent).toBe('Hello from Clippy!');
    });

    it('should make balloon visible', () => {
      renderer.showBalloon('Test message');
      expect(renderer.balloonSlot.hidden).toBe(false);
    });

    it('should update text when called again', () => {
      renderer.showBalloon('First message');
      renderer.showBalloon('Second message');
      expect(renderer.balloonSlot.textContent).toBe('Second message');
    });
  });

  describe('hideBalloon', () => {
    it('should hide the balloon', () => {
      renderer.showBalloon('Visible');
      expect(renderer.balloonSlot.hidden).toBe(false);

      renderer.hideBalloon();
      expect(renderer.balloonSlot.hidden).toBe(true);
    });
  });

  describe('showChat', () => {
    it('should make chat panel visible', () => {
      renderer.showChat();
      expect(renderer.chatSlot.hidden).toBe(false);
    });
  });

  describe('hideChat', () => {
    it('should hide the chat panel', () => {
      renderer.showChat();
      renderer.hideChat();
      expect(renderer.chatSlot.hidden).toBe(true);
    });
  });

  describe('position options', () => {
    it('should support bottom-left position', () => {
      const r = new ShadowRenderer({
        position: 'bottom-left',
        theme: 'dark',
        zIndex: 1000,
      });
      r.mount();
      const host = document.querySelector('[data-clippy-host]');
      expect(host?.getAttribute('data-position')).toBe('bottom-left');
      r.unmount();
    });

    it('should support top-right position', () => {
      const r = new ShadowRenderer({
        position: 'top-right',
        theme: 'light',
        zIndex: 5000,
      });
      r.mount();
      const host = document.querySelector('[data-clippy-host]');
      expect(host?.getAttribute('data-position')).toBe('top-right');
      r.unmount();
    });
  });
});
