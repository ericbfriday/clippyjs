import type { ContextProvider, ContextData, ContextTrigger } from './ContextProvider';

/**
 * Current URL information
 */
export interface CurrentUrlInfo {
  url: string;
  pathname: string;
  search: string;
  hash: string;
  params: Record<string, string>;
}

/**
 * Navigation context data structure
 */
export interface NavigationContextInfo {
  current: CurrentUrlInfo;
  history: string[];
  referrer: string;
  historyLength: number;
}

/**
 * Navigation Context Provider
 *
 * Tracks navigation state including current URL, route parameters,
 * navigation history (last 5 pages), and referrer information.
 * This helps AI understand user's navigation path and context.
 */
export class NavigationContextProvider implements ContextProvider {
  name = 'navigation';
  enabled = true;

  private history: string[] = [];
  private readonly MAX_HISTORY = 5;
  private readonly listeners: Array<() => void> = [];

  constructor() {
    this.initializeHistory();
    this.setupNavigationTracking();
  }

  async gather(): Promise<ContextData> {
    return {
      provider: 'navigation',
      timestamp: new Date(),
      data: {
        current: this.getCurrentUrlInfo(),
        history: this.getRecentHistory(),
        referrer: document.referrer || '',
        historyLength: typeof window.history?.length === 'number' ? window.history.length : 0,
      } as NavigationContextInfo,
    };
  }

  shouldInclude(trigger: ContextTrigger): boolean {
    // Include navigation context for both triggers
    return true;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.listeners.forEach((remove) => remove());
    this.listeners.length = 0;
    this.history = [];
  }

  /**
   * Initialize history with current URL
   */
  private initializeHistory(): void {
    if (typeof window !== 'undefined' && window.location) {
      this.history.push(window.location.href);
    }
  }

  /**
   * Set up navigation tracking
   */
  private setupNavigationTracking(): void {
    if (typeof window === 'undefined') return;

    // Track popstate events (browser back/forward)
    const popstateHandler = () => {
      this.recordNavigation(window.location.href);
    };
    window.addEventListener('popstate', popstateHandler);
    this.listeners.push(() => window.removeEventListener('popstate', popstateHandler));

    // Track pushState and replaceState (for SPA navigation)
    this.interceptHistoryMethod('pushState');
    this.interceptHistoryMethod('replaceState');

    // Track hashchange events
    const hashchangeHandler = () => {
      this.recordNavigation(window.location.href);
    };
    window.addEventListener('hashchange', hashchangeHandler);
    this.listeners.push(() => window.removeEventListener('hashchange', hashchangeHandler));
  }

  /**
   * Intercept History API methods to track SPA navigation
   */
  private interceptHistoryMethod(method: 'pushState' | 'replaceState'): void {
    if (typeof window === 'undefined' || !window.history) return;

    const original = window.history[method];
    if (typeof original !== 'function') return;

    const provider = this;

    // @ts-ignore - Overriding built-in method
    window.history[method] = function (...args: any[]) {
      const result = original.apply(this, args);

      // Record navigation after state change
      setTimeout(() => {
        provider.recordNavigation(window.location.href);
      }, 0);

      return result;
    };

    // Store cleanup function
    this.listeners.push(() => {
      // @ts-ignore
      window.history[method] = original;
    });
  }

  /**
   * Record a navigation event
   */
  private recordNavigation(url: string): void {
    // Don't record duplicates of the last URL
    if (this.history.length > 0 && this.history[this.history.length - 1] === url) {
      return;
    }

    this.history.push(url);

    // Keep only last N URLs
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }

  /**
   * Get current URL information
   */
  private getCurrentUrlInfo(): CurrentUrlInfo {
    try {
      const url = new URL(window.location.href);

      // Extract query parameters
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return {
        url: url.href,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        params,
      };
    } catch (error) {
      // Fallback if URL parsing fails
      return {
        url: window.location.href,
        pathname: window.location.pathname || '',
        search: window.location.search || '',
        hash: window.location.hash || '',
        params: {},
      };
    }
  }

  /**
   * Get recent navigation history
   */
  private getRecentHistory(): string[] {
    // Return copy to prevent external modifications
    return [...this.history];
  }
}
