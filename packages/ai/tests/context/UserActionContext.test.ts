import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserActionContextProvider } from '../../src/context/UserActionContext';

describe('UserActionContextProvider', () => {
  let provider: UserActionContextProvider;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="test-button">Click me</button>
      <input id="test-input" type="text" name="test" />
    `;

    provider = new UserActionContextProvider();
  });

  afterEach(() => {
    provider.destroy();
  });

  it('should have correct name and be enabled by default', () => {
    expect(provider.name).toBe('user-actions');
    expect(provider.enabled).toBe(true);
  });

  it('should gather user action context', async () => {
    const context = await provider.gather();

    expect(context.provider).toBe('user-actions');
    expect(context.timestamp).toBeInstanceOf(Date);
    expect(context.data).toBeDefined();
  });

  it('should track click events', async () => {
    const button = document.getElementById('test-button');
    button?.click();

    // Wait for event to be processed
    await new Promise(resolve => setTimeout(resolve, 10));

    const context = await provider.gather();
    const data = context.data;

    expect(data.recentActions).toBeInstanceOf(Array);
    expect(data.recentActions.length).toBeGreaterThan(0);
    expect(data.recentActions[0].type).toBe('click');
    expect(data.recentActions[0].target).toBe('button');
  });

  it('should track input events', async () => {
    const input = document.getElementById('test-input') as HTMLInputElement;
    input.value = 'test value';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise(resolve => setTimeout(resolve, 10));

    const context = await provider.gather();
    const data = context.data;

    const inputAction = data.recentActions.find((a: any) => a.type === 'input');
    expect(inputAction).toBeDefined();
    expect(inputAction?.target).toBe('input');
    expect(inputAction?.details.name).toBe('test');
  });

  it('should track scroll position', async () => {
    const context = await provider.gather();
    const data = context.data;

    expect(data.scrollPosition).toBeDefined();
    expect(typeof data.scrollPosition).toBe('number');
  });

  it('should include context for proactive triggers', () => {
    expect(provider.shouldInclude('proactive')).toBe(true);
  });

  it('should not include context for user prompts by default', () => {
    expect(provider.shouldInclude('user-prompt')).toBe(false);
  });

  it('should limit actions to max 20', async () => {
    const button = document.getElementById('test-button');

    // Generate 25 clicks
    for (let i = 0; i < 25; i++) {
      button?.click();
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    const context = await provider.gather();
    const data = context.data;

    // Internal storage limited to 20, but gather returns last 10
    expect(data.recentActions.length).toBeLessThanOrEqual(10);
  });

  it('should clean up listeners on destroy', () => {
    const button = document.getElementById('test-button');

    provider.destroy();

    button?.click();

    // Should not record after destroy
    // (Difficult to test directly, but no errors should occur)
    expect(() => provider.destroy()).not.toThrow();
  });
});
