import type {
  ContentType,
  PageSection,
  PageEntity,
  SemanticContent,
} from '@clippyjs/types';

/**
 * Common English stop words to exclude from topic extraction.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
  'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so',
  'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
  'about', 'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'also',
  'if', 'into', 'get', 'got', 'make', 'made', 'go', 'going',
  'new', 'old', 'like', 'back', 'use', 'way', 'even', 'well',
]);

/** Minimum word length to consider for topic extraction */
const MIN_WORD_LENGTH = 3;

/** Maximum number of sections to return */
const MAX_SECTIONS = 20;

/** Maximum number of entities to return */
const MAX_ENTITIES = 20;

/** Maximum content length for section text */
const MAX_SECTION_CONTENT_LENGTH = 500;

/** Maximum description length */
const MAX_DESCRIPTION_LENGTH = 300;

/** Default entity confidence score */
const DEFAULT_ENTITY_CONFIDENCE = 0.8;

/**
 * Extracts semantic meaning from page content.
 *
 * Analyzes DOM structure, metadata, schema.org markup, and textual content
 * to produce structured semantic information about the current page.
 *
 * @example
 * ```typescript
 * const extractor = new SemanticExtractor();
 * const content = await extractor.extract();
 * console.log(content.contentType); // 'article'
 * console.log(content.title);       // 'My Blog Post'
 * ```
 */
export class SemanticExtractor {
  /**
   * Performs full semantic analysis of the current page.
   * @returns Semantic content including title, description, topics, content type, sections, and entities
   */
  async extract(): Promise<SemanticContent> {
    return {
      title: this.extractTitle(),
      description: this.extractDescription(),
      mainTopics: await this.extractTopics(),
      contentType: await this.classifyContentType(),
      sections: this.extractSections(),
      entities: this.extractEntities(),
    };
  }

  /**
   * Extracts the page title using multiple fallback strategies.
   *
   * Priority order:
   * 1. `document.title`
   * 2. First `<h1>` element text
   * 3. Open Graph `og:title` meta tag
   * 4. First heading element of any level
   *
   * @returns Cleaned page title string, or empty string if none found
   */
  extractTitle(): string {
    const docTitle = document.title?.trim();
    if (docTitle) return docTitle;

    const h1 = document.querySelector('h1');
    if (h1?.textContent?.trim()) return h1.textContent.trim();

    const ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    );
    if (ogTitle?.content?.trim()) return ogTitle.content.trim();

    const heading = document.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading?.textContent?.trim()) return heading.textContent.trim();

    return '';
  }

  /**
   * Extracts the page description using multiple fallback strategies.
   *
   * Priority order:
   * 1. `<meta name="description">` content
   * 2. Open Graph `og:description` meta tag
   * 3. First `<p>` element with more than 50 characters
   *
   * @returns Description string truncated to 300 characters, or empty string
   */
  extractDescription(): string {
    const metaDesc = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (metaDesc?.content?.trim()) {
      return metaDesc.content.trim().slice(0, MAX_DESCRIPTION_LENGTH);
    }

    const ogDesc = document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]',
    );
    if (ogDesc?.content?.trim()) {
      return ogDesc.content.trim().slice(0, MAX_DESCRIPTION_LENGTH);
    }

    const paragraphs = document.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent?.trim() ?? '';
      if (text.length > 50) {
        return text.slice(0, MAX_DESCRIPTION_LENGTH);
      }
    }

    return '';
  }

  /**
   * Extracts main topics from the page using keywords, headings,
   * and word frequency analysis.
   *
   * Sources (by weight):
   * - Meta keywords tag (weight: 5)
   * - Heading text from h1-h3 (weight: 3)
   * - Body content significant words (weight: 1)
   *
   * @returns Array of 5-10 topic strings sorted by relevance
   */
  async extractTopics(): Promise<string[]> {
    const topicCandidates = new Map<string, number>();

    // Meta keywords — highest weight
    const metaKeywords = document.querySelector<HTMLMetaElement>(
      'meta[name="keywords"]',
    );
    if (metaKeywords?.content) {
      const keywords = metaKeywords.content
        .split(',')
        .map((k) => k.trim().toLowerCase());
      for (const keyword of keywords) {
        if (keyword.length >= MIN_WORD_LENGTH) {
          topicCandidates.set(
            keyword,
            (topicCandidates.get(keyword) ?? 0) + 5,
          );
        }
      }
    }

    // Heading text — medium weight
    const headings = document.querySelectorAll('h1, h2, h3');
    for (const heading of headings) {
      const words = this.extractSignificantWords(heading.textContent ?? '');
      for (const word of words) {
        topicCandidates.set(word, (topicCandidates.get(word) ?? 0) + 3);
      }
    }

    // Body content significant words — low weight
    const mainContent =
      document.querySelector('[role="main"]') ??
      document.querySelector('main') ??
      document.querySelector('article') ??
      document.body;
    if (mainContent?.textContent) {
      const words = this.extractSignificantWords(mainContent.textContent);
      for (const word of words) {
        topicCandidates.set(word, (topicCandidates.get(word) ?? 0) + 1);
      }
    }

    // Sort by frequency descending and return top 5-10
    const sorted = [...topicCandidates.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);

    return sorted.slice(0, 10);
  }

  /**
   * Classifies the page content type using DOM heuristics.
   *
   * Checks (in priority order):
   * 1. Schema.org Product markup → `'product'`
   * 2. Schema.org Article markup OR `<article>` with >300 words → `'article'`
   * 3. Checkout URL or payment form fields → `'checkout'`
   * 4. 3+ `<form>` elements → `'form'`
   * 5. 3+ `.product` or `[data-product]` elements → `'product-listing'`
   * 6. `<article>` with >300 words → `'article'`
   * 7. URL contains `/search` or `[role="search"]` with result list → `'search-results'`
   * 8. `<nav>` with 3+ links and low word count → `'navigation'`
   * 9. `[role="main"] form` or `main form` → `'form'`
   * 10. `<main>` with multiple `<section>` → `'dashboard'`
   * 11. `<h1>` + long prose (>500 words) → `'documentation'`
   * 12. Default: `'unknown'`
   *
   * @returns The detected ContentType
   */
  async classifyContentType(): Promise<ContentType> {
    // 1. Schema.org Product
    if (this.hasProductSchema()) return 'product';

    // 2. Schema.org Article OR <article> with >300 words
    if (this.hasArticleSchema()) return 'article';

    // 3. Checkout flow
    if (this.hasCheckoutFlow()) return 'checkout';

    // 4. Has 3+ form elements
    if (this.hasFormElements()) return 'form';

    // 5. Has 3+ product listing elements
    const productElements = document.querySelectorAll(
      '.product, [data-product]',
    );
    if (productElements.length >= 3) return 'product-listing';

    // 6. <article> with >300 words (redundant with step 2 but per spec)
    const article = document.querySelector('article');
    if (article) {
      const wordCount = (article.textContent ?? '').trim().split(/\s+/).length;
      if (wordCount > 300) return 'article';
    }

    // 7. Search results
    const url = window.location.href.toLowerCase();
    if (url.includes('/search')) return 'search-results';
    const searchRole = document.querySelector('[role="search"]');
    if (searchRole) {
      const resultItems = document.querySelectorAll(
        '[role="search"] ~ * li, [role="search"] ~ ul li, [role="search"] ~ ol li',
      );
      if (resultItems.length > 0) return 'search-results';
    }

    // 8. Navigation page
    const nav = document.querySelector('nav');
    if (nav) {
      const navLinks = nav.querySelectorAll('a');
      const bodyWordCount = (document.body.textContent ?? '')
        .trim()
        .split(/\s+/).length;
      if (navLinks.length >= 3 && bodyWordCount < 200) return 'navigation';
    }

    // 9. Form in main area
    const mainForm = document.querySelector(
      '[role="main"] form, main form',
    );
    if (mainForm) return 'form';

    // 10. Dashboard: <main> with multiple <section>
    const mainEl = document.querySelector('main');
    if (mainEl) {
      const sections = mainEl.querySelectorAll('section');
      if (sections.length > 1) return 'dashboard';
    }

    // 11. Documentation: h1 + long prose
    const h1 = document.querySelector('h1');
    if (h1) {
      const bodyText = document.body.textContent ?? '';
      const wordCount = bodyText.trim().split(/\s+/).length;
      if (wordCount > 500) return 'documentation';
    }

    return 'unknown';
  }

  /**
   * Extracts semantic sections from the page DOM.
   *
   * Queries landmark elements (`[role="main"]`, `<main>`, `<article>`,
   * `<section>`, `<header>`, `<nav>`, `<aside>`, `<footer>`) and converts
   * them to structured PageSection objects.
   *
   * Deduplicates nested elements (skips children if parent already processed)
   * and returns a maximum of 20 sections.
   *
   * @returns Array of PageSection objects
   */
  extractSections(): PageSection[] {
    const selectorList = [
      '[role="main"]',
      'main',
      'article',
      'section',
      'header',
      'nav',
      'aside',
      'footer',
    ];

    const elements = document.querySelectorAll(selectorList.join(', '));
    const sections: PageSection[] = [];
    const processedElements = new Set<Element>();

    let index = 0;
    for (const el of elements) {
      // Deduplicate: skip if this element is nested inside an already-processed element
      let isNested = false;
      for (const processed of processedElements) {
        if (processed.contains(el) && processed !== el) {
          isNested = true;
          break;
        }
      }
      if (isNested) continue;

      const section = this.processSection(el, index);
      if (section) {
        sections.push(section);
        processedElements.add(el);
        index++;
      }

      if (sections.length >= MAX_SECTIONS) break;
    }

    return sections;
  }

  /**
   * Extracts named entities from page content using regex heuristics.
   *
   * Entity types detected:
   * - **Prices**: `$123`, `$1,234.56` patterns
   * - **Dates**: `Jan 1, 2024`, `Feb 14 2024` patterns
   * - **Products**: Schema.org `itemprop="name"` within Product scope, or H1 on product pages
   * - **Organizations**: Schema.org `itemprop="name"` within Organization scope
   *
   * @returns Array of PageEntity objects (max 20), each with confidence 0.8
   */
  extractEntities(): PageEntity[] {
    const entities: PageEntity[] = [];
    const bodyText = document.body?.textContent ?? '';
    const seenTexts = new Set<string>();

    // Price extraction: $123, $1,234.56, etc.
    const priceRegex = /\$[\d,]+\.?\d*/g;
    let priceMatch: RegExpExecArray | null;
    while ((priceMatch = priceRegex.exec(bodyText)) !== null) {
      const text = priceMatch[0];
      if (!seenTexts.has(text)) {
        seenTexts.add(text);
        entities.push({
          text,
          type: 'price',
          confidence: DEFAULT_ENTITY_CONFIDENCE,
        });
      }
      if (entities.length >= MAX_ENTITIES) return entities;
    }

    // Date extraction: "Jan 1, 2024", "Feb 14 2024", etc.
    const dateRegex =
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/g;
    let dateMatch: RegExpExecArray | null;
    while ((dateMatch = dateRegex.exec(bodyText)) !== null) {
      const text = dateMatch[0];
      if (!seenTexts.has(text)) {
        seenTexts.add(text);
        entities.push({
          text,
          type: 'date',
          confidence: DEFAULT_ENTITY_CONFIDENCE,
        });
      }
      if (entities.length >= MAX_ENTITIES) return entities;
    }

    // Products from schema.org itemprop="name" within Product scope
    const productNameEls = document.querySelectorAll(
      '[itemscope][itemtype*="schema.org/Product"] [itemprop="name"]',
    );
    for (const el of productNameEls) {
      const text = el.textContent?.trim() ?? '';
      if (text && !seenTexts.has(text)) {
        seenTexts.add(text);
        entities.push({
          text,
          type: 'product',
          confidence: DEFAULT_ENTITY_CONFIDENCE,
        });
      }
      if (entities.length >= MAX_ENTITIES) return entities;
    }

    // If on a product page (has product schema), use H1 as product name
    if (this.hasProductSchema() && productNameEls.length === 0) {
      const h1 = document.querySelector('h1');
      const text = h1?.textContent?.trim() ?? '';
      if (text && !seenTexts.has(text)) {
        seenTexts.add(text);
        entities.push({
          text,
          type: 'product',
          confidence: DEFAULT_ENTITY_CONFIDENCE,
        });
      }
    }

    // Organizations from schema.org itemprop="name" within Organization scope
    const orgNameEls = document.querySelectorAll(
      '[itemscope][itemtype*="schema.org/Organization"] [itemprop="name"]',
    );
    for (const el of orgNameEls) {
      const text = el.textContent?.trim() ?? '';
      if (text && !seenTexts.has(text)) {
        seenTexts.add(text);
        entities.push({
          text,
          type: 'organization',
          confidence: DEFAULT_ENTITY_CONFIDENCE,
        });
      }
      if (entities.length >= MAX_ENTITIES) return entities;
    }

    return entities;
  }

  // ── Private Helpers ──────────────────────────────────────────────

  /**
   * Checks for Schema.org Product markup on the page.
   */
  private hasProductSchema(): boolean {
    return (
      document.querySelector(
        '[itemscope][itemtype*="schema.org/Product"]',
      ) !== null
    );
  }

  /**
   * Checks for Schema.org Article markup or an `<article>` element
   * with substantial content (>300 words).
   */
  private hasArticleSchema(): boolean {
    if (
      document.querySelector(
        '[itemscope][itemtype*="schema.org/Article"]',
      ) !== null
    ) {
      return true;
    }
    const article = document.querySelector('article');
    if (article) {
      const wordCount = (article.textContent ?? '').trim().split(/\s+/).length;
      return wordCount > 300;
    }
    return false;
  }

  /**
   * Checks for checkout flow indicators: `/checkout` URL path
   * or payment-related form fields.
   */
  private hasCheckoutFlow(): boolean {
    const url = window.location.href.toLowerCase();
    if (url.includes('/checkout')) return true;

    const paymentFields = document.querySelectorAll(
      'input[name*="card"], input[name*="payment"], input[name*="credit"], ' +
        'input[name*="cvv"], input[name*="cvc"], input[name*="expir"], ' +
        'input[autocomplete*="cc-"], [data-payment], [data-stripe]',
    );
    return paymentFields.length > 0;
  }

  /**
   * Checks if the page has 3 or more `<form>` elements.
   */
  private hasFormElements(): boolean {
    return document.querySelectorAll('form').length >= 3;
  }

  /**
   * Generates a stable identifier from a prefix and numeric index.
   * @param prefix - Element tag name or semantic prefix
   * @param index - Numeric index for uniqueness
   * @returns Formatted ID string like `"section-0"`
   */
  private generateId(prefix: string, index: number): string {
    return `${prefix}-${index}`;
  }

  /**
   * Processes a DOM element into a PageSection.
   * @param el - The DOM element to process
   * @param index - Index for ID generation
   * @returns PageSection object or null if the element has no meaningful content
   */
  private processSection(el: Element, index: number): PageSection | null {
    const textContent = el.textContent?.trim() ?? '';
    if (!textContent) return null;

    const tagName = el.tagName.toLowerCase();
    const role = el.getAttribute('role');

    const id = el.id || this.generateId(tagName, index);

    const headingEl = el.querySelector('h1, h2, h3, h4, h5, h6');
    const title = headingEl?.textContent?.trim() ?? tagName;

    const content = textContent.slice(0, MAX_SECTION_CONTENT_LENGTH);

    const type = this.mapSectionType(tagName, role);
    const importance = this.calculateImportance(tagName, role);

    let visible = true;
    try {
      const rect = el.getBoundingClientRect();
      visible = rect.height > 0;
    } catch {
      visible = true;
    }

    return { id, title, content, type, importance, visible };
  }

  /**
   * Maps a tag name and optional ARIA role to a PageSection type.
   */
  private mapSectionType(
    tagName: string,
    role: string | null,
  ): PageSection['type'] {
    if (role === 'main' || tagName === 'main' || tagName === 'article') {
      return 'main';
    }
    if (role === 'banner' || tagName === 'header') return 'header';
    if (role === 'contentinfo' || tagName === 'footer') return 'footer';
    if (role === 'complementary' || tagName === 'aside') return 'sidebar';
    return 'custom';
  }

  /**
   * Calculates the importance score (0-1) for a section
   * based on its semantic tag name and ARIA role.
   */
  private calculateImportance(
    tagName: string,
    role: string | null,
  ): number {
    if (role === 'main' || tagName === 'main' || tagName === 'article') {
      return 1.0;
    }
    if (role === 'banner' || tagName === 'header') return 0.8;
    if (tagName === 'section') return 0.5;
    if (tagName === 'nav') return 0.4;
    if (
      role === 'complementary' ||
      tagName === 'aside' ||
      role === 'contentinfo' ||
      tagName === 'footer'
    ) {
      return 0.3;
    }
    return 0.5;
  }

  /**
   * Extracts significant (non-stop-word) words from a text string.
   * Filters out short words and common English stop words.
   */
  private extractSignificantWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (word) => word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word),
      );
  }
}
