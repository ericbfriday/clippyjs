/**
 * Request/response inspection system
 *
 * Provides detailed inspection of AI requests and responses with timing analysis.
 */

import type { DebugCollector, RequestDebugInfo, ResponseDebugInfo } from './DebugCollector';

/**
 * Inspected request with full details
 */
export interface InspectedRequest {
  /** Request ID */
  id: string;
  /** Request info */
  request: RequestDebugInfo;
  /** Response info (if completed) */
  response?: ResponseDebugInfo;
  /** Request status */
  status: 'pending' | 'completed' | 'error';
  /** Error info (if failed) */
  error?: Error;
  /** Request duration in ms */
  duration?: number;
}

/**
 * Request inspector
 *
 * Inspects and analyzes AI requests and responses.
 *
 * Usage:
 * ```ts
 * const inspector = new RequestInspector(debugCollector);
 *
 * // Get all requests
 * const requests = inspector.getAllRequests();
 *
 * // Get specific request
 * const request = inspector.getRequest('req-123');
 *
 * // Get slow requests
 * const slow = inspector.getSlowRequests(5000);
 * ```
 */
export class RequestInspector {
  constructor(private debugCollector: DebugCollector) {}

  /**
   * Get all inspected requests
   */
  getAllRequests(): InspectedRequest[] {
    const requests = new Map<string, InspectedRequest>();

    // Process all events
    for (const event of this.debugCollector.getEvents()) {
      if (event.type === 'request-start') {
        const data = event.data as RequestDebugInfo;
        requests.set(data.id, {
          id: data.id,
          request: data,
          status: 'pending',
        });
      } else if (event.type === 'request-end') {
        const data = event.data as ResponseDebugInfo;
        const existing = requests.get(data.requestId);
        if (existing) {
          existing.response = data;
          existing.status = 'completed';
          existing.duration = data.duration;
        }
      } else if (event.type === 'request-error') {
        const data = event.data as { requestId: string; error: Error };
        const existing = requests.get(data.requestId);
        if (existing) {
          existing.status = 'error';
          existing.error = data.error;
        }
      }
    }

    return Array.from(requests.values());
  }

  /**
   * Get specific request by ID
   */
  getRequest(requestId: string): InspectedRequest | undefined {
    return this.getAllRequests().find((r) => r.id === requestId);
  }

  /**
   * Get requests by status
   */
  getRequestsByStatus(status: InspectedRequest['status']): InspectedRequest[] {
    return this.getAllRequests().filter((r) => r.status === status);
  }

  /**
   * Get slow requests (duration > threshold)
   */
  getSlowRequests(thresholdMs: number = 5000): InspectedRequest[] {
    return this.getAllRequests().filter((r) => (r.duration || 0) > thresholdMs);
  }

  /**
   * Get failed requests
   */
  getFailedRequests(): InspectedRequest[] {
    return this.getRequestsByStatus('error');
  }
}
