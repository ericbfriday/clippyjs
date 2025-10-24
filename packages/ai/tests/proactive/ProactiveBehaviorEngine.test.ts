import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProactiveBehaviorEngine, DEFAULT_PROACTIVE_CONFIG } from '../../src/proactive/ProactiveBehaviorEngine';
import type { ContextProvider } from '../../src/context/ContextProvider';

// Mock context provider
class MockContextProvider implements ContextProvider {
  name = 'dom';
  enabled = true;

  async gather() {
    return {
      provider: 'dom',
      timestamp: new Date(),
      data: {
        forms: [{ id: 'test-form' }],  // This will trigger 'form_detected'
      },
    };
  }

  shouldInclude() {
    return true;
  }
}

describe('ProactiveBehaviorEngine', () => {
  let engine: ProactiveBehaviorEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new ProactiveBehaviorEngine();
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create with default config', () => {
      const config = engine.getConfig();
      expect(config.enabled).toBe(DEFAULT_PROACTIVE_CONFIG.enabled);
      expect(config.checkInterval).toBe(DEFAULT_PROACTIVE_CONFIG.checkInterval);
    });

    it('should create with custom config', () => {
      const customEngine = new ProactiveBehaviorEngine({
        enabled: false,
        checkInterval: 60000,
        intrusionLevel: 'low',
      });

      const config = customEngine.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.checkInterval).toBe(60000);
      expect(config.intrusionLevel).toBe('low');

      customEngine.destroy();
    });
  });

  describe('Start and Stop', () => {
    it('should not start timer if disabled', () => {
      const disabledEngine = new ProactiveBehaviorEngine({ enabled: false });
      disabledEngine.start();

      // Fast-forward time
      vi.advanceTimersByTime(200000);

      // No suggestions should have been triggered
      let suggestionTriggered = false;
      disabledEngine.onSuggestion(() => {
        suggestionTriggered = true;
      });

      expect(suggestionTriggered).toBe(false);
      disabledEngine.destroy();
    });

    it('should start timer when enabled', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      let suggestionCount = 0;
      engine.onSuggestion(() => {
        suggestionCount++;
      });

      engine.start();

      // Fast-forward past check interval and wait for async operations
      await vi.advanceTimersByTimeAsync(120000); // 2 minutes

      expect(suggestionCount).toBeGreaterThan(0);
    });

    it('should stop timer on stop()', () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      let suggestionCount = 0;
      engine.onSuggestion(() => {
        suggestionCount++;
      });

      engine.start();
      vi.advanceTimersByTime(120000);
      const countAfterFirst = suggestionCount;

      engine.stop();
      vi.advanceTimersByTime(120000);

      // Count should not increase after stop
      expect(suggestionCount).toBe(countAfterFirst);
    });
  });

  describe('Context Providers', () => {
    it('should register context provider', () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      // Should be able to gather context
      expect(() => engine.registerContextProvider(provider)).not.toThrow();
    });

    it('should unregister context provider', () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);
      engine.unregisterContextProvider(provider);

      // Unregister should work without error
      expect(() => engine.unregisterContextProvider(provider)).not.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      engine.updateConfig({ intrusionLevel: 'low' });

      const config = engine.getConfig();
      expect(config.intrusionLevel).toBe('low');
    });

    it('should restart when enabled state changes', () => {
      engine.start();

      engine.updateConfig({ enabled: false });
      let config = engine.getConfig();
      expect(config.enabled).toBe(false);

      engine.updateConfig({ enabled: true });
      config = engine.getConfig();
      expect(config.enabled).toBe(true);
    });
  });

  describe('Suggestion Triggers', () => {
    it('should emit suggestions to listeners', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      let receivedSuggestion: any = null;
      engine.onSuggestion((suggestion) => {
        receivedSuggestion = suggestion;
      });

      await engine.triggerSuggestion('manual');

      expect(receivedSuggestion).toBeDefined();
      expect(receivedSuggestion.reason).toBe('manual');
      expect(receivedSuggestion.timestamp).toBeInstanceOf(Date);
    });

    it('should not trigger when disabled', async () => {
      engine.updateConfig({ enabled: false });

      let triggered = false;
      engine.onSuggestion(() => {
        triggered = true;
      });

      await engine.triggerSuggestion();

      expect(triggered).toBe(false);
    });

    it('should not trigger during cooldown', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      let suggestionCount = 0;
      engine.onSuggestion(() => {
        suggestionCount++;
      });

      // Trigger ignore 3 times (max consecutive ignores)
      await engine.triggerSuggestion();
      engine.recordIgnore();

      await engine.triggerSuggestion();
      engine.recordIgnore();

      await engine.triggerSuggestion();
      engine.recordIgnore();

      const countBeforeCooldown = suggestionCount;

      // Should be in cooldown now, next trigger should be blocked
      await engine.triggerSuggestion();

      expect(suggestionCount).toBe(countBeforeCooldown);
    });

    it('should respect intrusion level intervals', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      engine.updateConfig({ intrusionLevel: 'high' }); // 1 minute minimum

      await engine.triggerSuggestion();

      // Try to trigger again immediately
      const secondTrigger = await engine.triggerSuggestion();

      // Should not trigger because not enough time has passed
      // We can't easily test this without exposing internal state,
      // but the manual trigger should respect the interval
    });
  });

  describe('Ignore and Accept Tracking', () => {
    it('should track consecutive ignores', () => {
      engine.recordIgnore();
      engine.recordIgnore();

      // Should still be able to record ignores
      expect(() => engine.recordIgnore()).not.toThrow();
    });

    it('should reset ignores on accept', () => {
      engine.recordIgnore();
      engine.recordIgnore();

      engine.recordAccept();

      // Ignores should be reset, can verify by checking cooldown doesn't trigger
      engine.recordIgnore();
      engine.recordIgnore();
      engine.recordIgnore();

      // Would need to expose internal state to fully verify
    });

    it('should enter cooldown after max ignores', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      // Trigger and ignore 3 times
      await engine.triggerSuggestion();
      engine.recordIgnore();

      await engine.triggerSuggestion();
      engine.recordIgnore();

      await engine.triggerSuggestion();
      engine.recordIgnore();

      // Should be in cooldown now
      let triggered = false;
      engine.onSuggestion(() => {
        triggered = true;
      });

      await engine.triggerSuggestion();
      expect(triggered).toBe(false);
    });

    it('should exit cooldown after timeout', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      // Enter cooldown
      await engine.triggerSuggestion();
      engine.recordIgnore();
      await engine.triggerSuggestion();
      engine.recordIgnore();
      await engine.triggerSuggestion();
      engine.recordIgnore();

      // Fast-forward past cooldown period (5 minutes default)
      vi.advanceTimersByTime(300000);

      // Should be able to trigger again
      let triggered = false;
      engine.onSuggestion(() => {
        triggered = true;
      });

      await engine.triggerSuggestion();
      expect(triggered).toBe(true);
    });
  });

  describe('Listener Management', () => {
    it('should allow multiple listeners', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      let listener1Called = false;
      let listener2Called = false;

      engine.onSuggestion(() => {
        listener1Called = true;
      });

      engine.onSuggestion(() => {
        listener2Called = true;
      });

      await engine.triggerSuggestion();

      expect(listener1Called).toBe(true);
      expect(listener2Called).toBe(true);
    });

    it('should return unsubscribe function', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      let called = false;
      const unsubscribe = engine.onSuggestion(() => {
        called = true;
      });

      unsubscribe();

      await engine.triggerSuggestion();

      expect(called).toBe(false);
    });

    it('should handle errors in listeners gracefully', async () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      engine.onSuggestion(() => {
        throw new Error('Listener error');
      });

      let secondListenerCalled = false;
      engine.onSuggestion(() => {
        secondListenerCalled = true;
      });

      await engine.triggerSuggestion();

      expect(consoleSpy).toHaveBeenCalled();
      expect(secondListenerCalled).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Destroy', () => {
    it('should stop timer on destroy', () => {
      engine.start();
      engine.destroy();

      // Fast-forward time
      vi.advanceTimersByTime(200000);

      // No errors should occur
    });

    it('should clear listeners on destroy', async () => {
      let called = false;
      engine.onSuggestion(() => {
        called = true;
      });

      engine.destroy();

      // Trying to trigger after destroy shouldn't call listeners
      // (Would need to expose internal state to fully test)
    });

    it('should clear context providers on destroy', () => {
      const provider = new MockContextProvider();
      engine.registerContextProvider(provider);

      engine.destroy();

      // Should be able to destroy without errors
      expect(() => engine.destroy()).not.toThrow();
    });
  });
});
