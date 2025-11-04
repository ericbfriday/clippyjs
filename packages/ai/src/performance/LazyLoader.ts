/**
 * Lazy loading system for dynamic component loading
 *
 * Provides utilities for lazy loading React components, code splitting,
 * and preloading strategies to optimize bundle size and load time.
 */

import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Lazy load options
 */
export interface LazyLoadOptions {
  /** Preload component after delay (ms) */
  preloadDelay?: number;
  /** Retry failed loads */
  retryCount?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Loading timeout in ms */
  timeout?: number;
  /** Callback for loading errors */
  onError?: (error: Error) => void;
  /** Callback for successful load */
  onLoad?: () => void;
}

/**
 * Preload strategy
 */
export type PreloadStrategy =
  | 'idle'           // Load when browser is idle
  | 'visible'        // Load when component is visible
  | 'interaction'    // Load on user interaction
  | 'delay'          // Load after delay
  | 'eager';         // Load immediately

/**
 * Loading state
 */
export interface LoadingState {
  /** Whether component is loaded */
  loaded: boolean;
  /** Whether component is loading */
  loading: boolean;
  /** Loading error if any */
  error?: Error;
}

/**
 * Chunk metadata
 */
interface ChunkMetadata {
  /** Chunk name */
  name: string;
  /** Load promise */
  promise?: Promise<any>;
  /** Whether chunk is preloaded */
  preloaded: boolean;
  /** Load timestamp */
  loadedAt?: number;
}

/**
 * Default lazy load options
 */
export const DEFAULT_LAZY_OPTIONS: Required<Omit<LazyLoadOptions, 'onError' | 'onLoad'>> = {
  preloadDelay: 0,
  retryCount: 3,
  retryDelay: 1000,
  timeout: 10000,
};

/**
 * Lazy loader
 *
 * Manages lazy loading of React components with advanced strategies
 * including preloading, retries, and loading state management.
 *
 * Features:
 * - Dynamic component loading
 * - Multiple preload strategies
 * - Automatic retry on failure
 * - Loading state tracking
 * - Code splitting utilities
 *
 * Usage:
 * ```tsx
 * // Basic lazy loading
 * const Component = lazyLoader.load(() => import('./Component'));
 *
 * // With preloading
 * const Component = lazyLoader.load(
 *   () => import('./Component'),
 *   { preloadDelay: 2000 }
 * );
 *
 * // Preload on hover
 * lazyLoader.preloadOn('hover', 'MyComponent', () => import('./Component'));
 *
 * // Check loading state
 * const state = lazyLoader.getLoadingState('MyComponent');
 * ```
 */
export class LazyLoader {
  private chunks = new Map<string, ChunkMetadata>();
  private loadingStates = new Map<string, LoadingState>();
  private preloadObservers = new Map<string, IntersectionObserver>();

  /**
   * Lazy load a component
   */
  load<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    options: LazyLoadOptions = {}
  ): LazyExoticComponent<T> {
    const config = { ...DEFAULT_LAZY_OPTIONS, ...options };
    const chunkName = this.extractChunkName(factory.toString());

    // Create loading state
    this.loadingStates.set(chunkName, {
      loaded: false,
      loading: false,
    });

    // Wrap factory with retry logic
    const wrappedFactory = () => this.loadWithRetry(factory, chunkName, config);

    // Create lazy component
    const LazyComponent = lazy(wrappedFactory);

    // Schedule preload if requested
    if (config.preloadDelay > 0) {
      setTimeout(() => this.preload(chunkName, factory), config.preloadDelay);
    }

    return LazyComponent;
  }

  /**
   * Preload a component
   */
  async preload(
    name: string,
    factory: () => Promise<any>
  ): Promise<void> {
    const chunk = this.chunks.get(name);

    // Already preloaded or loading
    if (chunk?.preloaded || chunk?.promise) {
      return chunk.promise;
    }

    // Start preload
    const promise = factory();
    this.chunks.set(name, {
      name,
      promise,
      preloaded: false,
    });

    try {
      await promise;
      this.chunks.set(name, {
        name,
        preloaded: true,
        loadedAt: Date.now(),
      });
    } catch (error) {
      console.error(`[LazyLoader] Failed to preload ${name}:`, error);
      this.chunks.delete(name);
      throw error;
    }
  }

  /**
   * Preload component based on strategy
   */
  preloadOn(
    strategy: PreloadStrategy,
    name: string,
    factory: () => Promise<any>,
    options?: { delay?: number; threshold?: number }
  ): void {
    switch (strategy) {
      case 'eager':
        this.preload(name, factory);
        break;

      case 'delay':
        setTimeout(
          () => this.preload(name, factory),
          options?.delay || 2000
        );
        break;

      case 'idle':
        this.preloadOnIdle(name, factory);
        break;

      case 'visible':
        // Requires element to observe
        console.warn('[LazyLoader] visible strategy requires element');
        break;

      case 'interaction':
        // Requires event to listen to
        console.warn('[LazyLoader] interaction strategy requires event');
        break;
    }
  }

  /**
   * Preload when element is visible
   */
  preloadWhenVisible(
    element: Element,
    name: string,
    factory: () => Promise<any>,
    threshold: number = 0.1
  ): () => void {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.preload(name, factory);
            observer.disconnect();
          }
        }
      },
      { threshold }
    );

    observer.observe(element);
    this.preloadObservers.set(name, observer);

    // Return cleanup function
    return () => {
      observer.disconnect();
      this.preloadObservers.delete(name);
    };
  }

  /**
   * Preload when browser is idle
   */
  preloadOnIdle(name: string, factory: () => Promise<any>): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.preload(name, factory), { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.preload(name, factory), 3000);
    }
  }

  /**
   * Get loading state for component
   */
  getLoadingState(name: string): LoadingState | undefined {
    return this.loadingStates.get(name);
  }

  /**
   * Check if component is preloaded
   */
  isPreloaded(name: string): boolean {
    return this.chunks.get(name)?.preloaded || false;
  }

  /**
   * Get all preloaded chunks
   */
  getPreloadedChunks(): string[] {
    return Array.from(this.chunks.values())
      .filter(chunk => chunk.preloaded)
      .map(chunk => chunk.name);
  }

  /**
   * Clear preload cache
   */
  clearCache(): void {
    this.chunks.clear();
    this.loadingStates.clear();

    // Disconnect all observers
    for (const observer of this.preloadObservers.values()) {
      observer.disconnect();
    }
    this.preloadObservers.clear();
  }

  /**
   * Load with retry logic
   */
  private async loadWithRetry(
    factory: () => Promise<any>,
    name: string,
    config: Required<Omit<LazyLoadOptions, 'onError' | 'onLoad'>>
  ): Promise<any> {
    const state = this.loadingStates.get(name)!;
    state.loading = true;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.retryCount; attempt++) {
      try {
        // Set timeout
        const loadPromise = factory();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Load timeout')), config.timeout)
        );

        const module = await Promise.race([loadPromise, timeoutPromise]);

        // Success
        state.loaded = true;
        state.loading = false;
        state.error = undefined;

        return module;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[LazyLoader] Load attempt ${attempt + 1}/${config.retryCount + 1} failed for ${name}:`,
          error
        );

        // Wait before retry
        if (attempt < config.retryCount) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }
    }

    // All retries failed
    state.loading = false;
    state.error = lastError;

    throw lastError || new Error(`Failed to load ${name}`);
  }

  /**
   * Extract chunk name from factory function
   */
  private extractChunkName(factoryString: string): string {
    // Try to extract from webpack magic comment
    const match = factoryString.match(/webpackChunkName:\s*["']([^"']+)["']/);
    if (match) {
      return match[1];
    }

    // Try to extract from import path
    const importMatch = factoryString.match(/import\(['"]([^'"]+)['"]\)/);
    if (importMatch) {
      const path = importMatch[1];
      return path.split('/').pop()?.replace(/\.\w+$/, '') || 'unknown';
    }

    return `chunk-${Date.now()}`;
  }
}

/**
 * Create a prefetch link for a chunk
 */
export function prefetchChunk(href: string): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'script';
  document.head.appendChild(link);
  return link;
}

/**
 * Create a preload link for a chunk
 */
export function preloadChunk(href: string): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = 'script';
  document.head.appendChild(link);
  return link;
}

/**
 * Check if browser supports module preload
 */
export function supportsModulePreload(): boolean {
  const link = document.createElement('link');
  return link.relList?.supports?.('modulepreload') || false;
}

/**
 * Default lazy loader instance
 */
export const lazyLoader = new LazyLoader();
