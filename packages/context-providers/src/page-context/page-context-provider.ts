import type { ContextProvider, ContextData, ContextTrigger } from '@clippyjs/ai';
import type {
  PageContext,
  ViewportInfo,
  HeadingItem,
  LandmarkRole,
  InteractiveElement,
} from '@clippyjs/types';
import { SemanticExtractor } from '@clippyjs/browser-parser';
import { InteractionDetector } from '@clippyjs/browser-parser';
import { FormAnalyzer } from '@clippyjs/browser-parser';

/**
 * Provides rich page context by combining semantic extraction,
 * interaction detection, and form analysis.
 *
 * Implements the {@link ContextProvider} interface from `@clippyjs/ai`
 * and gathers comprehensive {@link PageContext} data including:
 * - Semantic content (title, description, topics, content type)
 * - Interactive elements (buttons, links)
 * - Form analysis
 * - Viewport and scroll state
 * - Heading structure and ARIA landmarks
 *
 * @example
 * ```typescript
 * const provider = new PageContextProvider();
 * const context = await provider.gather();
 * console.log(context.data); // PageContext
 * ```
 */
export class PageContextProvider implements ContextProvider {
  /** Unique identifier for this context provider */
  readonly name = 'page-context';

  /** Whether this provider is currently active */
  enabled = true;

  private semanticExtractor: SemanticExtractor;
  private interactionDetector: InteractionDetector;
  private formAnalyzer: FormAnalyzer;

  constructor() {
    this.semanticExtractor = new SemanticExtractor();
    this.interactionDetector = new InteractionDetector();
    this.formAnalyzer = new FormAnalyzer();
  }

  /**
   * Gather comprehensive page context data.
   *
   * Combines semantic extraction, interaction detection, form analysis,
   * viewport info, heading structure, and ARIA landmarks into a unified
   * {@link PageContext} object.
   *
   * @returns Context data containing full page analysis
   */
  async gather(): Promise<ContextData> {
    const semantic = await this.semanticExtractor.extract();
    const allElements = this.interactionDetector.detectAll();
    const buttons = this.interactionDetector.getByType('button');
    const links = this.interactionDetector.getByType('link');
    const forms = this.formAnalyzer.analyzeAllForms();
    const viewport = this.getViewportInfo();
    const headingStructure = this.getHeadings();
    const landmarkRoles = this.getLandmarks();

    const scrollHeight = document.body.scrollHeight - window.innerHeight;
    const scrollDepth = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    const focusedElement = this.getFocusedElement(allElements);

    const bodyText = document.body?.textContent ?? '';
    const wordCount = bodyText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    const pageContext: PageContext = {
      url: window.location.href,
      title: semantic.title,
      description: semantic.description,
      contentType: semantic.contentType,
      mainTopics: semantic.mainTopics,
      readingLevel: this.estimateReadingLevel(bodyText),
      wordCount,
      sections: semantic.sections,
      buttons,
      links,
      forms,
      scrollPosition: window.scrollY,
      scrollDepth,
      focusedElement,
      viewport,
      headingStructure,
      landmarkRoles,
    };

    return {
      provider: this.name,
      timestamp: new Date(),
      data: pageContext as unknown as ContextData['data'],
    };
  }

  /**
   * Page context is always relevant regardless of trigger type.
   * @param _trigger - The trigger type (unused — always returns true)
   * @returns Always true
   */
  shouldInclude(_trigger: ContextTrigger): boolean {
    return true;
  }

  /**
   * Collect current viewport dimensions, scroll position, and device pixel ratio.
   */
  private getViewportInfo(): ViewportInfo {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      devicePixelRatio: window.devicePixelRatio ?? 1,
    };
  }

  /**
   * Extract heading structure from the DOM for accessibility analysis.
   */
  private getHeadings(): HeadingItem[] {
    const headings: HeadingItem[] = [];
    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    elements.forEach((el) => {
      const level = parseInt(el.tagName[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
      headings.push({
        level,
        text: el.textContent?.trim() ?? '',
        id: el.id || undefined,
      });
    });
    return headings;
  }

  /**
   * Detect ARIA landmark regions in the DOM.
   */
  private getLandmarks(): LandmarkRole[] {
    const landmarks: LandmarkRole[] = [];
    const landmarkSelectors = [
      { selector: 'main, [role="main"]', role: 'main' },
      { selector: 'nav, [role="navigation"]', role: 'navigation' },
      { selector: 'header, [role="banner"]', role: 'banner' },
      { selector: 'footer, [role="contentinfo"]', role: 'contentinfo' },
      { selector: 'aside, [role="complementary"]', role: 'complementary' },
      { selector: '[role="search"]', role: 'search' },
      { selector: 'form[aria-label], [role="form"]', role: 'form' },
    ];

    for (const { selector, role } of landmarkSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        landmarks.push({
          role,
          label:
            el.getAttribute('aria-label') ??
            el.getAttribute('aria-labelledby') ??
            undefined,
          element: el.tagName.toLowerCase(),
        });
      }
    }

    return landmarks;
  }

  /**
   * Find the currently focused element among detected interactive elements.
   * @param elements - All detected interactive elements
   * @returns The focused element or null if none is focused
   */
  private getFocusedElement(
    elements: InteractiveElement[],
  ): InteractiveElement | null {
    const active = document.activeElement;
    if (!active || active === document.body) return null;

    const activeId = active.id;
    if (activeId) {
      const found = elements.find((el) => el.id === activeId);
      if (found) return found;
    }

    return null;
  }

  /**
   * Estimate reading level based on average sentence and word length.
   * Uses a simplified Flesch-Kincaid grade level formula.
   * @param text - Raw page text content
   * @returns Reading level category string
   */
  private estimateReadingLevel(text: string): string {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (words.length === 0) return 'unknown';

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = Math.max(sentences.length, 1);
    const avgWordsPerSentence = words.length / sentenceCount;
    const avgSyllables =
      words.reduce((sum, w) => sum + this.countSyllables(w), 0) / words.length;

    const gradeLevel =
      0.39 * avgWordsPerSentence + 11.8 * avgSyllables - 15.59;

    if (gradeLevel <= 6) return 'basic';
    if (gradeLevel <= 10) return 'intermediate';
    if (gradeLevel <= 14) return 'advanced';
    return 'expert';
  }

  /**
   * Simple syllable counter for English words.
   * @param word - A single word to count syllables for
   * @returns Estimated syllable count (minimum 1)
   */
  private countSyllables(word: string): number {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length <= 3) return 1;
    const vowelGroups = lower.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;
    if (lower.endsWith('e') && count > 1) count--;
    return Math.max(count, 1);
  }
}
