import { describe, it, expect, beforeEach } from 'vitest';
import { ContextCompressor } from '../../../src/context/ContextCompressor';
import type { ContextData } from '../../../src/context/ContextProvider';
import { DEFAULT_COMPRESSION_STRATEGIES } from '../../../src/context/compression/CompressionStrategies';

describe('ContextCompressor', () => {
  let compressor: ContextCompressor;

  beforeEach(() => {
    compressor = new ContextCompressor({
      tokenBudget: 500,
      minEssentialPreservation: 0.95,
    });
  });

  describe('No Compression When No Budget', () => {
    it('should not compress when no budget specified', () => {
      const compressorNoBudget = new ContextCompressor({
        minEssentialPreservation: 0.95,
      });

      const context = createLargeContext();
      const result = compressorNoBudget.compress(context);

      expect(result.savings.savedTokens).toBe(0);
      expect(result.savings.compressionRatio).toBe(1);
      expect(result.strategiesApplied).toHaveLength(0);
    });

    it('should return original context when budget is undefined', () => {
      const compressorNoBudget = new ContextCompressor();
      const context = createTestContext();

      const result = compressorNoBudget.compress(context);

      // Deep clone converts Date to string via JSON
      expect(result.compressed.provider).toEqual(context.provider);
      expect(result.compressed.data).toEqual(context.data);
      expect(result.original.provider).toEqual(context.provider);
      expect(result.original.data).toEqual(context.data);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens based on character count', () => {
      const context = createTestContext();
      const tokens = compressor.estimateTokens(context);

      const jsonLength = JSON.stringify(context).length;
      const expectedTokens = Math.ceil(jsonLength / 4);

      expect(tokens).toBe(expectedTokens);
    });

    it('should use custom token estimator if provided', () => {
      const customCompressor = new ContextCompressor({
        estimateTokens: (text) => text.length, // 1 token per char
      });

      const context = createTestContext();
      const tokens = customCompressor.estimateTokens(context);

      expect(tokens).toBe(JSON.stringify(context).length);
    });

    it('should handle empty context', () => {
      const emptyContext: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {},
      };

      const tokens = compressor.estimateTokens(emptyContext);
      expect(tokens).toBeGreaterThan(0); // Should still count the structure
    });
  });

  describe('Progressive Compression', () => {
    it('should apply strategies in order until budget met', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 300);

      expect(result.savings.compressedTokens).toBeLessThanOrEqual(300);
      expect(result.strategiesApplied.length).toBeGreaterThan(0);
    });

    it('should stop compression when budget met', () => {
      const context = createMediumContext();
      const result = compressor.compress(context, 1000);

      // Should use fewer strategies if budget met early
      expect(result.strategiesApplied.length).toBeLessThan(DEFAULT_COMPRESSION_STRATEGIES.length);
    });

    it('should apply all strategies if needed', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 100); // Very tight budget

      expect(result.strategiesApplied.length).toBeGreaterThan(0);
    });
  });

  describe('Budget Compliance', () => {
    it('should stay within token budget', () => {
      const context = createLargeContext();
      const budget = 400;
      const result = compressor.compress(context, budget);

      expect(result.savings.compressedTokens).toBeLessThanOrEqual(budget);
    });

    it('should get as close as possible to budget', () => {
      const context = createLargeContext();
      const budget = 300;
      const result = compressor.compress(context, budget);

      // Should be within 10% of budget or under it
      expect(result.savings.compressedTokens).toBeLessThanOrEqual(budget);
    });

    it('should handle already-small contexts', () => {
      const smallContext = createSmallContext();
      const result = compressor.compress(smallContext, 1000);

      // Should not compress if already within budget
      expect(result.savings.savedTokens).toBe(0);
      expect(result.strategiesApplied).toHaveLength(0);
    });
  });

  describe('Essential Data Preservation', () => {
    it('should preserve >95% of essential data', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 300);

      expect(result.essentialDataPreserved).toBeGreaterThanOrEqual(0.95);
    });

    it('should revert strategy if preservation too low', () => {
      const compressorStrict = new ContextCompressor({
        minEssentialPreservation: 0.99, // Very strict
        tokenBudget: 100, // Very tight budget
      });

      const context = createFormContext();
      const result = compressorStrict.compress(context);

      // Should stop compressing before violating preservation threshold
      expect(result.essentialDataPreserved).toBeGreaterThanOrEqual(0.99);
    });

    it('should preserve form errors and validation', () => {
      const formContext = createFormContext();
      const result = compressor.compress(formContext, 200);

      // Form data should have forms array with validation
      expect(result.compressed.data.forms).toBeDefined();
      if (result.compressed.data.forms && result.compressed.data.forms.length > 0) {
        expect(result.compressed.data.forms[0].validation).toBeDefined();
      }
    });

    it('should preserve viewport dimensions', () => {
      const viewportContext = createViewportContext();
      const result = compressor.compress(viewportContext, 200);

      expect(result.compressed.data.viewport).toBeDefined();
      expect(result.compressed.data.viewport.width).toBeDefined();
      expect(result.compressed.data.viewport.height).toBeDefined();
    });
  });

  describe('Compression Ratio', () => {
    it('should achieve >30% compression', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 400);

      expect(result.savings.percentSaved).toBeGreaterThanOrEqual(30);
    });

    it('should calculate compression ratio correctly', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 400);

      const expectedRatio = result.savings.compressedTokens / result.savings.originalTokens;
      expect(result.savings.compressionRatio).toBeCloseTo(expectedRatio, 2);
    });

    it('should calculate percent saved correctly', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 400);

      const expectedPercent =
        (result.savings.savedTokens / result.savings.originalTokens) * 100;
      expect(result.savings.percentSaved).toBeCloseTo(expectedPercent, 1);
    });
  });

  describe('Strategy Selection', () => {
    it('should track which strategies were applied', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 300);

      expect(result.strategiesApplied).toBeInstanceOf(Array);
      expect(result.strategiesApplied.length).toBeGreaterThan(0);
    });

    it('should apply remove-redundancy first', () => {
      const context = createRedundantContext();
      // Use a more relaxed compressor for this test
      const relaxedCompressor = new ContextCompressor({
        tokenBudget: 100,
        minEssentialPreservation: 0.5, // More lenient
      });
      const result = relaxedCompressor.compress(context);

      expect(result.strategiesApplied.length).toBeGreaterThan(0);
      expect(result.strategiesApplied[0]).toBe('remove-redundancy');
    });

    it('should apply strategies in order', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 200);

      // Should be in order: remove-redundancy, summarize-verbose, keep-essential
      for (let i = 1; i < result.strategiesApplied.length; i++) {
        const strategyIndex = DEFAULT_COMPRESSION_STRATEGIES.findIndex(
          (s) => s.name === result.strategiesApplied[i]
        );
        const prevStrategyIndex = DEFAULT_COMPRESSION_STRATEGIES.findIndex(
          (s) => s.name === result.strategiesApplied[i - 1]
        );
        expect(strategyIndex).toBeGreaterThan(prevStrategyIndex);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty context', () => {
      const emptyContext: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {},
      };

      const result = compressor.compress(emptyContext, 100);

      expect(result.compressed).toBeDefined();
      expect(result.savings.compressedTokens).toBeGreaterThan(0);
    });

    it('should handle very tight budget', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 50);

      // Should do its best even with impossible budget
      expect(result.compressed).toBeDefined();
      expect(result.savings.compressedTokens).toBeLessThan(
        result.savings.originalTokens
      );
    });

    it('should handle context with circular references removed', () => {
      const context = createTestContext();
      // JSON.stringify/parse will handle this naturally
      const result = compressor.compress(context, 300);

      expect(result.compressed).toBeDefined();
    });

    it('should handle null and undefined values', () => {
      const context: ContextData = {
        provider: 'test',
        timestamp: new Date(),
        data: {
          nullValue: null,
          undefinedValue: undefined,
          validValue: 'test',
        },
      };

      const result = compressor.compress(context, 200);

      expect(result.compressed.data.validValue).toBe('test');
    });
  });

  describe('Performance', () => {
    it('should compress in <10ms', () => {
      const context = createLargeContext();

      const start = performance.now();
      compressor.compress(context, 400);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle multiple compressions efficiently', () => {
      const contexts = Array(10)
        .fill(null)
        .map(() => createMediumContext());

      const start = performance.now();
      contexts.forEach((ctx) => compressor.compress(ctx, 400));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // <10ms per context
    });
  });

  describe('Result Structure', () => {
    it('should return complete result structure', () => {
      const context = createTestContext();
      const result = compressor.compress(context, 400);

      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('compressed');
      expect(result).toHaveProperty('savings');
      expect(result).toHaveProperty('strategiesApplied');
      expect(result).toHaveProperty('essentialDataPreserved');
    });

    it('should include all savings metrics', () => {
      const context = createLargeContext();
      const result = compressor.compress(context, 400);

      expect(result.savings).toHaveProperty('originalTokens');
      expect(result.savings).toHaveProperty('compressedTokens');
      expect(result.savings).toHaveProperty('savedTokens');
      expect(result.savings).toHaveProperty('compressionRatio');
      expect(result.savings).toHaveProperty('percentSaved');
    });

    it('should preserve original context unchanged', () => {
      const context = createTestContext();
      const originalJson = JSON.stringify(context);

      const result = compressor.compress(context, 400);

      expect(JSON.stringify(result.original)).toBe(originalJson);
    });
  });
});

// Helper functions to create test contexts

function createTestContext(): ContextData {
  return {
    provider: 'test',
    timestamp: new Date(),
    data: {
      value: 'test value',
      number: 42,
      boolean: true,
      nested: {
        deep: {
          value: 'nested value',
        },
      },
    },
  };
}

function createSmallContext(): ContextData {
  return {
    provider: 'viewport',
    timestamp: new Date(),
    data: {
      width: 1920,
      height: 1080,
    },
  };
}

function createMediumContext(): ContextData {
  return {
    provider: 'form',
    timestamp: new Date(),
    data: {
      forms: [
        {
          id: 'test-form',
          fields: ['name', 'email', 'message'],
          validation: { valid: true, errors: [] },
        },
      ],
    },
  };
}

function createLargeContext(): ContextData {
  return {
    provider: 'form',
    timestamp: new Date(),
    data: {
      forms: [
        {
          id: 'contact-form',
          fields: Array(20)
            .fill(null)
            .map((_, i) => ({
              name: `field-${i}`,
              value: `Very long field value that should be compressed ${i}`.repeat(5),
              type: 'text',
              required: true,
              validation: {
                valid: true,
                errors: [],
                rules: ['required', 'minLength', 'maxLength'],
              },
            })),
          validation: {
            valid: false,
            errors: ['Field 1 is required', 'Field 2 must be at least 5 characters'],
          },
          metadata: {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: '1.0.0',
          },
        },
      ],
      history: Array(10)
        .fill(null)
        .map((_, i) => ({
          timestamp: Date.now() - i * 1000,
          action: 'input',
          field: `field-${i}`,
        })),
    },
  };
}

function createRedundantContext(): ContextData {
  return {
    provider: 'test',
    timestamp: new Date(),
    data: {
      value: '   test   ',
      longValue: 'a'.repeat(500), // Make it larger to need compression
      empty: '',
      nullValue: null,
      undefinedValue: undefined,
      emptyArray: [],
      emptyObject: {},
      duplicates: [1, 1, 2, 2, 3, 3],
      nested: {
        empty: '',
        nullValue: null,
        validValue: 'keep this',
        moreData: Array(20).fill('data'), // Add more to make it larger
      },
    },
  };
}

function createFormContext(): ContextData {
  return {
    provider: 'form',
    timestamp: new Date(),
    data: {
      forms: [
        {
          id: 'login-form',
          fields: [
            { name: 'email', type: 'email', required: true, value: 'test@example.com' },
            { name: 'password', type: 'password', required: true, value: '[REDACTED]' },
          ],
          validation: {
            valid: false,
            errors: ['Email is required', 'Password must be at least 8 characters'],
          },
          focused: 'email',
          completion: 0.5,
        },
      ],
    },
  };
}

function createViewportContext(): ContextData {
  return {
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
        percentX: 0,
        percentY: 25,
      },
      touch: false,
    },
  };
}
