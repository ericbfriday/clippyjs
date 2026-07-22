import type { BrowserAssistantConfig } from '@clippyjs/types';
import { ClippyEmbedder } from './core/index.js';

/** Active embedder instance (singleton for CDN usage) */
let activeEmbedder: ClippyEmbedder | null = null;

/**
 * Global ClippyAssistant namespace for CDN/IIFE usage.
 *
 * @example
 * ```html
 * <script src="https://cdn.example.com/clippy.min.js"></script>
 * <script>
 *   ClippyAssistant.init({ apiKey: 'sk-...' });
 * </script>
 * ```
 */
export const ClippyAssistant = {
  /**
   * Initialize the Clippy assistant on the current page.
   * @param config - Configuration for the assistant
   * @returns Promise that resolves with the embedder instance
   */
  async init(config: BrowserAssistantConfig): Promise<ClippyEmbedder> {
    if (activeEmbedder) {
      activeEmbedder.destroy();
    }
    activeEmbedder = new ClippyEmbedder(config);
    await activeEmbedder.init();
    return activeEmbedder;
  },

  /** Destroy the active assistant instance. */
  destroy(): void {
    activeEmbedder?.destroy();
    activeEmbedder = null;
  },

  /** Get the active embedder instance (if initialized). */
  getInstance(): ClippyEmbedder | null {
    return activeEmbedder;
  },
};
