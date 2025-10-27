import { describe, it, expect, beforeEach } from 'vitest';
import { AppStateContextProvider } from '../../src/context/AppStateContext';

describe('AppStateContextProvider', () => {
  let provider: AppStateContextProvider;
  let mockState: Record<string, any>;

  beforeEach(() => {
    mockState = {
      isAuthenticated: true,
      userRole: 'admin',
      currentRoute: '/dashboard',
    };

    provider = new AppStateContextProvider(() => mockState);
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('app-state');
  });

  it('should be disabled by default', () => {
    expect(provider.enabled).toBe(false);
  });

  it('should gather app state from provided function', async () => {
    const context = await provider.gather();

    expect(context.provider).toBe('app-state');
    expect(context.timestamp).toBeInstanceOf(Date);
    expect(context.data).toEqual(mockState);
  });

  it('should update when state changes', async () => {
    const context1 = await provider.gather();
    expect(context1.data.userRole).toBe('admin');

    // Update mock state
    mockState.userRole = 'user';

    const context2 = await provider.gather();
    expect(context2.data.userRole).toBe('user');
  });

  it('should allow enabling and disabling', () => {
    expect(provider.enabled).toBe(false);

    provider.enable();
    expect(provider.enabled).toBe(true);

    provider.disable();
    expect(provider.enabled).toBe(false);
  });

  it('should always include context when enabled', () => {
    provider.enable();

    expect(provider.shouldInclude('proactive')).toBe(true);
    expect(provider.shouldInclude('user-prompt')).toBe(true);
  });
});
