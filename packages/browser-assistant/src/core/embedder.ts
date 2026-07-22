import type { BrowserAssistantConfig } from '@clippyjs/types';
import { PageContextProvider } from '@clippyjs/context-providers';
import { UserBehaviorProvider } from '@clippyjs/context-providers';
import { ShadowRenderer } from '../shadow/index.js';

/** Default configuration values for the embedder */
const DEFAULTS = {
  position: 'bottom-right' as const,
  theme: 'auto' as const,
  zIndex: 9999,
  proactive: {
    enabled: true,
    intrusionLevel: 'low' as const,
    checkInterval: 30_000,
  },
};

/** Merged config type with defaults applied */
type ResolvedConfig = Required<
  Pick<BrowserAssistantConfig, 'position' | 'theme' | 'zIndex'>
> &
  BrowserAssistantConfig;

/**
 * Orchestrates the full lifecycle of the Clippy browser assistant.
 *
 * Handles initialization, context provider setup, proactive behavior,
 * and cleanup. Use {@link ClippyEmbedder.init} to create and start
 * an instance, and {@link ClippyEmbedder.destroy} to clean up.
 *
 * @example
 * ```typescript
 * const embedder = new ClippyEmbedder({ apiKey: 'sk-...' });
 * await embedder.init();
 * // Later:
 * embedder.destroy();
 * ```
 */
export class ClippyEmbedder {
  private config: ResolvedConfig;
  private renderer: ShadowRenderer | null = null;
  private pageContextProvider: PageContextProvider | null = null;
  private userBehaviorProvider: UserBehaviorProvider | null = null;
  private proactiveTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor(config: BrowserAssistantConfig) {
    this.config = {
      ...DEFAULTS,
      ...config,
      proactive: { ...DEFAULTS.proactive, ...config.proactive },
    };
  }

  /**
   * Initialize the assistant: create shadow DOM, set up context providers,
   * and start proactive behavior if enabled.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.validateConfig();

      this.renderer = new ShadowRenderer({
        position: this.config.position,
        theme: this.config.theme,
        zIndex: this.config.zIndex,
      });
      this.renderer.mount();

      this.pageContextProvider = new PageContextProvider();
      this.userBehaviorProvider = new UserBehaviorProvider();

      if (this.config.proactive?.enabled) {
        this.startProactiveBehavior();
      }

      this.initialized = true;
      this.config.onReady?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Gather current context from all providers.
   * @returns Combined context data from page and user behavior providers
   */
  async gatherContext(): Promise<{ page: unknown; behavior: unknown }> {
    const [page, behavior] = await Promise.all([
      this.pageContextProvider?.gather() ?? Promise.resolve(null),
      this.userBehaviorProvider?.gather() ?? Promise.resolve(null),
    ]);
    return { page: page?.data ?? null, behavior: behavior?.data ?? null };
  }

  /**
   * Show a message in the assistant balloon.
   * @param message - The message to display
   */
  showMessage(message: string): void {
    this.renderer?.showBalloon(message);
  }

  /** Hide the assistant balloon. */
  hideMessage(): void {
    this.renderer?.hideBalloon();
  }

  /** Destroy the assistant: remove from DOM, stop timers, clean up providers. */
  destroy(): void {
    if (this.proactiveTimer) {
      clearInterval(this.proactiveTimer);
      this.proactiveTimer = null;
    }
    this.userBehaviorProvider?.destroy();
    this.renderer?.unmount();
    this.renderer = null;
    this.pageContextProvider = null;
    this.userBehaviorProvider = null;
    this.initialized = false;
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('[ClippyEmbedder] apiKey is required');
    }
  }

  private startProactiveBehavior(): void {
    const interval =
      this.config.proactive?.checkInterval ?? DEFAULTS.proactive.checkInterval;
    this.proactiveTimer = setInterval(async () => {
      try {
        const context = await this.gatherContext();
        void context;
      } catch {
        // Silently ignore proactive errors to avoid disrupting the user
      }
    }, interval);
  }
}
