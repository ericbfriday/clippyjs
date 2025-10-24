import type { ContextProvider, ContextData, ContextTrigger } from './ContextProvider';

/**
 * DOM context data structure
 */
export interface DOMContextInfo {
  url: string;
  title: string;
  headings: string[];
  forms: Array<{ id?: string; fields: string[] }>;
  visibleText: string;
  meta: Record<string, string>;
}

/**
 * DOM Context Provider
 *
 * Extracts information about the current page including URL, title,
 * headings, forms, visible text, and meta tags.
 */
export class DOMContextProvider implements ContextProvider {
  name = 'dom';
  enabled = true;

  async gather(): Promise<ContextData> {
    return {
      provider: 'dom',
      timestamp: new Date(),
      data: {
        url: window.location.href,
        title: document.title,
        headings: this.extractHeadings(),
        forms: this.detectForms(),
        visibleText: this.getVisibleText(),
        meta: this.extractMetaTags(),
      } as DOMContextInfo,
    };
  }

  shouldInclude(trigger: ContextTrigger): boolean {
    // Always include DOM context
    return true;
  }

  /**
   * Extract h1, h2, h3 headings from the page
   */
  private extractHeadings(): string[] {
    return Array.from(document.querySelectorAll('h1, h2, h3'))
      .map((h) => h.textContent?.trim())
      .filter(Boolean) as string[];
  }

  /**
   * Detect forms and their fields
   */
  private detectForms(): Array<{ id?: string; fields: string[] }> {
    return Array.from(document.querySelectorAll('form')).map((form) => ({
      id: form.id || undefined,
      fields: Array.from(form.querySelectorAll('input, select, textarea'))
        .map((field) => {
          const input = field as HTMLInputElement;
          return input.name || input.id || input.placeholder;
        })
        .filter(Boolean),
    }));
  }

  /**
   * Get visible text from the page (max 5000 characters)
   */
  private getVisibleText(): string {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Skip hidden elements
          const style = window.getComputedStyle(parent);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip script and style tags
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style') {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textNodes: string[] = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text && text.length > 0) {
        textNodes.push(text);
      }
    }

    // Join and limit to 5000 characters
    return textNodes.join(' ').slice(0, 5000);
  }

  /**
   * Extract meta tags (name and property attributes)
   */
  private extractMetaTags(): Record<string, string> {
    const meta: Record<string, string> = {};

    document.querySelectorAll('meta[name], meta[property]').forEach((tag) => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        meta[name] = content;
      }
    });

    return meta;
  }
}
