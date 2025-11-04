/**
 * React Error Boundary with recovery UI and telemetry integration
 *
 * Comprehensive error boundary component with:
 * - Error recovery UI with retry
 * - Error reporting integration
 * - Fallback component rendering
 * - Error context preservation
 * - Graceful degradation support
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps {
  /** Fallback UI when error occurs */
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Enable reset button */
  showReset?: boolean;
  /** Custom reset button text */
  resetText?: string;
  /** Reset callback */
  onReset?: () => void;
  /** Children to render */
  children: ReactNode;
  /** Isolation key for resetting boundary */
  isolationKey?: string;
  /** Enable telemetry reporting */
  reportErrors?: boolean;
  /** Custom error reporter */
  errorReporter?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
}

/**
 * Error boundary for React component trees
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the
 * component tree that crashed.
 *
 * Features:
 * - Configurable fallback UI
 * - Error recovery with reset
 * - Error context preservation
 * - Telemetry integration
 * - Isolation key for granular resets
 * - Error throttling to prevent error loops
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary
 *   fallback={<ErrorFallback />}
 *   onError={(error, errorInfo) => {
 *     console.error('Error caught:', error, errorInfo);
 *   }}
 *   showReset={true}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const now = Date.now();
    const { lastErrorTime, errorCount } = this.state;

    // Detect error loops (multiple errors within 5 seconds)
    const isErrorLoop = now - lastErrorTime < 5000 && errorCount > 2;

    if (isErrorLoop) {
      console.error('Error loop detected, preventing further renders');
    }

    this.setState({
      errorInfo,
      errorCount: errorCount + 1,
      lastErrorTime: now,
    });

    // Call error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error if enabled
    if (this.props.reportErrors !== false) {
      this.reportError(error, errorInfo);
    }

    // Log to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  /**
   * Report error to telemetry
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.errorReporter) {
      this.props.errorReporter(error, errorInfo);
    } else {
      // Default error reporting (could integrate with telemetry system)
      console.warn('Error reported:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  /**
   * Reset error boundary
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset if isolation key changes
    if (
      this.props.isolationKey &&
      prevProps.isolationKey !== this.props.isolationKey &&
      this.state.hasError
    ) {
      this.handleReset();
    }
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { fallback, showReset = true, resetText = 'Try Again', children } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function' && errorInfo) {
          return fallback(error, errorInfo);
        }
        return fallback;
      }

      // Render default error UI
      return (
        <ErrorFallbackUI
          error={error}
          errorInfo={errorInfo}
          errorCount={errorCount}
          showReset={showReset}
          resetText={resetText}
          onReset={this.handleReset}
        />
      );
    }

    return children;
  }
}

/**
 * Default error fallback UI props
 */
interface ErrorFallbackUIProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  showReset: boolean;
  resetText: string;
  onReset: () => void;
}

/**
 * Default error fallback UI
 */
function ErrorFallbackUI({
  error,
  errorInfo,
  errorCount,
  showReset,
  resetText,
  onReset,
}: ErrorFallbackUIProps): JSX.Element {
  const isErrorLoop = errorCount > 3;

  return (
    <div
      style={{
        padding: '20px',
        margin: '20px',
        border: '2px solid #dc2626',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        color: '#991b1b',
      }}
      role="alert"
      aria-live="assertive"
    >
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>
        {isErrorLoop ? '⚠️ Critical Error' : '❌ Something went wrong'}
      </h2>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Error Message:</p>
        <code
          style={{
            display: 'block',
            padding: '8px',
            backgroundColor: '#fff',
            border: '1px solid #fca5a5',
            borderRadius: '4px',
            fontSize: '14px',
            overflowX: 'auto',
          }}
        >
          {error.message}
        </code>
      </div>

      {error.stack && (
        <details style={{ marginBottom: '16px' }}>
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            Stack Trace
          </summary>
          <pre
            style={{
              margin: '0',
              padding: '8px',
              backgroundColor: '#fff',
              border: '1px solid #fca5a5',
              borderRadius: '4px',
              fontSize: '12px',
              overflowX: 'auto',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {error.stack}
          </pre>
        </details>
      )}

      {errorInfo?.componentStack && (
        <details style={{ marginBottom: '16px' }}>
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            Component Stack
          </summary>
          <pre
            style={{
              margin: '0',
              padding: '8px',
              backgroundColor: '#fff',
              border: '1px solid #fca5a5',
              borderRadius: '4px',
              fontSize: '12px',
              overflowX: 'auto',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {errorInfo.componentStack}
          </pre>
        </details>
      )}

      {isErrorLoop && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #dc2626',
            borderRadius: '4px',
          }}
        >
          <p style={{ margin: '0', fontWeight: '600' }}>
            ⚠️ Error loop detected ({errorCount} errors)
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
            Multiple errors occurred in quick succession. Please check the console for more
            details.
          </p>
        </div>
      )}

      {showReset && !isErrorLoop && (
        <button
          onClick={onReset}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#b91c1c';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
          }}
        >
          {resetText}
        </button>
      )}

      {isErrorLoop && (
        <p style={{ marginTop: '16px', fontSize: '14px', fontStyle: 'italic' }}>
          Please refresh the page to recover. If the issue persists, contact support.
        </p>
      )}
    </div>
  );
}

/**
 * Higher-order component for adding error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return Wrapped;
}

/**
 * Hook for manually throwing errors to nearest error boundary
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error>();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}
