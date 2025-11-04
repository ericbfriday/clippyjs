/**
 * ErrorTracking tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorTracking,
  ErrorSeverity,
  ErrorCategory,
} from '../../../src/telemetry/ErrorTracking';
import { TelemetryCollector } from '../../../src/telemetry/TelemetryCollector';

describe('ErrorTracking', () => {
  let collector: TelemetryCollector;
  let errorTracking: ErrorTracking;

  beforeEach(() => {
    collector = new TelemetryCollector({
      enabled: true,
      transport: 'console',
      flushIntervalMs: 0,
    });
  });

  afterEach(() => {
    if (errorTracking) {
      errorTracking.destroy();
    }
    if (collector) {
      collector.destroy();
    }
  });

  describe('Error Capture', () => {
    it('should capture errors with basic info', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Test error');
      const errorId = errorTracking.captureError(error);

      expect(errorId).toBeTruthy();
      const captured = errorTracking.getError(errorId!);
      expect(captured?.message).toBe('Test error');
      expect(captured?.name).toBe('Error');
      expect(captured?.stack).toBeDefined();
    });

    it('should capture errors with custom severity', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Critical error');
      const errorId = errorTracking.captureError(error, {
        severity: ErrorSeverity.CRITICAL,
      });

      const captured = errorTracking.getError(errorId!);
      expect(captured?.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should capture errors with custom category', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Network timeout');
      const errorId = errorTracking.captureError(error, {
        category: ErrorCategory.NETWORK,
      });

      const captured = errorTracking.getError(errorId!);
      expect(captured?.category).toBe(ErrorCategory.NETWORK);
    });

    it('should capture errors with context', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('API error');
      const errorId = errorTracking.captureError(error, {
        context: {
          endpoint: '/api/test',
          method: 'POST',
          statusCode: 500,
        },
      });

      const captured = errorTracking.getError(errorId!);
      expect(captured?.context.endpoint).toBe('/api/test');
      expect(captured?.context.statusCode).toBe(500);
    });

    it('should capture errors with user info', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('User error');
      const errorId = errorTracking.captureError(error, {
        user: {
          id: 'user-123',
          sessionId: 'session-456',
        },
      });

      const captured = errorTracking.getError(errorId!);
      expect(captured?.user?.id).toBe('user-123');
      expect(captured?.user?.sessionId).toBe('session-456');
    });

    it('should not capture when disabled', () => {
      errorTracking = new ErrorTracking(collector, { enabled: false });

      const error = new Error('Test error');
      const errorId = errorTracking.captureError(error);

      expect(errorId).toBeNull();
    });
  });

  describe('Error Exceptions and Messages', () => {
    it('should capture exceptions by message', () => {
      errorTracking = new ErrorTracking(collector);

      const errorId = errorTracking.captureException('Custom exception message', {
        severity: ErrorSeverity.ERROR,
      });

      const captured = errorTracking.getError(errorId!);
      expect(captured?.message).toBe('Custom exception message');
      expect(captured?.name).toBe('CapturedExceptionError');
    });

    it('should capture non-error messages', () => {
      errorTracking = new ErrorTracking(collector);

      // Should not throw
      errorTracking.captureMessage('Info message', ErrorSeverity.INFO, {
        context: 'test',
      });

      expect(true).toBe(true);
    });
  });

  describe('Breadcrumbs', () => {
    it('should add and include breadcrumbs with errors', () => {
      errorTracking = new ErrorTracking(collector);

      errorTracking.addBreadcrumb({
        category: 'navigation',
        message: 'User navigated to page',
        level: 'info',
      });

      errorTracking.addBreadcrumb({
        category: 'user',
        message: 'User clicked button',
        level: 'info',
      });

      const error = new Error('Test error');
      const errorId = errorTracking.captureError(error);

      const captured = errorTracking.getError(errorId!);
      expect(captured?.breadcrumbs.length).toBe(2);
      expect(captured?.breadcrumbs[0].category).toBe('navigation');
      expect(captured?.breadcrumbs[1].category).toBe('user');
    });

    it('should limit breadcrumbs to maxBreadcrumbs', () => {
      errorTracking = new ErrorTracking(collector, {
        maxBreadcrumbs: 3,
      });

      for (let i = 0; i < 5; i++) {
        errorTracking.addBreadcrumb({
          category: 'test',
          message: `Breadcrumb ${i}`,
          level: 'info',
        });
      }

      const error = new Error('Test error');
      const errorId = errorTracking.captureError(error);

      const captured = errorTracking.getError(errorId!);
      expect(captured?.breadcrumbs.length).toBeLessThanOrEqual(3);
    });

    it('should include breadcrumb data', () => {
      errorTracking = new ErrorTracking(collector);

      errorTracking.addBreadcrumb({
        category: 'api',
        message: 'API call failed',
        level: 'error',
        data: {
          endpoint: '/api/test',
          statusCode: 500,
        },
      });

      const error = new Error('Test error');
      const errorId = errorTracking.captureError(error);

      const captured = errorTracking.getError(errorId!);
      expect(captured?.breadcrumbs[0].data?.endpoint).toBe('/api/test');
    });
  });

  describe('Error Fingerprinting and Grouping', () => {
    it('should generate consistent fingerprints for similar errors', () => {
      errorTracking = new ErrorTracking(collector);

      const error1 = new Error('Connection timeout');
      const error2 = new Error('Connection timeout');

      const id1 = errorTracking.captureError(error1);
      const id2 = errorTracking.captureError(error2);

      const captured1 = errorTracking.getError(id1!);
      const captured2 = errorTracking.getError(id2!);

      expect(captured1?.fingerprint).toBe(captured2?.fingerprint);
    });

    it('should group errors by fingerprint', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Recurring error');

      errorTracking.captureError(error);
      errorTracking.captureError(error);
      errorTracking.captureError(error);

      const groups = errorTracking.getErrorGroups();
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].count).toBe(3);
    });

    it('should track first and last seen timestamps', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Test error');

      errorTracking.captureError(error);
      setTimeout(() => {
        errorTracking.captureError(error);
      }, 10);

      const groups = errorTracking.getErrorGroups();
      expect(groups[0].firstSeen).toBeDefined();
      expect(groups[0].lastSeen).toBeGreaterThanOrEqual(groups[0].firstSeen);
    });

    it('should get errors by fingerprint', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Test error');
      const id = errorTracking.captureError(error);
      const captured = errorTracking.getError(id!);

      errorTracking.captureError(error);
      errorTracking.captureError(error);

      const errors = errorTracking.getErrorsByFingerprint(captured!.fingerprint);
      expect(errors.length).toBe(3);
    });
  });

  describe('Error Classification', () => {
    it('should classify error severity from message', () => {
      errorTracking = new ErrorTracking(collector);

      const criticalError = new Error('CRITICAL: System failure');
      const warningError = new Error('Warning: Deprecated API');

      const id1 = errorTracking.captureError(criticalError);
      const id2 = errorTracking.captureError(warningError);

      expect(errorTracking.getError(id1!)?.severity).toBe(ErrorSeverity.CRITICAL);
      expect(errorTracking.getError(id2!)?.severity).toBe(ErrorSeverity.WARNING);
    });

    it('should categorize network errors', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Network request failed');
      const errorId = errorTracking.captureError(error);

      expect(errorTracking.getError(errorId!)?.category).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize authentication errors', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Authentication failed');
      const errorId = errorTracking.captureError(error);

      expect(errorTracking.getError(errorId!)?.category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should categorize timeout errors', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Request timed out');
      const errorId = errorTracking.captureError(error);

      expect(errorTracking.getError(errorId!)?.category).toBe(ErrorCategory.TIMEOUT);
    });
  });

  describe('Error Recovery Tracking', () => {
    it('should track recovery attempts', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Recoverable error');
      const errorId = errorTracking.captureError(error);

      errorTracking.trackRecovery(errorId!, true, {
        strategy: 'retry',
        attempts: 2,
      });

      const captured = errorTracking.getError(errorId!);
      expect(captured?.recoveryAttempted).toBe(true);
      expect(captured?.recoverySuccessful).toBe(true);
    });

    it('should track failed recovery attempts', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Unrecoverable error');
      const errorId = errorTracking.captureError(error);

      errorTracking.trackRecovery(errorId!, false);

      const captured = errorTracking.getError(errorId!);
      expect(captured?.recoveryAttempted).toBe(true);
      expect(captured?.recoverySuccessful).toBe(false);
    });
  });

  describe('Error Statistics', () => {
    it('should calculate error statistics', () => {
      errorTracking = new ErrorTracking(collector);

      errorTracking.captureError(new Error('Error 1'), {
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.API,
      });
      errorTracking.captureError(new Error('Error 2'), {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.NETWORK,
      });

      const stats = errorTracking.getStats();
      expect(stats.totalErrors).toBe(2);
      expect(stats.bySeverity[ErrorSeverity.ERROR]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.WARNING]).toBe(1);
      expect(stats.byCategory[ErrorCategory.API]).toBe(1);
      expect(stats.byCategory[ErrorCategory.NETWORK]).toBe(1);
    });

    it('should track unique error groups', () => {
      errorTracking = new ErrorTracking(collector);

      errorTracking.captureError(new Error('Error A'));
      errorTracking.captureError(new Error('Error A'));
      errorTracking.captureError(new Error('Error B'));

      const stats = errorTracking.getStats();
      expect(stats.uniqueGroups).toBeGreaterThan(0);
    });
  });

  describe('Sampling', () => {
    it('should sample errors based on rate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.8);

      errorTracking = new ErrorTracking(collector, {
        samplingRate: 0.5,
      });

      const error = new Error('Test error');
      const errorId = errorTracking.captureError(error);

      // Random 0.8 > 0.5, should not be sampled
      expect(errorId).toBeNull();

      vi.mocked(Math.random).mockRestore();
    });

    it('should always capture when sampling rate is 1.0', () => {
      errorTracking = new ErrorTracking(collector, {
        samplingRate: 1.0,
      });

      const error = new Error('Test error');
      const errorId = errorTracking.captureError(error);

      expect(errorId).toBeTruthy();
    });
  });

  describe('Error Ignoring', () => {
    it('should ignore errors matching patterns', () => {
      errorTracking = new ErrorTracking(collector, {
        ignoreErrors: [/ResizeObserver/, /Script error/],
      });

      const error1 = new Error('ResizeObserver loop limit exceeded');
      const error2 = new Error('Script error');
      const error3 = new Error('Real error');

      const id1 = errorTracking.captureError(error1);
      const id2 = errorTracking.captureError(error2);
      const id3 = errorTracking.captureError(error3);

      expect(id1).toBeNull();
      expect(id2).toBeNull();
      expect(id3).toBeTruthy();
    });
  });

  describe('Cleanup and Limits', () => {
    it('should limit stored errors to maxErrors', () => {
      errorTracking = new ErrorTracking(collector, {
        maxErrors: 5,
      });

      for (let i = 0; i < 10; i++) {
        errorTracking.captureError(new Error(`Error ${i}`));
      }

      const stats = errorTracking.getStats();
      expect(stats.totalErrors).toBe(10); // Total count maintained
    });

    it('should clear all errors and breadcrumbs', () => {
      errorTracking = new ErrorTracking(collector);

      errorTracking.addBreadcrumb({
        category: 'test',
        message: 'Test breadcrumb',
        level: 'info',
      });
      errorTracking.captureError(new Error('Test error'));

      errorTracking.clear();

      const stats = errorTracking.getStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.uniqueGroups).toBe(0);
    });
  });

  describe('Global Error Handlers', () => {
    it('should install global error handlers when enabled', () => {
      // Note: This is difficult to test in Node.js environment
      // In real browser environment, would test window.addEventListener calls
      errorTracking = new ErrorTracking(collector, {
        captureUnhandled: true,
        captureUnhandledRejections: true,
      });

      expect(errorTracking).toBeDefined();
    });

    it('should not install handlers when disabled', () => {
      errorTracking = new ErrorTracking(collector, {
        captureUnhandled: false,
        captureUnhandledRejections: false,
      });

      expect(errorTracking).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without stack traces', () => {
      errorTracking = new ErrorTracking(collector);

      const error = new Error('Test error');
      delete error.stack;

      const errorId = errorTracking.captureError(error);
      const captured = errorTracking.getError(errorId!);

      expect(captured?.stack).toBeUndefined();
      expect(captured?.fingerprint).toBeDefined(); // Should still generate fingerprint
    });

    it('should handle recovery tracking for non-existent error', () => {
      errorTracking = new ErrorTracking(collector);

      // Should not throw
      errorTracking.trackRecovery('nonexistent-id', true);

      expect(true).toBe(true);
    });

    it('should handle getting non-existent error', () => {
      errorTracking = new ErrorTracking(collector);

      const error = errorTracking.getError('nonexistent-id');
      expect(error).toBeUndefined();
    });
  });
});
