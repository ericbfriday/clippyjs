import type {
  InteractiveElement,
  InteractiveType,
  ElementState,
  BoundingBox,
} from '@clippyjs/types';

/**
 * Selectors for all interactive elements to detect on the page.
 */
const INTERACTIVE_SELECTORS = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])',
  '[onclick]',
  'summary',
].join(', ');

/** Maximum number of interactive elements to track */
const MAX_ELEMENTS = 200;

/** Debounce delay for mutation observer callbacks (ms) */
const DEBOUNCE_MS = 300;

/**
 * Detects and categorizes interactive elements on the page.
 *
 * Scans the DOM for buttons, links, inputs, and other interactive elements,
 * returning structured {@link InteractiveElement} objects with type, state,
 * label, and position metadata.
 *
 * @example
 * ```ts
 * const detector = new InteractionDetector();
 * const elements = detector.detectAll();
 * const buttons = detector.getByType('button');
 * const cleanup = detector.watchForChanges(updated => console.log(updated));
 * // later:
 * cleanup();
 * detector.destroy();
 * ```
 */
export class InteractionDetector {
  private elements: Map<string, InteractiveElement>;
  private observer: MutationObserver | null = null;

  constructor() {
    this.elements = new Map();
  }

  /**
   * Detect all interactive elements currently in the DOM.
   *
   * Queries for buttons, links, inputs, selects, textareas, ARIA-role
   * elements, elements with tabindex, onclick handlers, and summary elements.
   * Results are deduplicated by generated selector/id and capped at 200.
   *
   * @returns Array of detected {@link InteractiveElement} objects
   */
  detectAll(): InteractiveElement[] {
    this.elements.clear();

    const nodes = document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTORS);
    let count = 0;

    for (const node of nodes) {
      if (count >= MAX_ELEMENTS) break;

      const processed = this.processElement(node);

      // Deduplicate by id (which is derived from el.id / data-testid / generated)
      if (!this.elements.has(processed.id)) {
        this.elements.set(processed.id, processed);
        count++;
      }
    }

    return Array.from(this.elements.values());
  }

  /**
   * Filter previously detected elements by their {@link InteractiveType}.
   *
   * Call {@link detectAll} first to populate the element map.
   *
   * @param type - The interactive type to filter by (e.g. `'button'`, `'link'`)
   * @returns Array of elements matching the given type
   */
  getByType(type: InteractiveType): InteractiveElement[] {
    return Array.from(this.elements.values()).filter((el) => el.type === type);
  }

  /**
   * Find an element whose inferred action text matches the given string.
   *
   * Performs a case-insensitive partial match against the `action` field of
   * each detected element.
   *
   * @param action - Text to search for in element action strings
   * @returns The first matching element, or `undefined`
   */
  getByAction(action: string): InteractiveElement | undefined {
    const needle = action.toLowerCase();
    return Array.from(this.elements.values()).find((el) =>
      el.action.toLowerCase().includes(needle),
    );
  }

  /**
   * Watch for DOM mutations and re-detect interactive elements on changes.
   *
   * Sets up a {@link MutationObserver} on `document.body` that listens for
   * `childList` and `subtree` changes. Re-detection is debounced by 300ms.
   *
   * @param callback - Invoked with the updated element list after each re-detection
   * @returns A cleanup function that disconnects the observer
   */
  watchForChanges(
    callback: (elements: InteractiveElement[]) => void,
  ): () => void {
    // Disconnect any existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    this.observer = new MutationObserver(() => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        const elements = this.detectAll();
        callback(elements);
        debounceTimer = null;
      }, DEBOUNCE_MS);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    };
  }

  /**
   * Disconnect the mutation observer and clear all tracked elements.
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.elements.clear();
  }

  /** Build an {@link InteractiveElement} descriptor from a raw DOM element. */
  private processElement(el: HTMLElement): InteractiveElement {
    return {
      id: el.id || el.getAttribute('data-testid') || this.generateId(el),
      type: this.detectType(el),
      selector: this.buildSelector(el),
      label: this.extractLabel(el),
      description: this.extractDescription(el),
      action: this.inferAction(el),
      state: this.getCurrentState(el),
      position: this.getBoundingBox(el),
    };
  }

  /**
   * Map a DOM element to its {@link InteractiveType}.
   */
  private detectType(el: HTMLElement): InteractiveType {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');

    // Role-based detection first (higher specificity than tag)
    if (role === 'button' || tag === 'button') return 'button';
    if (role === 'menuitem') return 'menuitem';
    if (role === 'tab') return 'tab';
    if (role === 'link') return 'link';

    if (tag === 'a') return 'link';
    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'summary') return 'accordion';

    if (tag === 'input') {
      const inputType = (el as HTMLInputElement).type?.toLowerCase() || 'text';
      switch (inputType) {
        case 'email':
          return 'input-email';
        case 'password':
          return 'input-password';
        case 'number':
          return 'input-number';
        case 'checkbox':
          return 'input-checkbox';
        case 'radio':
          return 'input-radio';
        case 'file':
          return 'input-file';
        case 'text':
        case 'search':
        case 'tel':
        case 'url':
        default:
          return 'input-text';
      }
    }

    return 'unknown';
  }

  /**
   * Determine the current UI state of an element.
   */
  private getCurrentState(el: HTMLElement): ElementState {
    const inputEl = el as HTMLInputElement;
    return {
      visible: el.offsetWidth > 0 || el.offsetHeight > 0,
      enabled: !inputEl.disabled,
      focused: document.activeElement === el,
      hovered: false, // Cannot track without pointer events
      expanded: el.getAttribute('aria-expanded') === 'true',
      checked: inputEl.checked ?? undefined,
    };
  }

  /**
   * Get the element's bounding box relative to the viewport.
   */
  private getBoundingBox(el: HTMLElement): BoundingBox {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Generate a deterministic ID for an element that lacks `id` and `data-testid`.
   *
   * Uses the tag name plus the element's index among same-tag siblings in the
   * document to produce a stable, unique identifier.
   */
  private generateId(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const allOfType = document.querySelectorAll(tag);
    let idx = 0;
    for (let i = 0; i < allOfType.length; i++) {
      if (allOfType[i] === el) {
        idx = i;
        break;
      }
    }
    return `${tag}-${idx}`;
  }

  /**
   * Build a CSS selector string for an element.
   *
   * Uses the element's `id` when available; otherwise falls back to
   * tagName + class names.
   */
  private buildSelector(el: HTMLElement): string {
    if (el.id) {
      return `#${el.id}`;
    }

    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList).join('.');
    return classes ? `${tag}.${classes}` : tag;
  }

  /**
   * Extract a human-readable label for an element.
   *
   * Priority: aria-label → title → innerText (truncated to 50 chars) → value.
   */
  private extractLabel(el: HTMLElement): string {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const title = el.getAttribute('title');
    if (title) return title;

    const text = el.innerText?.trim();
    if (text) return text.length > 50 ? text.slice(0, 50) + '…' : text;

    const value = (el as HTMLInputElement).value;
    if (value) return value;

    return '';
  }

  /**
   * Extract a description for an element.
   *
   * Looks at `aria-describedby` referenced elements, then falls back to `title`.
   */
  private extractDescription(el: HTMLElement): string {
    const describedById = el.getAttribute('aria-describedby');
    if (describedById) {
      const descEl = document.getElementById(describedById);
      if (descEl) {
        const text = descEl.textContent?.trim();
        if (text) return text;
      }
    }

    return el.getAttribute('title') || '';
  }

  /**
   * Infer the primary action text for an element.
   *
   * Links → href, buttons → visible text, inputs → type + name.
   */
  private inferAction(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();

    if (tag === 'a') {
      return (el as HTMLAnchorElement).href || '';
    }

    if (tag === 'button' || el.getAttribute('role') === 'button') {
      return el.innerText?.trim() || '';
    }

    if (tag === 'input') {
      const inputEl = el as HTMLInputElement;
      const parts: string[] = [];
      if (inputEl.type) parts.push(inputEl.type);
      if (inputEl.name) parts.push(inputEl.name);
      return parts.join(':');
    }

    return el.innerText?.trim() || '';
  }
}
