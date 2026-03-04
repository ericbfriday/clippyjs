import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserBehaviorProvider } from '../../src/user-behavior/user-behavior-provider.js';

describe('UserBehaviorProvider', () => {
  let provider: UserBehaviorProvider;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root">Content</div>';
    provider = new UserBehaviorProvider();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('name', () => {
    it('should have name "user-behavior"', () => {
      expect(provider.name).toBe('user-behavior');
    });
  });

  describe('enabled', () => {
    it('should be enabled by default', () => {
      expect(provider.enabled).toBe(true);
    });
  });

  describe('gather', () => {
    it('should return ContextData with correct provider name', async () => {
      const result = await provider.gather();
      expect(result.provider).toBe('user-behavior');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.data).toBeDefined();
    });

    it('should include session duration', async () => {
      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(typeof data.sessionDuration).toBe('number');
      expect(data.sessionDuration as number).toBeGreaterThanOrEqual(0);
    });

    it('should include click count', async () => {
      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(typeof data.clickCount).toBe('number');
    });

    it('should include scroll count', async () => {
      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(typeof data.scrollCount).toBe('number');
    });

    it('should include time on page', async () => {
      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(typeof data.timeOnPage).toBe('number');
    });

    it('should include idle events array', async () => {
      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.idleEvents).toBeInstanceOf(Array);
    });

    it('should include rage clicks count', async () => {
      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(typeof data.rageClicks).toBe('number');
      expect(data.rageClicks).toBe(0);
    });

    it('should include frustration signal as null initially', async () => {
      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.frustrationSignal).toBeNull();
    });
  });

  describe('click tracking', () => {
    it('should increment click count on document click', async () => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.clickCount).toBe(2);
    });
  });

  describe('rage click detection', () => {
    it('should detect rage clicks from rapid clicking', async () => {
      vi.useFakeTimers();

      const target = document.getElementById('root')!;
      for (let i = 0; i < 4; i++) {
        target.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
      }

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.rageClicks as number).toBeGreaterThanOrEqual(1);
      expect(data.frustrationSignal).not.toBeNull();

      vi.useRealTimers();
    });
  });

  describe('shouldInclude', () => {
    it('should return true for proactive trigger', () => {
      expect(provider.shouldInclude('proactive')).toBe(true);
    });

    it('should return false for user-prompt when no frustration or idle', () => {
      expect(provider.shouldInclude('user-prompt')).toBe(false);
    });

    it('should return true for user-prompt when frustration signal exists', async () => {
      vi.useFakeTimers();

      const target = document.getElementById('root')!;
      for (let i = 0; i < 4; i++) {
        target.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
      }

      expect(provider.shouldInclude('user-prompt')).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('form interaction tracking', () => {
    it('should track form interactions via focusin', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="test-input" />
        </form>
      `;

      const input = document.getElementById('test-input')!;
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.formInteractions as number).toBe(1);
    });

    it('should not count focusin outside forms', async () => {
      document.body.innerHTML = '<input type="text" id="no-form-input" />';
      const input = document.getElementById('no-form-input')!;
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.formInteractions).toBe(0);
    });
  });

  describe('error tracking', () => {
    it('should track error encounters', async () => {
      window.dispatchEvent(new ErrorEvent('error', { message: 'Test error' }));

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.errorEncounters as number).toBe(1);
    });
  });

  describe('backtracking detection', () => {
    it('should track popstate as backtracking', async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.backtracking as number).toBe(1);
    });
  });

  describe('destroy', () => {
    it('should stop tracking events after destroy', async () => {
      provider.destroy();

      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.clickCount).toBe(0);
    });
  });
});
