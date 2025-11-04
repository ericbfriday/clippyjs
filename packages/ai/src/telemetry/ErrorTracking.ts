/**
 * ErrorTracking - Automatic error capture and analysis
 *
 * Features:
 * - Automatic error capture with stack traces
 * - Error context preservation (state, breadcrumbs)
 * - Error deduplication and grouping
 * - Error severity classification
 * - Recovery attempt tracking
 *
 * @module telemetry
 */

import type { TelemetryCollector } from './TelemetryCollector';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Error category
 */
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Breadcrumb entry for error context
 */
export interface Breadcrumb {
  /** Breadcrumb timestamp */
  timestamp: number;
  /** Category */
  category: string;
  /** Message */
  message: string;
  /** Level */
  level: 'debug' | 'info' | 'warning' | 'error';
  /** Data */
  data?: Record<string, any>;
}

/**
 * Captured error
 */
export interface CapturedError {
  /** Error ID */
  errorId: string;
  /** Error fingerprint for grouping */
  fingerprint: string;
  /** Error message */
  message: string;
  /** Error name/type */
  name: string;
  /** Stack trace */
  stack?: string;
  /** Error severity */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
  /** Error timestamp */
  timestamp: number;
  /** Error context */
  context: Record<string, any>;
  /** Breadcrumbs leading to error */
  breadcrumbs: Breadcrumb[];
  /** User info */
  user?: {
    id?: string;
    sessionId?: string;
  };
  /** Tags */
  tags?: Record<string, string>;
  /** Recovery attempted */
  recoveryAttempted?: boolean;
  /** Recovery successful */
  recoverySuccessful?: boolean;
}

/**
 * Error group statistics
 */
export interface ErrorGroupStats {
  /** Group fingerprint */
  fingerprint: string;
  /** Representative error */
  firstError: CapturedError;
  /** Last error */
  lastError: CapturedError;
  /** Total occurrences */
  count: number;
  /** Unique users affected */
  affectedUsers: number;
  /** First seen timestamp */
  firstSeen: number;
  /** Last seen timestamp */
  lastSeen: number;
}

/**
 * Error tracking configuration
 */
export interface ErrorTrackingConfig {
  /** Enable error tracking */
  enabled?: boolean;
  /** Capture unhandled errors */
  captureUnhandled?: boolean;
  /** Capture unhandled promise rejections */
  captureUnhandledRejections?: boolean;
  /** Maximum breadcrumbs to keep */
  maxBreadcrumbs?: number;
  /** Enable error deduplication */
  deduplicate?: boolean;
  /** Maximum errors to keep in memory */
  maxErrors?: number;
  /** Error sampling rate (0-1) */
  samplingRate?: number;
  /** Ignored error patterns */
  ignoreErrors?: RegExp[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ErrorTrackingConfig> = {
  enabled: true,
  captureUnhandled: true,
  captureUnhandledRejections: true,
  maxBreadcrumbs: 50,
  deduplicate: true,
  maxErrors: 100,
  samplingRate: 1.0,
  ignoreErrors: [],
};

/**
 * ErrorTracking - Error capture and analysis system
 */
export class ErrorTracking {
  private config: Required<ErrorTrackingConfig>;
  private collector: TelemetryCollector;
  private breadcrumbs: Breadcrumb[] = [];
  private errors: Map<string, CapturedError> = new Map();
  private errorGroups: Map<string, ErrorGroupStats> = new Map();
  private errorCount = 0;
  private unhandledErrorHandler?: (event: ErrorEvent) => void;
  private unhandledRejectionHandler?: (event: PromiseRejectionEvent) => void;

  constructor(collector: TelemetryCollector, config: ErrorTrackingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collector = collector;

    // Install global error handlers
    if (this.config.enabled && typeof window !== 'undefined') {
      this.installGlobalHandlers();
    }
  }

  /**
   * Capture an error
   */
  captureError(
    error: Error,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Record<string, any>;
      tags?: Record<string, string>;
      user?: { id?: string; sessionId?: string };
    } = {}
  ): string | null {
    if (!this.config.enabled) return null;
    if (!this.shouldCaptureError(error)) return null;
    if (Math.random() > this.config.samplingRate) return null;

    const errorId = this.generateErrorId();
    const fingerprint = this.generateFingerprint(error);
    const severity = options.severity || this.classifySeverity(error);
    const category = options.category || this.categorizeError(error);

    const capturedError: CapturedError = {
      errorId,
      fingerprint,
      message: error.message,
      name: error.name,
      stack: error.stack,
      severity,
      category,
      timestamp: Date.now(),
      context: options.context || {},
      breadcrumbs: [...this.breadcrumbs],
      user: options.user,
      tags: options.tags,
    };

    // Store error
    this.errors.set(errorId, capturedError);

    // Update error groups
    this.updateErrorGroup(capturedError);

    // Report to telemetry
    this.collector.trackError(error, {
      errorId,
      fingerprint,
      severity,
      category,
      breadcrumbCount: this.breadcrumbs.length,
    });

    // Cleanup old errors
    this.cleanupOldErrors();

    return errorId;
  }

  /**
   * Capture exception with message
   */
  captureException(
    message: string,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Record<string, any>;
      tags?: Record<string, string>;
    } = {}
  ): string | null {
    const error = new Error(message);
    error.name = 'CapturedExceptionError';
    return this.captureError(error, options);
  }

  /**
   * Capture message (non-error event)
   */
  captureMessage(
    message: string,
    level: ErrorSeverity = ErrorSeverity.INFO,
    context?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    this.collector.track({
      type: 'message.captured',
      timestamp: Date.now(),
      data: {
        message,
        level,
        context: context || {},
        breadcrumbs: [...this.breadcrumbs],
      },
    });
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now(),
    });

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Track error recovery attempt
   */
  trackRecovery(errorId: string, successful: boolean, context?: Record<string, any>): void {
    const error = this.errors.get(errorId);
    if (!error) return;

    error.recoveryAttempted = true;
    error.recoverySuccessful = successful;

    this.collector.track({
      type: 'error.recovery',
      timestamp: Date.now(),
      data: {
        errorId,
        fingerprint: error.fingerprint,
        successful,
        context: context || {},
      },
    });
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): CapturedError | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get errors by fingerprint
   */
  getErrorsByFingerprint(fingerprint: string): CapturedError[] {
    return Array.from(this.errors.values()).filter(e => e.fingerprint === fingerprint);
  }

  /**
   * Get error group statistics
   */
  getErrorGroups(): ErrorGroupStats[] {
    return Array.from(this.errorGroups.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    uniqueGroups: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recentErrors: number;
  } {
    const errors = Array.from(this.errors.values());
    const recentThreshold = Date.now() - 3600000; // Last hour

    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const byCategory = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    return {
      totalErrors: this.errorCount,
      uniqueGroups: this.errorGroups.size,
      bySeverity,
      byCategory,
      recentErrors: errors.filter(e => e.timestamp > recentThreshold).length,
    };
  }

  /**
   * Clear all errors and breadcrumbs
   */
  clear(): void {
    this.errors.clear();
    this.errorGroups.clear();
    this.breadcrumbs = [];
    this.errorCount = 0;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.uninstallGlobalHandlers();
    this.clear();
  }

  /**
   * Install global error handlers
   */
  private installGlobalHandlers(): void {
    if (this.config.captureUnhandled) {
      this.unhandledErrorHandler = (event: ErrorEvent) => {
        this.captureError(event.error || new Error(event.message), {
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.UNKNOWN,
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      };
      window.addEventListener('error', this.unhandledErrorHandler);
    }

    if (this.config.captureUnhandledRejections) {
      this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
        this.captureError(error, {
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.UNKNOWN,
          context: {
            type: 'unhandledRejection',
          },
        });
      };
      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }

  /**
   * Uninstall global error handlers
   */
  private uninstallGlobalHandlers(): void {
    if (this.unhandledErrorHandler && typeof window !== 'undefined') {
      window.removeEventListener('error', this.unhandledErrorHandler);
    }
    if (this.unhandledRejectionHandler && typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }

  /**
   * Check if error should be captured
   */
  private shouldCaptureError(error: Error): boolean {
    return !this.config.ignoreErrors.some(pattern => pattern.test(error.message));
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error): string {
    // Use error name, message, and top stack frame
    const stackLine = error.stack?.split('\n')[1] || '';
    const normalized = `${error.name}:${error.message}:${stackLine}`.replace(/\d+/g, 'N');
    return this.hashString(normalized);
  }

  /**
   * Classify error severity
   */
  private classifySeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (message.includes('warning') || message.includes('warn')) {
      return ErrorSeverity.WARNING;
    }
    return ErrorSeverity.ERROR;
  }

  /**
   * Categorize error
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Check timeout first (more specific)
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || name.includes('auth')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('api') || message.includes('request')) {
      return ErrorCategory.API;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Update error group statistics
   */
  private updateErrorGroup(error: CapturedError): void {
    const group = this.errorGroups.get(error.fingerprint);

    if (group) {
      group.count++;
      group.lastError = error;
      group.lastSeen = error.timestamp;
      if (error.user?.id) {
        // This is a simplification; in production, track unique user IDs
        group.affectedUsers++;
      }
    } else {
      this.errorGroups.set(error.fingerprint, {
        fingerprint: error.fingerprint,
        firstError: error,
        lastError: error,
        count: 1,
        affectedUsers: error.user?.id ? 1 : 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
      });
    }

    this.errorCount++;
  }

  /**
   * Cleanup old errors
   */
  private cleanupOldErrors(): void {
    if (this.errors.size > this.config.maxErrors) {
      const sorted = Array.from(this.errors.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      );
      const toRemove = sorted.slice(0, sorted.length - this.config.maxErrors);
      for (const [id] of toRemove) {
        this.errors.delete(id);
      }
    }
  }

  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash string to generate fingerprint
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
