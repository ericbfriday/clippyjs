import type { AssistantPosition, AssistantTheme } from '@clippyjs/types';

/** CSS for the assistant widget */
const CLIPPY_STYLES = `
  :host {
    all: initial;
    display: block;
    position: fixed;
    z-index: var(--clippy-z-index, 9999);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--clippy-text, #1a1a1a);
  }
  :host([data-position="bottom-right"]) { bottom: 20px; right: 20px; }
  :host([data-position="bottom-left"]) { bottom: 20px; left: 20px; }
  :host([data-position="top-right"]) { top: 20px; right: 20px; }
  :host([data-position="top-left"]) { top: 20px; left: 20px; }
  .clippy-container { position: relative; }
  .clippy-agent { width: 124px; height: 93px; cursor: pointer; }
  .clippy-balloon {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 12px;
    max-width: 280px;
    min-width: 180px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    margin-bottom: 8px;
  }
  .clippy-balloon[hidden] { display: none; }
  .clippy-chat {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 12px;
    width: 300px;
    max-height: 400px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    margin-bottom: 8px;
  }
  .clippy-chat[hidden] { display: none; }
`;

/**
 * Options for creating a {@link ShadowRenderer} instance.
 */
export interface ShadowRendererOptions {
  /** Position of the assistant widget on the viewport */
  position: AssistantPosition;
  /** Color theme for the assistant widget */
  theme: AssistantTheme;
  /** CSS z-index for the shadow host element */
  zIndex: number;
}

/**
 * Manages the Shadow DOM container for the Clippy assistant widget.
 *
 * Creates an isolated rendering environment that prevents host page styles
 * from leaking into the assistant UI and vice versa.
 *
 * @example
 * ```typescript
 * const renderer = new ShadowRenderer({ position: 'bottom-right', theme: 'light', zIndex: 9999 });
 * renderer.mount();
 * const agentSlot = renderer.agentSlot;
 * ```
 */
export class ShadowRenderer {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private container: HTMLElement;

  /** Slot element for the agent sprite */
  readonly agentSlot: HTMLElement;

  /** Slot element for the speech balloon */
  readonly balloonSlot: HTMLElement;

  /** Slot element for the chat panel */
  readonly chatSlot: HTMLElement;

  constructor(options: ShadowRendererOptions) {
    this.host = document.createElement('div');
    this.host.setAttribute('data-clippy-host', '');
    this.host.setAttribute('data-position', options.position);
    this.host.setAttribute('data-theme', options.theme);
    this.host.style.setProperty('--clippy-z-index', String(options.zIndex));

    this.shadow = this.host.attachShadow({ mode: 'open' });

    // adoptedStyleSheets may not be available in all environments (e.g. jsdom)
    const supportsAdoptedStyleSheets =
      'adoptedStyleSheets' in (this.shadow as unknown as Record<string, unknown>);
    if (supportsAdoptedStyleSheets) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CLIPPY_STYLES);
      this.shadow.adoptedStyleSheets = [sheet];
    } else {
      const style = document.createElement('style');
      style.textContent = CLIPPY_STYLES;
      this.shadow.appendChild(style);
    }

    this.container = document.createElement('div');
    this.container.className = 'clippy-container';

    this.agentSlot = document.createElement('div');
    this.agentSlot.className = 'clippy-agent';

    this.balloonSlot = document.createElement('div');
    this.balloonSlot.className = 'clippy-balloon';
    this.balloonSlot.hidden = true;

    this.chatSlot = document.createElement('div');
    this.chatSlot.className = 'clippy-chat';
    this.chatSlot.hidden = true;

    this.container.appendChild(this.balloonSlot);
    this.container.appendChild(this.chatSlot);
    this.container.appendChild(this.agentSlot);
    this.shadow.appendChild(this.container);
  }

  /** Mount the shadow host into the document body. */
  mount(): void {
    document.body.appendChild(this.host);
  }

  /** Remove the shadow host from the document. */
  unmount(): void {
    if (this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
  }

  /**
   * Show a message in the speech balloon.
   * @param message - The text content to display
   */
  showBalloon(message: string): void {
    this.balloonSlot.textContent = message;
    this.balloonSlot.hidden = false;
  }

  /** Hide the speech balloon. */
  hideBalloon(): void {
    this.balloonSlot.hidden = true;
  }

  /** Show the chat panel. */
  showChat(): void {
    this.chatSlot.hidden = false;
  }

  /** Hide the chat panel. */
  hideChat(): void {
    this.chatSlot.hidden = true;
  }
}
