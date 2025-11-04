import type { ContextProvider, ContextData, ContextTrigger } from './ContextProvider';

/**
 * Performance context data structure
 */
export interface PerformanceContextInfo {
  navigation: {
    domContentLoaded: number;
    loadComplete: number;
    timeToInteractive?: number;
  };
  paint: {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
  };
  vitals: {
    cls?: number; // Cumulative Layout Shift
    fid?: number; // First Input Delay
  };
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  network?: {
    effectiveType: string;
    downlink?: number;
    rtt?: number;
  };
}

/**
 * Performance Context Provider
 *
 * Gathers performance metrics including page load timing, Core Web Vitals,
 * memory usage, and network information. This helps AI understand page
 * performance issues and provide optimization suggestions.
 */
export class PerformanceContextProvider implements ContextProvider {
  name = 'performance';
  enabled = true;

  private lcpValue?: number;
  private clsValue?: number;
  private fidValue?: number;

  constructor() {
    // Start observing performance metrics
    this.observeWebVitals();
  }

  async gather(): Promise<ContextData> {
    return {
      provider: 'performance',
      timestamp: new Date(),
      data: {
        navigation: await this.getNavigationTiming(),
        paint: await this.getPaintTiming(),
        vitals: this.getWebVitals(),
        memory: this.getMemoryInfo(),
        network: this.getNetworkInfo(),
      } as PerformanceContextInfo,
    };
  }

  shouldInclude(trigger: ContextTrigger): boolean {
    // Include performance context for user prompts (when asking for help)
    // Less relevant for proactive triggers
    return trigger === 'user-prompt';
  }

  /**
   * Get navigation timing metrics
   */
  private async getNavigationTiming(): Promise<PerformanceContextInfo['navigation']> {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;

      if (!navigation) {
        return {
          domContentLoaded: 0,
          loadComplete: 0,
        };
      }

      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
        loadComplete: Math.round(navigation.loadEventEnd),
        timeToInteractive: navigation.domInteractive
          ? Math.round(navigation.domInteractive)
          : undefined,
      };
    } catch (error) {
      return {
        domContentLoaded: 0,
        loadComplete: 0,
      };
    }
  }

  /**
   * Get paint timing metrics
   */
  private async getPaintTiming(): Promise<PerformanceContextInfo['paint']> {
    try {
      const paintEntries = performance.getEntriesByType('paint');

      const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

      return {
        fcp: fcp ? Math.round(fcp.startTime) : undefined,
        lcp: this.lcpValue,
      };
    } catch (error) {
      return {
        fcp: undefined,
        lcp: undefined,
      };
    }
  }

  /**
   * Get Core Web Vitals
   */
  private getWebVitals(): PerformanceContextInfo['vitals'] {
    return {
      cls: this.clsValue,
      fid: this.fidValue,
    };
  }

  /**
   * Get memory information (Chrome-specific)
   */
  private getMemoryInfo(): PerformanceContextInfo['memory'] | undefined {
    try {
      // @ts-ignore - Chrome-specific API
      if (performance.memory) {
        // @ts-ignore
        const mem = performance.memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize || 0,
          totalJSHeapSize: mem.totalJSHeapSize || 0,
          jsHeapSizeLimit: mem.jsHeapSizeLimit || 0,
        };
      }
    } catch (error) {
      // Memory API not available
    }
    return undefined;
  }

  /**
   * Get network information
   */
  private getNetworkInfo(): PerformanceContextInfo['network'] | undefined {
    try {
      // @ts-ignore - Network Information API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      if (connection) {
        return {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink,
          rtt: connection.rtt,
        };
      }
    } catch (error) {
      // Network Information API not available
    }
    return undefined;
  }

  /**
   * Observe Core Web Vitals using PerformanceObserver
   */
  private observeWebVitals(): void {
    // Check if PerformanceObserver is available
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      // Observe Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          this.lcpValue = Math.round(lastEntry.renderTime || lastEntry.loadTime);
        }
      });

      try {
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        // LCP observer not supported
      }

      // Observe Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
            this.clsValue = Math.round(clsScore * 1000) / 1000;
          }
        }
      });

      try {
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // CLS observer not supported
      }

      // Observe First Input Delay (FID)
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstInput = entries[0] as any;
        if (firstInput) {
          this.fidValue = Math.round(firstInput.processingStart - firstInput.startTime);
        }
      });

      try {
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        // FID observer not supported
      }
    } catch (error) {
      // PerformanceObserver setup failed
    }
  }
}
