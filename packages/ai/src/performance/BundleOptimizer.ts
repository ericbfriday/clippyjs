/**
 * Bundle optimization utilities
 *
 * Provides utilities for tree-shaking, dynamic imports, chunk splitting,
 * and bundle analysis to minimize production bundle size.
 */

/**
 * Bundle analysis result
 */
export interface BundleAnalysis {
  /** Total bundle size in bytes */
  totalSize: number;
  /** Gzipped size in bytes */
  gzippedSize?: number;
  /** Number of chunks */
  chunkCount: number;
  /** Largest chunks */
  largestChunks: Array<{ name: string; size: number }>;
  /** Unused exports */
  unusedExports?: string[];
  /** Duplicate dependencies */
  duplicates?: Array<{ name: string; versions: string[] }>;
  /** Optimization opportunities */
  opportunities: OptimizationOpportunity[];
}

/**
 * Optimization opportunity
 */
export interface OptimizationOpportunity {
  /** Opportunity type */
  type: 'tree-shaking' | 'code-splitting' | 'lazy-loading' | 'deduplication' | 'compression';
  /** Target module or chunk */
  target: string;
  /** Description */
  description: string;
  /** Estimated savings in bytes */
  estimatedSavings: number;
  /** Priority (low, medium, high) */
  priority: 'low' | 'medium' | 'high';
}

/**
 * Chunk configuration
 */
export interface ChunkConfig {
  /** Chunk name */
  name: string;
  /** Modules to include */
  test?: RegExp;
  /** Priority */
  priority?: number;
  /** Reuse existing chunk */
  reuseExistingChunk?: boolean;
  /** Minimum chunk size */
  minSize?: number;
  /** Maximum chunk size */
  maxSize?: number;
}

/**
 * Tree-shaking configuration
 */
export interface TreeShakingConfig {
  /** Enable tree-shaking */
  enabled: boolean;
  /** Preserve pure functions */
  pureFunctions?: string[];
  /** Side effects to consider */
  sideEffects?: boolean | string[];
}

/**
 * Bundle optimizer
 *
 * Analyzes and optimizes production bundles for minimal size and
 * optimal loading performance.
 *
 * Features:
 * - Bundle size analysis
 * - Tree-shaking helpers
 * - Dynamic import utilities
 * - Chunk splitting strategies
 * - Optimization recommendations
 *
 * Usage:
 * ```ts
 * const optimizer = new BundleOptimizer();
 *
 * // Analyze bundle
 * const analysis = optimizer.analyzeBundles({
 *   'main.js': 100000,
 *   'vendor.js': 200000,
 * });
 *
 * // Get chunk configurations
 * const chunkConfigs = optimizer.getOptimalChunkConfig();
 *
 * // Check if module should be tree-shaken
 * if (optimizer.shouldTreeShake('lodash')) {
 *   // Use tree-shakeable import
 * }
 * ```
 */
export class BundleOptimizer {
  private bundleSizes = new Map<string, number>();
  private moduleUsage = new Map<string, Set<string>>();
  private chunkConfigs: ChunkConfig[] = [];

  /**
   * Record bundle size
   */
  recordBundleSize(name: string, size: number): void {
    this.bundleSizes.set(name, size);
  }

  /**
   * Record module usage
   */
  recordModuleUsage(module: string, usedBy: string): void {
    const usage = this.moduleUsage.get(module) || new Set();
    usage.add(usedBy);
    this.moduleUsage.set(module, usage);
  }

  /**
   * Analyze bundles
   */
  analyzeBundles(bundles: Record<string, number>): BundleAnalysis {
    // Update bundle sizes
    for (const [name, size] of Object.entries(bundles)) {
      this.bundleSizes.set(name, size);
    }

    const totalSize = Array.from(this.bundleSizes.values()).reduce(
      (sum, size) => sum + size,
      0
    );

    // Find largest chunks
    const largestChunks = Array.from(this.bundleSizes.entries())
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    // Identify optimization opportunities
    const opportunities = this.identifyOpportunities();

    return {
      totalSize,
      gzippedSize: Math.round(totalSize * 0.3), // Estimated
      chunkCount: this.bundleSizes.size,
      largestChunks,
      opportunities,
    };
  }

  /**
   * Get optimal chunk configuration
   */
  getOptimalChunkConfig(): ChunkConfig[] {
    const configs: ChunkConfig[] = [
      // Vendor chunk for node_modules
      {
        name: 'vendor',
        test: /[\\/]node_modules[\\/]/,
        priority: 10,
        reuseExistingChunk: true,
      },
      // Common chunk for shared modules
      {
        name: 'common',
        minSize: 10000,
        priority: 5,
        reuseExistingChunk: true,
      },
      // React vendor chunk
      {
        name: 'react-vendor',
        test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
        priority: 20,
      },
    ];

    // Add custom configs
    configs.push(...this.chunkConfigs);

    return configs;
  }

  /**
   * Add custom chunk configuration
   */
  addChunkConfig(config: ChunkConfig): void {
    this.chunkConfigs.push(config);
  }

  /**
   * Check if module should be tree-shaken
   */
  shouldTreeShake(moduleName: string): boolean {
    // List of known tree-shakeable libraries
    const treeShakeable = [
      'lodash-es',
      'date-fns',
      'ramda',
      'rxjs',
      'react-icons',
    ];

    return treeShakeable.some(lib => moduleName.includes(lib));
  }

  /**
   * Get tree-shaking configuration
   */
  getTreeShakingConfig(): TreeShakingConfig {
    return {
      enabled: true,
      pureFunctions: ['console.log', 'console.warn', 'console.debug'],
      sideEffects: false,
    };
  }

  /**
   * Generate dynamic import for module
   */
  generateDynamicImport(modulePath: string, chunkName?: string): string {
    if (chunkName) {
      return `import(/* webpackChunkName: "${chunkName}" */ '${modulePath}')`;
    }
    return `import('${modulePath}')`;
  }

  /**
   * Get bundle size recommendations
   */
  getBundleSizeRecommendations(): {
    status: 'good' | 'warning' | 'critical';
    recommendations: string[];
  } {
    const totalSize = Array.from(this.bundleSizes.values()).reduce(
      (sum, size) => sum + size,
      0
    );

    const recommendations: string[] = [];
    let status: 'good' | 'warning' | 'critical' = 'good';

    // Check total size
    if (totalSize > 500000) {
      // >500KB
      status = 'critical';
      recommendations.push('Total bundle size exceeds 500KB - implement code splitting');
    } else if (totalSize > 250000) {
      // >250KB
      status = 'warning';
      recommendations.push('Total bundle size exceeds 250KB - consider optimization');
    }

    // Check individual chunks
    for (const [name, size] of this.bundleSizes.entries()) {
      if (size > 200000) {
        recommendations.push(`${name} is too large (${Math.round(size / 1024)}KB) - split into smaller chunks`);
      }
    }

    // Check chunk count
    if (this.bundleSizes.size > 20) {
      recommendations.push('Too many chunks - consolidate related modules');
    } else if (this.bundleSizes.size < 3) {
      recommendations.push('Too few chunks - implement code splitting for better caching');
    }

    return { status, recommendations };
  }

  /**
   * Get module usage stats
   */
  getModuleUsageStats(): Array<{ module: string; usageCount: number }> {
    return Array.from(this.moduleUsage.entries())
      .map(([module, users]) => ({
        module,
        usageCount: users.size,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Identify unused modules
   */
  getUnusedModules(): string[] {
    return Array.from(this.moduleUsage.entries())
      .filter(([_, users]) => users.size === 0)
      .map(([module]) => module);
  }

  /**
   * Reset optimizer state
   */
  reset(): void {
    this.bundleSizes.clear();
    this.moduleUsage.clear();
    this.chunkConfigs = [];
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOpportunities(): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Check for large bundles that could be split
    for (const [name, size] of this.bundleSizes.entries()) {
      if (size > 200000) {
        opportunities.push({
          type: 'code-splitting',
          target: name,
          description: `Bundle is large (${Math.round(size / 1024)}KB) - split into smaller chunks`,
          estimatedSavings: Math.round(size * 0.3),
          priority: 'high',
        });
      }
    }

    // Check for unused modules
    const unused = this.getUnusedModules();
    if (unused.length > 0) {
      opportunities.push({
        type: 'tree-shaking',
        target: 'unused-modules',
        description: `${unused.length} unused modules can be removed`,
        estimatedSavings: unused.length * 1000, // Estimated
        priority: 'medium',
      });
    }

    // Check for modules used only once
    for (const [module, users] of this.moduleUsage.entries()) {
      if (users.size === 1) {
        opportunities.push({
          type: 'lazy-loading',
          target: module,
          description: `Module used in only one place - consider lazy loading`,
          estimatedSavings: 5000, // Estimated
          priority: 'low',
        });
      }
    }

    return opportunities;
  }
}

/**
 * Webpack optimization configuration helper
 */
export function getWebpackOptimization(optimizer: BundleOptimizer): any {
  const chunkConfigs = optimizer.getOptimalChunkConfig();

  return {
    minimize: true,
    splitChunks: {
      chunks: 'all',
      cacheGroups: chunkConfigs.reduce((acc, config) => {
        acc[config.name] = {
          test: config.test,
          priority: config.priority || 0,
          reuseExistingChunk: config.reuseExistingChunk || false,
          minSize: config.minSize || 0,
          maxSize: config.maxSize,
        };
        return acc;
      }, {} as Record<string, any>),
    },
    usedExports: true,
    sideEffects: false,
  };
}

/**
 * Calculate gzipped size estimate
 */
export function estimateGzippedSize(uncompressedSize: number): number {
  // Rough estimate: gzip typically achieves 70% compression
  return Math.round(uncompressedSize * 0.3);
}

/**
 * Format bundle size for display
 */
export function formatBundleSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

/**
 * Default bundle optimizer instance
 */
export const bundleOptimizer = new BundleOptimizer();
