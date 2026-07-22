import type { ContextProvider, ContextData, ContextTrigger } from '@clippyjs/ai';
import type {
  UserBehaviorContext,
  IdleEvent,
  FrustrationSignal,
  FrustrationSignalType,
} from '@clippyjs/types';

/** Milliseconds of inactivity before an idle event begins */
const IDLE_THRESHOLD_MS = 5000;

/** Number of clicks within the rage-click window to trigger detection */
const RAGE_CLICK_THRESHOLD = 3;

/** Time window in milliseconds for rage-click detection */
const RAGE_CLICK_WINDOW_MS = 500;

/** Minimum interval between duplicate frustration signals of the same type (ms) */
const DEDUP_INTERVAL_MS = 10_000;

/**
 * Tracks user behavior patterns to detect frustration, idle states,
 * and interaction metrics.
 *
 * Implements the {@link ContextProvider} interface from `@clippyjs/ai`
 * and gathers {@link UserBehaviorContext} data including click counts,
 * scroll depth, idle events, rage-click detection, and error tracking.
 *
 * Call {@link destroy} when the provider is no longer needed to clean up
 * event listeners.
 *
 * @example
 * ```typescript
 * const provider = new UserBehaviorProvider();
 * const context = await provider.gather();
 * console.log(context.data); // UserBehaviorContext
 * provider.destroy(); // cleanup
 * ```
 */
export class UserBehaviorProvider implements ContextProvider {
  /** Unique identifier for this context provider */
  readonly name = 'user-behavior';

  /** Whether this provider is currently active */
  enabled = true;

  private sessionStart: Date;
  private pageViewStart: Date;
  private clickCount = 0;
  private scrollCount = 0;
  private formInteractionCount = 0;
  private activeTime = 0;
  private idleEvents: IdleEvent[] = [];
  private rageClicks = 0;
  private backtracking = 0;
  private errorEncounters = 0;
  private frustrationSignal: FrustrationSignal | null = null;
  private lastFrustrationByType = new Map<FrustrationSignalType, number>();

  private recentClicks: Array<{ time: number; element: string }> = [];

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private idleStart: Date | null = null;

  private lastActiveTimestamp: number;

  private boundHandleClick: (e: MouseEvent) => void;
  private boundHandleScroll: () => void;
  private boundHandleActivity: () => void;
  private boundHandlePopState: () => void;
  private boundHandleError: (e: ErrorEvent) => void;
  private boundHandleFocusIn: (e: FocusEvent) => void;

  constructor() {
    const now = new Date();
    this.sessionStart = now;
    this.pageViewStart = now;
    this.lastActiveTimestamp = now.getTime();

    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleScroll = this.handleScroll.bind(this);
    this.boundHandleActivity = this.handleActivity.bind(this);
    this.boundHandlePopState = this.handlePopState.bind(this);
    this.boundHandleError = this.handleError.bind(this);
    this.boundHandleFocusIn = this.handleFocusIn.bind(this);

    document.addEventListener('click', this.boundHandleClick);
    document.addEventListener('scroll', this.boundHandleScroll, {
      passive: true,
    });
    document.addEventListener('keydown', this.boundHandleActivity);
    document.addEventListener('mousemove', this.boundHandleActivity);
    document.addEventListener('focusin', this.boundHandleFocusIn);
    window.addEventListener('popstate', this.boundHandlePopState);
    window.addEventListener('error', this.boundHandleError);

    this.resetIdleTimer();
  }

  /**
   * Gather current user behavior metrics.
   * @returns Context data containing {@link UserBehaviorContext}
   */
  async gather(): Promise<ContextData> {
    const now = new Date();
    this.updateActiveTime();

    const totalTime = now.getTime() - this.pageViewStart.getTime();
    const idleTime = Math.max(totalTime - this.activeTime, 0);

    const context: UserBehaviorContext = {
      sessionDuration: now.getTime() - this.sessionStart.getTime(),
      pagesVisited: 1,
      clickCount: this.clickCount,
      scrollCount: this.scrollCount,
      formInteractions: this.formInteractionCount,
      timeOnPage: now.getTime() - this.pageViewStart.getTime(),
      activeTime: this.activeTime,
      idleTime,
      idleEvents: [...this.idleEvents],
      currentTask: null,
      readingSection: null,
      rageClicks: this.rageClicks,
      backtracking: this.backtracking,
      errorEncounters: this.errorEncounters,
      frustrationSignal: this.frustrationSignal,
    };

    return {
      provider: this.name,
      timestamp: now,
      data: context as unknown as ContextData['data'],
    };
  }

  /**
   * Include behavior data for proactive triggers always; for user-prompt
   * triggers only when frustration or idle signals are present.
   * @param trigger - The context trigger type
   * @returns Whether this provider's data should be included
   */
  shouldInclude(trigger: ContextTrigger): boolean {
    if (trigger === 'proactive') return true;
    return this.frustrationSignal !== null || this.idleEvents.length > 0;
  }

  /**
   * Remove all event listeners and clear timers.
   * Must be called when the provider is no longer needed.
   */
  destroy(): void {
    document.removeEventListener('click', this.boundHandleClick);
    document.removeEventListener('scroll', this.boundHandleScroll);
    document.removeEventListener('keydown', this.boundHandleActivity);
    document.removeEventListener('mousemove', this.boundHandleActivity);
    document.removeEventListener('focusin', this.boundHandleFocusIn);
    window.removeEventListener('popstate', this.boundHandlePopState);
    window.removeEventListener('error', this.boundHandleError);
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }

  private handleClick(e: MouseEvent): void {
    this.clickCount++;
    this.handleActivity();

    const target = e.target;
    if (!(target instanceof Element)) return;
    const selector = this.getElementSelector(target);
    const now = Date.now();

    this.recentClicks.push({ time: now, element: selector });
    this.recentClicks = this.recentClicks.filter(
      (c) => now - c.time < RAGE_CLICK_WINDOW_MS,
    );

    if (this.recentClicks.length >= RAGE_CLICK_THRESHOLD) {
      this.rageClicks++;
      this.setFrustrationSignal({
        type: 'rage-click',
        severity: 'high',
        suggestion: 'User appears frustrated — consider offering help',
        element: selector,
      });
      this.recentClicks = [];
    }
  }

  private handleScroll(): void {
    this.scrollCount++;
    this.handleActivity();
  }

  private handleActivity(): void {
    this.updateActiveTime();
    this.resetIdleTimer();
  }

  private handlePopState(): void {
    this.backtracking++;
    this.setFrustrationSignal({
      type: 'navigation-confusion',
      severity: 'medium',
      suggestion: 'User navigated back — may need guidance',
    });
  }

  private handleError(_e: ErrorEvent): void {
    this.errorEncounters++;
    this.setFrustrationSignal({
      type: 'error-repetition',
      severity: 'medium',
      suggestion: 'An error occurred — user may need assistance',
    });
  }

  private handleFocusIn(e: FocusEvent): void {
    const target = e.target as Element;
    if (!target) return;

    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      const form = target.closest('form');
      if (form) {
        this.formInteractionCount++;
      }
    }
  }

  private updateActiveTime(): void {
    const now = Date.now();
    const elapsed = now - this.lastActiveTimestamp;
    if (elapsed < IDLE_THRESHOLD_MS) {
      this.activeTime += elapsed;
    }
    this.lastActiveTimestamp = now;
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    if (this.idleStart) {
      const duration = Date.now() - this.idleStart.getTime();
      this.idleEvents.push({
        startTime: this.idleStart,
        duration,
        position: { x: 0, y: 0 },
      });
      this.idleStart = null;
    }

    this.idleTimer = setTimeout(() => {
      this.idleStart = new Date();
    }, IDLE_THRESHOLD_MS);
  }

  /**
   * Set a frustration signal, deduplicating by type within {@link DEDUP_INTERVAL_MS}.
   */
  private setFrustrationSignal(signal: FrustrationSignal): void {
    const now = Date.now();
    const lastTime = this.lastFrustrationByType.get(signal.type);

    if (lastTime !== undefined && now - lastTime < DEDUP_INTERVAL_MS) {
      return;
    }

    this.lastFrustrationByType.set(signal.type, now);
    this.frustrationSignal = signal;
  }

  private getElementSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const firstClass = el.className.split(' ')[0];
      if (firstClass) {
        return `${el.tagName.toLowerCase()}.${firstClass}`;
      }
    }
    return el.tagName.toLowerCase();
  }
}
