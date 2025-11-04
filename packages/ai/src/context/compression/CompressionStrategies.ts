import type { ContextData } from '../ContextProvider';
import type { CompressionStrategy } from '../ContextCompressor';

/**
 * Strategy 1: Remove Redundancy
 *
 * Removes duplicate, null, undefined, and empty values to reduce size
 * without losing any meaningful information.
 *
 * Removes:
 * - null and undefined values
 * - Empty strings, arrays, and objects
 * - Duplicate consecutive values in arrays
 * - Redundant whitespace in strings
 *
 * Preserves:
 * - All non-empty meaningful data
 * - Data structure and types
 * - Essential boolean false and number 0 values
 */
export class RemoveRedundancyStrategy implements CompressionStrategy {
  readonly name = 'remove-redundancy';

  apply(context: ContextData): ContextData {
    return {
      ...context,
      data: this.cleanObject(context.data),
    };
  }

  /**
   * Recursively clean object of redundant data
   */
  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (typeof obj !== 'object') {
      // Primitive values - trim strings only
      if (typeof obj === 'string') {
        return obj.trim();
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return this.cleanArray(obj);
    }

    // Clean object properties
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = this.cleanObject(value);

      // Skip undefined, null, empty strings, empty arrays, empty objects
      if (cleanedValue === undefined || cleanedValue === null) {
        continue;
      }

      if (cleanedValue === '') {
        continue;
      }

      if (Array.isArray(cleanedValue) && cleanedValue.length === 0) {
        continue;
      }

      if (
        typeof cleanedValue === 'object' &&
        !Array.isArray(cleanedValue) &&
        Object.keys(cleanedValue).length === 0
      ) {
        continue;
      }

      cleaned[key] = cleanedValue;
    }

    return cleaned;
  }

  /**
   * Clean array by removing duplicates and empty values
   */
  private cleanArray(arr: any[]): any[] {
    const cleaned: any[] = [];
    let lastValue: any = Symbol('unique'); // Unique symbol for comparison

    for (const item of arr) {
      const cleanedItem = this.cleanObject(item);

      // Skip empty values
      if (
        cleanedItem === undefined ||
        cleanedItem === null ||
        cleanedItem === '' ||
        (Array.isArray(cleanedItem) && cleanedItem.length === 0)
      ) {
        continue;
      }

      // Remove consecutive duplicates (but keep non-consecutive duplicates)
      const itemStr = JSON.stringify(cleanedItem);
      const lastStr = lastValue === Symbol('unique') ? '' : JSON.stringify(lastValue);

      if (itemStr === lastStr) {
        continue; // Skip duplicate
      }

      cleaned.push(cleanedItem);
      lastValue = cleanedItem;
    }

    return cleaned;
  }
}

/**
 * Strategy 2: Summarize Verbose Fields
 *
 * Truncates long text fields and large arrays to summaries while
 * preserving essential information like errors and validation.
 *
 * Summarizes:
 * - Long text fields (>200 chars) → first 100 chars + "... [N more]"
 * - Large arrays (>10 items) → first 5 items + "... [N more]"
 * - Large objects (>10 keys) → sample of most important keys
 *
 * Preserves fully:
 * - Error messages and validation info (essential)
 * - Short strings (<200 chars)
 * - Small arrays (<10 items)
 * - Type information and structure
 */
export class SummarizeVerboseStrategy implements CompressionStrategy {
  readonly name = 'summarize-verbose';

  private readonly MAX_STRING_LENGTH = 200;
  private readonly SUMMARY_STRING_LENGTH = 100;
  private readonly MAX_ARRAY_LENGTH = 10;
  private readonly SUMMARY_ARRAY_LENGTH = 5;
  private readonly MAX_OBJECT_KEYS = 10;

  apply(context: ContextData): ContextData {
    return {
      ...context,
      data: this.summarizeObject(context.data, context.provider),
    };
  }

  /**
   * Recursively summarize verbose data
   */
  private summarizeObject(obj: any, provider: string, path: string = ''): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.summarizeString(obj, path);
    }

    if (Array.isArray(obj)) {
      return this.summarizeArray(obj, provider, path);
    }

    if (typeof obj === 'object') {
      return this.summarizeObjectKeys(obj, provider, path);
    }

    return obj;
  }

  /**
   * Summarize long strings
   */
  private summarizeString(str: string, path: string): string {
    // Don't summarize essential fields (errors, validation messages)
    if (this.isEssentialField(path)) {
      return str;
    }

    if (str.length <= this.MAX_STRING_LENGTH) {
      return str;
    }

    const remaining = str.length - this.SUMMARY_STRING_LENGTH;
    return `${str.substring(0, this.SUMMARY_STRING_LENGTH)}... [${remaining} more chars]`;
  }

  /**
   * Summarize large arrays
   */
  private summarizeArray(arr: any[], provider: string, path: string): any[] {
    // Don't summarize essential arrays
    if (this.isEssentialField(path)) {
      return arr.map((item, i) => this.summarizeObject(item, provider, `${path}[${i}]`));
    }

    if (arr.length <= this.MAX_ARRAY_LENGTH) {
      return arr.map((item, i) => this.summarizeObject(item, provider, `${path}[${i}]`));
    }

    // Keep first N items + summary
    const summarized = arr
      .slice(0, this.SUMMARY_ARRAY_LENGTH)
      .map((item, i) => this.summarizeObject(item, provider, `${path}[${i}]`));

    const remaining = arr.length - this.SUMMARY_ARRAY_LENGTH;
    summarized.push(`... [${remaining} more items]`);

    return summarized;
  }

  /**
   * Summarize objects with many keys
   */
  private summarizeObjectKeys(obj: Record<string, any>, provider: string, path: string): any {
    const keys = Object.keys(obj);

    if (keys.length <= this.MAX_OBJECT_KEYS) {
      // Small object - summarize values recursively
      const result: Record<string, any> = {};
      for (const key of keys) {
        const newPath = path ? `${path}.${key}` : key;
        result[key] = this.summarizeObject(obj[key], provider, newPath);
      }
      return result;
    }

    // Large object - keep most important keys
    const importantKeys = this.selectImportantKeys(keys, provider);
    const result: Record<string, any> = {};

    for (const key of importantKeys) {
      const newPath = path ? `${path}.${key}` : key;
      result[key] = this.summarizeObject(obj[key], provider, newPath);
    }

    const remaining = keys.length - importantKeys.length;
    if (remaining > 0) {
      result['_summary'] = `... [${remaining} more keys omitted]`;
    }

    return result;
  }

  /**
   * Check if field path is essential and should not be summarized
   */
  private isEssentialField(path: string): boolean {
    const essentialPatterns = [
      'error',
      'errors',
      'validation',
      'message',
      'focused',
      'current',
      'vitals',
    ];

    return essentialPatterns.some((pattern) => path.toLowerCase().includes(pattern));
  }

  /**
   * Select most important keys from large object
   */
  private selectImportantKeys(keys: string[], provider: string): string[] {
    // Priority order: essential fields first, then alphabetical
    const importantPatterns = ['error', 'validation', 'current', 'value', 'id', 'name', 'type'];

    const prioritized = keys.sort((a, b) => {
      const aScore = importantPatterns.findIndex((p) => a.toLowerCase().includes(p));
      const bScore = importantPatterns.findIndex((p) => b.toLowerCase().includes(p));

      if (aScore !== -1 && bScore !== -1) {
        return aScore - bScore;
      }
      if (aScore !== -1) return -1;
      if (bScore !== -1) return 1;

      return a.localeCompare(b);
    });

    return prioritized.slice(0, this.MAX_OBJECT_KEYS);
  }
}

/**
 * Strategy 3: Keep Only Essential Data
 *
 * Last resort strategy that keeps only the most critical information
 * needed for useful AI assistance. Removes all non-essential data.
 *
 * Keeps:
 * - Form: errors, focused field, validation state
 * - Viewport: current dimensions, scroll percentage only
 * - Performance: Core Web Vitals only
 * - Navigation: current URL only
 * - DOM: element count, interactive element types only
 *
 * Removes:
 * - All historical data
 * - Detailed field values
 * - Metadata and timestamps (except main timestamp)
 * - Redundant structural information
 */
export class KeepEssentialStrategy implements CompressionStrategy {
  readonly name = 'keep-essential';

  apply(context: ContextData): ContextData {
    const essential = this.extractEssential(context);

    return {
      provider: context.provider,
      timestamp: context.timestamp,
      data: essential,
    };
  }

  /**
   * Extract only essential data by provider type
   */
  private extractEssential(context: ContextData): Record<string, any> {
    const { provider, data } = context;

    switch (provider) {
      case 'form':
        return this.extractFormEssentials(data);

      case 'viewport':
        return this.extractViewportEssentials(data);

      case 'performance':
        return this.extractPerformanceEssentials(data);

      case 'navigation':
        return this.extractNavigationEssentials(data);

      case 'dom':
        return this.extractDOMEssentials(data);

      case 'user-action':
        return this.extractUserActionEssentials(data);

      default:
        // Unknown provider - keep minimal structure
        return { summary: 'essential data only' };
    }
  }

  /**
   * Extract essential form data
   */
  private extractFormEssentials(data: any): Record<string, any> {
    return {
      errors: data.errors || data.validation?.errors || [],
      focused: data.focused || data.focusedField || null,
      valid: data.valid ?? data.validation?.valid ?? true,
      completion: data.completion || 0,
    };
  }

  /**
   * Extract essential viewport data
   */
  private extractViewportEssentials(data: any): Record<string, any> {
    return {
      width: data.viewport?.width || data.width || 0,
      height: data.viewport?.height || data.height || 0,
      orientation: data.viewport?.orientation || data.orientation || 'landscape',
      scrollPercent: data.scroll?.percentY || data.scrollPercent || 0,
    };
  }

  /**
   * Extract essential performance data
   */
  private extractPerformanceEssentials(data: any): Record<string, any> {
    return {
      fcp: data.paint?.fcp || data.fcp || null,
      lcp: data.paint?.lcp || data.lcp || null,
      cls: data.vitals?.cls || data.cls || null,
      fid: data.vitals?.fid || data.fid || null,
    };
  }

  /**
   * Extract essential navigation data
   */
  private extractNavigationEssentials(data: any): Record<string, any> {
    return {
      url: data.current?.url || data.url || window.location.href,
      pathname: data.current?.pathname || data.pathname || window.location.pathname,
    };
  }

  /**
   * Extract essential DOM data
   */
  private extractDOMEssentials(data: any): Record<string, any> {
    return {
      elementCount: data.elementCount || 0,
      interactiveElements: data.interactiveElements?.length || data.interactive?.length || 0,
    };
  }

  /**
   * Extract essential user action data
   */
  private extractUserActionEssentials(data: any): Record<string, any> {
    return {
      action: data.action || data.type || 'unknown',
      target: data.target?.tagName || data.targetTag || null,
    };
  }
}

/**
 * Default compression strategies in order of preference
 */
export const DEFAULT_COMPRESSION_STRATEGIES: CompressionStrategy[] = [
  new RemoveRedundancyStrategy(),
  new SummarizeVerboseStrategy(),
  new KeepEssentialStrategy(),
];
