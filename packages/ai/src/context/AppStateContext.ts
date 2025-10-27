import type { ContextProvider, ContextData, ContextTrigger } from './ContextProvider';

/**
 * App State Context Provider
 *
 * Allows developers to provide custom application state to the AI.
 * This is disabled by default and requires explicit opt-in.
 *
 * @example
 * ```typescript
 * const appStateProvider = new AppStateContextProvider(() => ({
 *   isAuthenticated: user !== null,
 *   userRole: user?.role,
 *   currentRoute: router.pathname,
 *   activeFeatures: features.enabled,
 * }));
 * ```
 */
export class AppStateContextProvider implements ContextProvider {
  name = 'app-state';
  enabled = false; // Disabled by default, developers opt-in

  constructor(private getState: () => Record<string, any>) {}

  async gather(): Promise<ContextData> {
    return {
      provider: 'app-state',
      timestamp: new Date(),
      data: this.getState(),
    };
  }

  shouldInclude(trigger: ContextTrigger): boolean {
    // Include for both triggers if enabled
    return true;
  }

  /**
   * Enable this context provider
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable this context provider
   */
  disable(): void {
    this.enabled = false;
  }
}
