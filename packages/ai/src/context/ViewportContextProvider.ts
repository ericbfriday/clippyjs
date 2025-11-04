import type { ContextProvider, ContextData, ContextTrigger } from './ContextProvider';

/**
 * Viewport context data structure
 */
export interface ViewportContextInfo {
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
    orientation: 'portrait' | 'landscape';
  };
  scroll: {
    x: number;
    y: number;
    maxX: number;
    maxY: number;
    percentX: number;
    percentY: number;
  };
  touch: boolean;
  visibleArea?: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
}

/**
 * Viewport Context Provider
 *
 * Gathers information about the viewport including screen dimensions,
 * device pixel ratio, orientation, scroll position, and touch capability.
 * This context helps AI understand the user's viewing context and device.
 */
export class ViewportContextProvider implements ContextProvider {
  name = 'viewport';
  enabled = true;

  async gather(): Promise<ContextData> {
    return {
      provider: 'viewport',
      timestamp: new Date(),
      data: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: this.getDevicePixelRatio(),
          orientation: this.getOrientation(),
        },
        scroll: this.getScrollInfo(),
        touch: this.detectTouchCapability(),
        visibleArea: this.getVisibleArea(),
      } as ViewportContextInfo,
    };
  }

  shouldInclude(trigger: ContextTrigger): boolean {
    // Include viewport context for both triggers
    return true;
  }

  /**
   * Get device pixel ratio (fallback to 1 if not available)
   */
  private getDevicePixelRatio(): number {
    return typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1;
  }

  /**
   * Determine screen orientation
   */
  private getOrientation(): 'portrait' | 'landscape' {
    if (typeof window.matchMedia === 'function') {
      const portrait = window.matchMedia('(orientation: portrait)');
      return portrait.matches ? 'portrait' : 'landscape';
    }
    // Fallback: compare dimensions
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  /**
   * Get detailed scroll information
   */
  private getScrollInfo(): ViewportContextInfo['scroll'] {
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const maxX = Math.max(
      0,
      (document.documentElement?.scrollWidth || 0) - window.innerWidth
    );
    const maxY = Math.max(
      0,
      (document.documentElement?.scrollHeight || 0) - window.innerHeight
    );

    return {
      x: scrollX,
      y: scrollY,
      maxX,
      maxY,
      percentX: maxX > 0 ? Math.round((scrollX / maxX) * 100) : 0,
      percentY: maxY > 0 ? Math.round((scrollY / maxY) * 100) : 0,
    };
  }

  /**
   * Detect if device has touch capability
   */
  private detectTouchCapability(): boolean {
    // Multiple detection strategies for better browser coverage
    if (typeof window === 'undefined') return false;

    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - legacy property
      (navigator.msMaxTouchPoints || 0) > 0
    );
  }

  /**
   * Get the visible area bounds
   */
  private getVisibleArea(): ViewportContextInfo['visibleArea'] {
    try {
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      return {
        top: scrollY,
        left: scrollX,
        bottom: scrollY + window.innerHeight,
        right: scrollX + window.innerWidth,
      };
    } catch (error) {
      // Return undefined if unable to determine visible area
      return undefined;
    }
  }
}
