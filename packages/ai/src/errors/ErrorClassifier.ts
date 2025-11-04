/**
 * Error classification and categorization system
 *
 * Classifies errors into actionable categories to enable intelligent
 * retry strategies, circuit breaking, and recovery mechanisms.
 */

/**
 * Error type categories
 */
export type ErrorType =
  | 'transient'      // Temporary errors that may succeed on retry (network glitches, timeouts)
  | 'rate_limit'     // API rate limiting errors requiring backoff
  | 'authentication' // Auth failures requiring credential refresh
  | 'validation'     // Input validation errors that won't succeed on retry
  | 'not_found'      // Resource not found errors
  | 'permission'     // Insufficient permissions
  | 'server_error'   // Server-side errors (5xx) that may be transient
  | 'client_error'   // Client-side errors (4xx) that are permanent
  | 'network'        // Network connectivity issues
  | 'timeout'        // Request timeout errors
  | 'cancelled'      // User-cancelled requests
  | 'unknown';       // Unclassified errors

/**
 * Detailed error information extracted from errors
 */
export interface ErrorInfo {
  /** Error type category */
  type: ErrorType;
  /** Whether this error is retryable */
  retryable: boolean;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Original error message */
  message: string;
  /** Provider-specific error code */
  code?: string;
  /** Suggested retry delay in milliseconds */
  retryAfter?: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Configuration for error classification
 */
export interface ErrorClassifierConfig {
  /** Custom error patterns to match */
  customPatterns?: Array<{
    pattern: RegExp;
    type: ErrorType;
    retryable?: boolean;
  }>;
  /** Custom status code mappings */
  statusCodeMappings?: Record<number, ErrorType>;
  /** Whether to include stack traces in error info */
  includeStackTrace?: boolean;
}

/**
 * Classifies errors into actionable categories
 *
 * Analyzes error objects to determine their type, retryability,
 * and appropriate handling strategy.
 *
 * Features:
 * - HTTP status code classification
 * - Error message pattern matching
 * - Provider-specific error code handling
 * - Retry-After header parsing
 * - Custom error pattern support
 *
 * Usage:
 * ```ts
 * const classifier = new ErrorClassifier();
 *
 * try {
 *   await provider.chat(messages);
 * } catch (error) {
 *   const info = classifier.classify(error);
 *
 *   if (info.retryable) {
 *     const delay = info.retryAfter || calculateBackoff();
 *     await wait(delay);
 *     // Retry request
 *   } else {
 *     // Handle permanent error
 *   }
 * }
 * ```
 */
export class ErrorClassifier {
  private config: ErrorClassifierConfig;

  constructor(config: ErrorClassifierConfig = {}) {
    this.config = config;
  }

  /**
   * Classify an error into an actionable category
   */
  classify(error: unknown): ErrorInfo {
    // Handle Error objects
    if (error instanceof Error) {
      return this.classifyError(error);
    }

    // Handle response-like objects (fetch, axios, etc.)
    if (this.isHttpError(error)) {
      return this.classifyHttpError(error);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.classifyStringError(error);
    }

    // Unknown error type
    return {
      type: 'unknown',
      retryable: false,
      message: String(error),
    };
  }

  /**
   * Check if an error type is retryable
   */
  isRetryable(errorType: ErrorType): boolean {
    const retryableTypes: ErrorType[] = [
      'transient',
      'rate_limit',
      'server_error',
      'network',
      'timeout',
    ];
    return retryableTypes.includes(errorType);
  }

  /**
   * Extract retry delay from error
   */
  getRetryDelay(error: unknown): number | undefined {
    // Check for Retry-After header in HTTP responses
    if (this.isHttpError(error)) {
      const retryAfter = error.headers?.['retry-after'];
      if (retryAfter) {
        // Retry-After can be seconds or HTTP date
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
          return seconds * 1000; // Convert to milliseconds
        }
      }
    }

    // Check for provider-specific retry hints
    if (error && typeof error === 'object' && 'retryAfter' in error) {
      const retryAfter = (error as any).retryAfter;
      if (typeof retryAfter === 'number') {
        return retryAfter;
      }
    }

    return undefined;
  }

  /**
   * Classify Error objects
   */
  private classifyError(error: Error): ErrorInfo {
    const message = error.message.toLowerCase();

    // Check custom patterns first
    if (this.config.customPatterns) {
      for (const { pattern, type, retryable } of this.config.customPatterns) {
        if (pattern.test(error.message)) {
          return {
            type,
            retryable: retryable ?? this.isRetryable(type),
            message: error.message,
            context: this.extractContext(error),
          };
        }
      }
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up')
    ) {
      return {
        type: 'network',
        retryable: true,
        message: error.message,
        context: this.extractContext(error),
      };
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('etimedout')
    ) {
      return {
        type: 'timeout',
        retryable: true,
        message: error.message,
        context: this.extractContext(error),
      };
    }

    // Auth errors
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('auth') ||
      message.includes('invalid api key') ||
      message.includes('invalid token')
    ) {
      return {
        type: 'authentication',
        retryable: false,
        message: error.message,
        context: this.extractContext(error),
      };
    }

    // Rate limiting
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded')
    ) {
      return {
        type: 'rate_limit',
        retryable: true,
        message: error.message,
        retryAfter: this.getRetryDelay(error),
        context: this.extractContext(error),
      };
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('bad request')
    ) {
      return {
        type: 'validation',
        retryable: false,
        message: error.message,
        context: this.extractContext(error),
      };
    }

    // Cancelled errors
    if (message.includes('cancel') || message.includes('abort')) {
      return {
        type: 'cancelled',
        retryable: false,
        message: error.message,
        context: this.extractContext(error),
      };
    }

    // Default to transient for Error objects
    return {
      type: 'transient',
      retryable: true,
      message: error.message,
      context: this.extractContext(error),
    };
  }

  /**
   * Classify HTTP error responses
   */
  private classifyHttpError(error: any): ErrorInfo {
    const statusCode = error.status || error.statusCode;
    const message = error.message || error.statusText || 'HTTP Error';

    // Use custom status code mappings if provided
    if (this.config.statusCodeMappings?.[statusCode]) {
      const type = this.config.statusCodeMappings[statusCode];
      return {
        type,
        retryable: this.isRetryable(type),
        statusCode,
        message,
        retryAfter: this.getRetryDelay(error),
        context: this.extractContext(error),
      };
    }

    // Standard HTTP status code classification
    if (statusCode === 401) {
      return {
        type: 'authentication',
        retryable: false,
        statusCode,
        message,
        context: this.extractContext(error),
      };
    }

    if (statusCode === 403) {
      return {
        type: 'permission',
        retryable: false,
        statusCode,
        message,
        context: this.extractContext(error),
      };
    }

    if (statusCode === 404) {
      return {
        type: 'not_found',
        retryable: false,
        statusCode,
        message,
        context: this.extractContext(error),
      };
    }

    if (statusCode === 429) {
      return {
        type: 'rate_limit',
        retryable: true,
        statusCode,
        message,
        retryAfter: this.getRetryDelay(error),
        context: this.extractContext(error),
      };
    }

    if (statusCode >= 400 && statusCode < 500) {
      return {
        type: 'client_error',
        retryable: false,
        statusCode,
        message,
        context: this.extractContext(error),
      };
    }

    if (statusCode >= 500) {
      return {
        type: 'server_error',
        retryable: true,
        statusCode,
        message,
        context: this.extractContext(error),
      };
    }

    return {
      type: 'unknown',
      retryable: false,
      statusCode,
      message,
      context: this.extractContext(error),
    };
  }

  /**
   * Classify string error messages
   */
  private classifyStringError(error: string): ErrorInfo {
    const message = error.toLowerCase();

    if (message.includes('timeout')) {
      return { type: 'timeout', retryable: true, message: error };
    }

    if (message.includes('network')) {
      return { type: 'network', retryable: true, message: error };
    }

    if (message.includes('rate limit')) {
      return { type: 'rate_limit', retryable: true, message: error };
    }

    return {
      type: 'unknown',
      retryable: false,
      message: error,
    };
  }

  /**
   * Check if error looks like an HTTP error
   */
  private isHttpError(error: unknown): error is { status?: number; statusCode?: number; message?: string; statusText?: string; headers?: Record<string, string> } {
    return (
      error !== null &&
      typeof error === 'object' &&
      ('status' in error || 'statusCode' in error)
    );
  }

  /**
   * Extract additional context from error
   */
  private extractContext(error: unknown): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    if (!error || typeof error !== 'object') {
      return context;
    }

    // Extract common error properties
    const errorObj = error as any;

    if (errorObj.code) context.code = errorObj.code;
    if (errorObj.name) context.name = errorObj.name;
    if (errorObj.type) context.errorType = errorObj.type;

    // Extract stack trace if configured
    if (this.config.includeStackTrace && errorObj.stack) {
      context.stack = errorObj.stack;
    }

    // Extract provider-specific context
    if (errorObj.response) {
      context.response = {
        status: errorObj.response.status,
        statusText: errorObj.response.statusText,
        data: errorObj.response.data,
      };
    }

    return context;
  }
}
