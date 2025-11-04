import { describe, it, expect } from 'vitest';
import {
  RemoveRedundancyStrategy,
  SummarizeVerboseStrategy,
  KeepEssentialStrategy,
} from '../../../../src/context/compression/CompressionStrategies';
import type { ContextData } from '../../../../src/context/ContextProvider';

describe('RemoveRedundancyStrategy', () => {
  const strategy = new RemoveRedundancyStrategy();

  it('should have correct name', () => {
    expect(strategy.name).toBe('remove-redundancy');
  });

  describe('Null and Undefined Removal', () => {
    it('should remove null values', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          value: 'keep',
          nullValue: null,
          nested: {
            value: 'keep',
            nullValue: null,
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.value).toBe('keep');
      expect(result.data.nullValue).toBeUndefined();
      expect(result.data.nested.value).toBe('keep');
      expect(result.data.nested.nullValue).toBeUndefined();
    });

    it('should remove undefined values', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          value: 'keep',
          undefinedValue: undefined,
        },
      };

      const result = strategy.apply(context);

      expect(result.data.value).toBe('keep');
      expect(result.data.undefinedValue).toBeUndefined();
    });

    it('should preserve false and 0 values', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          booleanFalse: false,
          numberZero: 0,
          emptyString: '',
        },
      };

      const result = strategy.apply(context);

      expect(result.data.booleanFalse).toBe(false);
      expect(result.data.numberZero).toBe(0);
      // Empty strings are removed as non-essential
      expect(result.data.emptyString).toBeUndefined();
    });
  });

  describe('Empty Value Removal', () => {
    it('should remove empty strings', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          value: 'keep',
          empty: '',
          whitespace: '   ',
        },
      };

      const result = strategy.apply(context);

      expect(result.data.value).toBe('keep');
      expect(result.data.empty).toBeUndefined();
      // Whitespace trimmed to empty, so removed
      expect(result.data.whitespace).toBeUndefined();
    });

    it('should remove empty arrays', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          values: [1, 2, 3],
          empty: [],
        },
      };

      const result = strategy.apply(context);

      expect(result.data.values).toEqual([1, 2, 3]);
      expect(result.data.empty).toBeUndefined();
    });

    it('should remove empty objects', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          nested: { value: 'keep' },
          empty: {},
        },
      };

      const result = strategy.apply(context);

      expect(result.data.nested).toEqual({ value: 'keep' });
      expect(result.data.empty).toBeUndefined();
    });
  });

  describe('Array Deduplication', () => {
    it('should remove consecutive duplicates', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          values: [1, 1, 2, 2, 3, 3],
        },
      };

      const result = strategy.apply(context);

      expect(result.data.values).toEqual([1, 2, 3]);
    });

    it('should keep non-consecutive duplicates', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          values: [1, 2, 1, 2],
        },
      };

      const result = strategy.apply(context);

      expect(result.data.values).toEqual([1, 2, 1, 2]);
    });

    it('should handle object arrays', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          items: [{ id: 1 }, { id: 1 }, { id: 2 }],
        },
      };

      const result = strategy.apply(context);

      expect(result.data.items).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('Whitespace Trimming', () => {
    it('should trim string values', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          value: '  test  ',
          nested: {
            value: '  nested  ',
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.value).toBe('test');
      expect(result.data.nested.value).toBe('nested');
    });
  });

  describe('Edge Cases', () => {
    it('should handle deeply nested structures', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          level1: {
            level2: {
              level3: {
                value: 'keep',
                empty: null,
              },
            },
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.level1.level2.level3.value).toBe('keep');
      expect(result.data.level1.level2.level3.empty).toBeUndefined();
    });

    it('should handle mixed arrays', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          mixed: [1, null, '', undefined, 2, {}, [], 3],
        },
      };

      const result = strategy.apply(context);

      // Empty objects in arrays are kept but removed from properties
      // Numbers should be preserved
      expect(result.data.mixed.filter((x: any) => typeof x === 'number')).toEqual([
        1, 2, 3,
      ]);
      // Should remove null, undefined, empty strings, empty arrays
      expect(result.data.mixed).not.toContain(null);
      expect(result.data.mixed).not.toContain(undefined);
      expect(result.data.mixed).not.toContain('');
      expect(result.data.mixed.some((x: any) => Array.isArray(x) && x.length === 0)).toBe(
        false
      );
    });
  });
});

describe('SummarizeVerboseStrategy', () => {
  const strategy = new SummarizeVerboseStrategy();

  it('should have correct name', () => {
    expect(strategy.name).toBe('summarize-verbose');
  });

  describe('String Summarization', () => {
    it('should summarize long strings', () => {
      const longString = 'a'.repeat(300);
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          longString,
        },
      };

      const result = strategy.apply(context);

      expect(result.data.longString).toContain('...');
      expect(result.data.longString).toContain('more chars');
      expect(result.data.longString.length).toBeLessThan(longString.length);
    });

    it('should not summarize short strings', () => {
      const shortString = 'short string';
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          shortString,
        },
      };

      const result = strategy.apply(context);

      expect(result.data.shortString).toBe(shortString);
    });

    it('should preserve error messages', () => {
      const errorMessage = 'a'.repeat(300);
      const context: ContextData = {
        provider: 'form',
        timestamp: new Date(),
        data: {
          errors: [errorMessage],
        },
      };

      const result = strategy.apply(context);

      // Error messages should not be summarized
      expect(result.data.errors[0]).toBe(errorMessage);
    });

    it('should preserve validation messages', () => {
      const validationMessage = 'a'.repeat(300);
      const context: ContextData = {
        provider: 'form',
        timestamp: new Date(),
        data: {
          validation: {
            message: validationMessage,
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.validation.message).toBe(validationMessage);
    });
  });

  describe('Array Summarization', () => {
    it('should summarize large arrays', () => {
      const largeArray = Array(20)
        .fill(null)
        .map((_, i) => ({ id: i }));

      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          items: largeArray,
        },
      };

      const result = strategy.apply(context);

      expect(result.data.items.length).toBeLessThan(largeArray.length);
      expect(result.data.items[result.data.items.length - 1]).toContain('more items');
    });

    it('should not summarize small arrays', () => {
      const smallArray = [1, 2, 3];
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          items: smallArray,
        },
      };

      const result = strategy.apply(context);

      expect(result.data.items).toEqual(smallArray);
    });

    it('should preserve essential arrays', () => {
      const errorArray = Array(20).fill('error');
      const context: ContextData = {
        provider: 'form',
        timestamp: new Date(),
        data: {
          errors: errorArray,
        },
      };

      const result = strategy.apply(context);

      // Error arrays should not be summarized
      expect(result.data.errors).toEqual(errorArray);
    });
  });

  describe('Object Summarization', () => {
    it('should summarize large objects', () => {
      const largeObject: Record<string, any> = {};
      for (let i = 0; i < 20; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }

      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: largeObject,
      };

      const result = strategy.apply(context);

      const resultKeys = Object.keys(result.data);
      expect(resultKeys.length).toBeLessThan(20);
    });

    it('should prioritize important keys', () => {
      const largeObject: Record<string, any> = {
        error: 'important',
        validation: 'important',
        id: 'important',
      };

      for (let i = 0; i < 20; i++) {
        largeObject[`extra${i}`] = `value${i}`;
      }

      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: largeObject,
      };

      const result = strategy.apply(context);

      // Important keys should be preserved
      expect(result.data.error).toBe('important');
      expect(result.data.validation).toBe('important');
      expect(result.data.id).toBe('important');
    });

    it('should not summarize small objects', () => {
      const smallObject = {
        key1: 'value1',
        key2: 'value2',
      };

      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: smallObject,
      };

      const result = strategy.apply(context);

      expect(result.data).toEqual(smallObject);
    });
  });

  describe('Nested Summarization', () => {
    it('should recursively summarize nested structures', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          nested: {
            longString: 'a'.repeat(300),
            largeArray: Array(20).fill('item'),
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.nested.longString).toContain('...');
      expect(result.data.nested.largeArray.length).toBeLessThan(20);
    });
  });
});

describe('KeepEssentialStrategy', () => {
  const strategy = new KeepEssentialStrategy();

  it('should have correct name', () => {
    expect(strategy.name).toBe('keep-essential');
  });

  describe('Form Context', () => {
    it('should extract essential form data', () => {
      const context: ContextData = {
        provider: 'form',
        timestamp: new Date(),
        data: {
          forms: [
            {
              id: 'test-form',
              fields: [{ name: 'email' }, { name: 'password' }],
              validation: {
                valid: false,
                errors: ['Email is required'],
              },
              focused: 'email',
              completion: 0.5,
            },
          ],
          metadata: {
            created: new Date(),
            modified: new Date(),
          },
          history: [{ action: 'input', field: 'email' }],
        },
      };

      const result = strategy.apply(context);

      expect(result.data.errors).toBeDefined();
      expect(result.data.focused).toBeDefined();
      expect(result.data.valid).toBeDefined();
      expect(result.data.completion).toBeDefined();

      // Non-essential data should be removed
      expect(result.data.metadata).toBeUndefined();
      expect(result.data.history).toBeUndefined();
    });

    it('should extract errors from nested structure', () => {
      const context: ContextData = {
        provider: 'form',
        timestamp: new Date(),
        data: {
          validation: {
            errors: ['Error 1', 'Error 2'],
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.errors).toEqual(['Error 1', 'Error 2']);
    });
  });

  describe('Viewport Context', () => {
    it('should extract essential viewport data', () => {
      const context: ContextData = {
        provider: 'viewport',
        timestamp: new Date(),
        data: {
          viewport: {
            width: 1920,
            height: 1080,
            devicePixelRatio: 2,
            orientation: 'landscape',
          },
          scroll: {
            x: 0,
            y: 500,
            maxX: 0,
            maxY: 2000,
            percentY: 25,
          },
          touch: false,
          metadata: {
            browser: 'Chrome',
            os: 'MacOS',
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.width).toBe(1920);
      expect(result.data.height).toBe(1080);
      expect(result.data.orientation).toBe('landscape');
      expect(result.data.scrollPercent).toBe(25);

      // Non-essential data should be removed
      expect(result.data.devicePixelRatio).toBeUndefined();
      expect(result.data.metadata).toBeUndefined();
    });
  });

  describe('Performance Context', () => {
    it('should extract essential performance data', () => {
      const context: ContextData = {
        provider: 'performance',
        timestamp: new Date(),
        data: {
          paint: {
            fcp: 1200,
            lcp: 2400,
          },
          vitals: {
            cls: 0.1,
            fid: 50,
          },
          navigation: {
            loadTime: 3000,
            domContentLoaded: 2000,
          },
          memory: {
            usedJSHeapSize: 50000000,
            totalJSHeapSize: 100000000,
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.fcp).toBe(1200);
      expect(result.data.lcp).toBe(2400);
      expect(result.data.cls).toBe(0.1);
      expect(result.data.fid).toBe(50);

      // Non-essential data should be removed
      expect(result.data.memory).toBeUndefined();
    });
  });

  describe('Navigation Context', () => {
    it('should extract essential navigation data', () => {
      const context: ContextData = {
        provider: 'navigation',
        timestamp: new Date(),
        data: {
          current: {
            url: 'https://example.com/page',
            pathname: '/page',
            search: '?query=test',
            hash: '#section',
          },
          history: ['/home', '/about', '/page'],
          referrer: 'https://google.com',
        },
      };

      const result = strategy.apply(context);

      expect(result.data.url).toBe('https://example.com/page');
      expect(result.data.pathname).toBe('/page');

      // Non-essential data should be removed
      expect(result.data.history).toBeUndefined();
      expect(result.data.referrer).toBeUndefined();
    });
  });

  describe('DOM Context', () => {
    it('should extract essential DOM data', () => {
      const context: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: {
          elementCount: 1500,
          interactiveElements: ['button', 'input', 'a'],
          domTree: {
            /* large tree */
          },
          styles: {
            /* computed styles */
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.elementCount).toBe(1500);
      expect(result.data.interactiveElements).toBe(3);

      // Non-essential data should be removed
      expect(result.data.domTree).toBeUndefined();
      expect(result.data.styles).toBeUndefined();
    });
  });

  describe('User Action Context', () => {
    it('should extract essential user action data', () => {
      const context: ContextData = {
        provider: 'user-action',
        timestamp: new Date(),
        data: {
          action: 'click',
          target: {
            tagName: 'BUTTON',
            id: 'submit-button',
            className: 'btn btn-primary',
          },
          coordinates: { x: 100, y: 200 },
          metadata: {
            /* extra data */
          },
        },
      };

      const result = strategy.apply(context);

      expect(result.data.action).toBe('click');
      expect(result.data.target).toBe('BUTTON');

      // Non-essential data should be removed
      expect(result.data.coordinates).toBeUndefined();
      expect(result.data.metadata).toBeUndefined();
    });
  });

  describe('Unknown Provider', () => {
    it('should return minimal structure for unknown provider', () => {
      const context: ContextData = {
        provider: 'unknown-provider',
        timestamp: new Date(),
        data: {
          lots: 'of',
          random: 'data',
          that: 'we',
          dont: 'understand',
        },
      };

      const result = strategy.apply(context);

      expect(result.data.summary).toBe('essential data only');
    });
  });

  describe('Preservation', () => {
    it('should preserve provider and timestamp', () => {
      const timestamp = new Date();
      const context: ContextData = {
        provider: 'form',
        timestamp,
        data: {
          lots: 'of',
          data: 'here',
        },
      };

      const result = strategy.apply(context);

      expect(result.provider).toBe('form');
      expect(result.timestamp).toBe(timestamp);
    });

    it('should significantly reduce size', () => {
      const largeContext: ContextData = {
        provider: 'form',
        timestamp: new Date(),
        data: {
          forms: Array(10)
            .fill(null)
            .map(() => ({
              fields: Array(20).fill({ name: 'field', value: 'value' }),
              validation: { errors: [] },
              history: Array(50).fill({ action: 'input' }),
            })),
        },
      };

      const result = strategy.apply(largeContext);
      const originalSize = JSON.stringify(largeContext).length;
      const compressedSize = JSON.stringify(result).length;

      expect(compressedSize).toBeLessThan(originalSize * 0.5); // <50% of original
    });
  });
});
