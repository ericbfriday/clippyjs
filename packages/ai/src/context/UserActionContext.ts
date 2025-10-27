import type { ContextProvider, ContextData, ContextTrigger } from './ContextProvider';

/**
 * User action record
 */
export interface UserAction {
  type: string;
  target: string;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * User action context data
 */
export interface UserActionContextInfo {
  recentActions: UserAction[];
  scrollPosition: number;
  focusedElement?: string;
  activeElement?: {
    tag: string;
    id?: string;
    class?: string;
  };
}

/**
 * User Action Context Provider
 *
 * Tracks user interactions with the page including clicks, inputs,
 * scrolls, and focus changes. Maintains a history of recent actions.
 */
export class UserActionContextProvider implements ContextProvider {
  name = 'user-actions';
  enabled = true;

  private actions: UserAction[] = [];
  private maxActions = 20;
  private listeners: Array<() => void> = [];

  constructor() {
    this.setupListeners();
  }

  async gather(): Promise<ContextData> {
    const activeEl = document.activeElement;
    const activeElement = activeEl
      ? {
          tag: activeEl.tagName.toLowerCase(),
          id: activeEl.id || undefined,
          class: activeEl.className || undefined,
        }
      : undefined;

    return {
      provider: 'user-actions',
      timestamp: new Date(),
      data: {
        recentActions: this.actions.slice(-10), // Last 10 actions
        scrollPosition: window.scrollY,
        focusedElement: document.activeElement?.tagName.toLowerCase(),
        activeElement,
      } as UserActionContextInfo,
    };
  }

  shouldInclude(trigger: ContextTrigger): boolean {
    // Include for proactive triggers, optional for user prompts
    return trigger === 'proactive';
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.listeners.forEach((remove) => remove());
    this.listeners = [];
    this.actions = [];
  }

  /**
   * Set up event listeners for user actions
   */
  private setupListeners(): void {
    const addListener = (
      event: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      document.addEventListener(event, handler, options);
      this.listeners.push(() => document.removeEventListener(event, handler, options));
    };

    // Click events
    addListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      this.recordAction('click', target.tagName.toLowerCase(), {
        id: target.id,
        text: target.textContent?.slice(0, 50),
      });
    });

    // Input events
    addListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.recordAction('input', target.tagName.toLowerCase(), {
        type: target.type,
        name: target.name,
        value: target.value ? '[has value]' : '[empty]',
      });
    });

    // Scroll events (throttled)
    let scrollTimeout: NodeJS.Timeout;
    addListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.recordAction('scroll', 'window', {
          position: window.scrollY,
          percentage: Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          ),
        });
      }, 250);
    });

    // Focus events
    addListener('focus', (e: Event) => {
      const target = e.target as HTMLElement;
      this.recordAction('focus', target.tagName.toLowerCase(), {
        id: target.id,
        name: (target as HTMLInputElement).name,
      });
    }, true); // Use capture phase
  }

  /**
   * Record a user action
   */
  private recordAction(type: string, target: string, details?: Record<string, any>): void {
    this.actions.push({
      type,
      target,
      timestamp: new Date(),
      details,
    });

    // Trim to max actions
    if (this.actions.length > this.maxActions) {
      this.actions.shift();
    }
  }
}
