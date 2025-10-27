/**
 * Stream Controller for Advanced Streaming Control
 *
 * Provides fine-grained control over streaming operations including
 * pause/resume, cancellation, and progress tracking.
 */

/**
 * Progress information for a streaming operation
 */
export interface StreamProgress {
  /** Number of bytes received */
  bytes: number;
  /** Number of tokens received */
  tokens: number;
  /** Number of chunks processed */
  chunks: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Average rate in tokens per second */
  avgRate?: number;
}

/**
 * Stream state
 */
export type StreamState = 'idle' | 'streaming' | 'paused' | 'cancelled' | 'completed' | 'error';

/**
 * Stream controller configuration
 */
export interface StreamControllerConfig {
  /** Maximum rate in tokens per second (0 = unlimited) */
  maxRate?: number;
  /** Enable automatic progress tracking */
  trackProgress?: boolean;
  /** Callback when state changes */
  onStateChange?: (state: StreamState) => void;
  /** Callback when progress updates */
  onProgress?: (progress: StreamProgress) => void;
}

/**
 * StreamController
 *
 * Manages streaming operations with pause/resume, cancellation, and progress tracking.
 *
 * Features:
 * - Pause/resume streaming mid-flight
 * - Cancel streaming operations
 * - Track progress (bytes, tokens, chunks)
 * - Rate limiting support
 * - State management
 *
 * Usage:
 * ```typescript
 * const controller = new StreamController();
 *
 * // Start streaming
 * controller.start();
 *
 * // Pause mid-stream
 * controller.pause();
 *
 * // Resume
 * controller.resume();
 *
 * // Get current progress
 * const progress = controller.getProgress();
 * console.log(`Progress: ${progress.percentage}%`);
 *
 * // Cancel stream
 * controller.cancel();
 * ```
 */
export class StreamController {
  private state: StreamState = 'idle';
  private progress: StreamProgress = {
    bytes: 0,
    tokens: 0,
    chunks: 0,
    percentage: 0,
  };
  private config: StreamControllerConfig;
  private startTime: number = 0;
  private lastChunkTime: number = 0;
  private pauseStartTime: number = 0;
  private totalPausedTime: number = 0;
  private abortController: AbortController | null = null;
  private pauseResolve: (() => void) | null = null;

  constructor(config: StreamControllerConfig = {}) {
    this.config = {
      trackProgress: true,
      ...config,
    };
  }

  /**
   * Start streaming operation
   */
  start(): void {
    if (this.state !== 'idle' && this.state !== 'completed' && this.state !== 'error') {
      throw new Error(`Cannot start stream in ${this.state} state`);
    }

    this.state = 'streaming';
    this.startTime = Date.now();
    this.lastChunkTime = this.startTime;
    this.totalPausedTime = 0;
    this.abortController = new AbortController();

    this.progress = {
      bytes: 0,
      tokens: 0,
      chunks: 0,
      percentage: 0,
    };

    this.notifyStateChange();
  }

  /**
   * Pause streaming operation
   *
   * Stream can be resumed with resume()
   */
  pause(): void {
    if (this.state !== 'streaming') {
      throw new Error(`Cannot pause stream in ${this.state} state`);
    }

    this.state = 'paused';
    this.pauseStartTime = Date.now();
    this.notifyStateChange();
  }

  /**
   * Resume paused streaming operation
   */
  resume(): void {
    if (this.state !== 'paused') {
      throw new Error(`Cannot resume stream in ${this.state} state`);
    }

    this.totalPausedTime += Date.now() - this.pauseStartTime;
    this.state = 'streaming';
    this.notifyStateChange();

    // Resolve any waiting pause promise
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
    }
  }

  /**
   * Cancel streaming operation
   *
   * Stream cannot be resumed after cancellation
   */
  cancel(): void {
    if (this.state === 'idle' || this.state === 'completed' || this.state === 'cancelled') {
      return;
    }

    this.state = 'cancelled';
    if (this.abortController) {
      this.abortController.abort();
    }
    this.notifyStateChange();

    // Resolve any waiting pause promise
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
    }
  }

  /**
   * Mark stream as completed
   */
  complete(): void {
    if (this.state === 'cancelled') {
      return;
    }

    this.state = 'completed';
    this.progress.percentage = 100;
    this.notifyStateChange();
    this.notifyProgress();
  }

  /**
   * Mark stream as error
   */
  error(): void {
    this.state = 'error';
    this.notifyStateChange();
  }

  /**
   * Get current stream progress
   */
  getProgress(): StreamProgress {
    if (this.config.trackProgress) {
      this.updateProgressMetrics();
    }
    return { ...this.progress };
  }

  /**
   * Get current stream state
   */
  getState(): StreamState {
    return this.state;
  }

  /**
   * Check if stream is actively streaming
   */
  isStreaming(): boolean {
    return this.state === 'streaming';
  }

  /**
   * Check if stream is paused
   */
  isPaused(): boolean {
    return this.state === 'paused';
  }

  /**
   * Check if stream is cancelled
   */
  isCancelled(): boolean {
    return this.state === 'cancelled';
  }

  /**
   * Check if stream is completed
   */
  isCompleted(): boolean {
    return this.state === 'completed';
  }

  /**
   * Get abort signal for fetch requests
   */
  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }

  /**
   * Wait while paused
   *
   * This method returns a promise that resolves when the stream is resumed or cancelled
   */
  async waitWhilePaused(): Promise<void> {
    if (this.state !== 'paused') {
      return;
    }

    return new Promise((resolve) => {
      this.pauseResolve = resolve;
    });
  }

  /**
   * Update progress with new chunk data
   */
  updateProgress(bytes: number, tokens: number): void {
    if (!this.config.trackProgress) {
      return;
    }

    this.progress.bytes += bytes;
    this.progress.tokens += tokens;
    this.progress.chunks += 1;
    this.lastChunkTime = Date.now();

    this.updateProgressMetrics();
    this.notifyProgress();
  }

  /**
   * Set total expected tokens for percentage calculation
   */
  setExpectedTokens(expectedTokens: number): void {
    if (expectedTokens > 0) {
      this.progress.percentage = Math.min(100, (this.progress.tokens / expectedTokens) * 100);
    }
  }

  /**
   * Reset controller to idle state
   */
  reset(): void {
    this.state = 'idle';
    this.progress = {
      bytes: 0,
      tokens: 0,
      chunks: 0,
      percentage: 0,
    };
    this.startTime = 0;
    this.lastChunkTime = 0;
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
    this.abortController = null;
    this.pauseResolve = null;
    this.notifyStateChange();
  }

  /**
   * Update progress metrics (rate, estimated time)
   */
  private updateProgressMetrics(): void {
    const now = Date.now();
    const elapsedTime = now - this.startTime - this.totalPausedTime;

    if (elapsedTime > 0) {
      // Calculate average rate in tokens per second
      this.progress.avgRate = (this.progress.tokens / elapsedTime) * 1000;

      // Estimate remaining time if we have percentage
      if (this.progress.percentage > 0 && this.progress.percentage < 100) {
        const remainingPercentage = 100 - this.progress.percentage;
        const estimatedTotalTime = (elapsedTime / this.progress.percentage) * 100;
        this.progress.estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsedTime);
      }
    }
  }

  /**
   * Notify state change callback
   */
  private notifyStateChange(): void {
    if (this.config.onStateChange) {
      this.config.onStateChange(this.state);
    }
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(): void {
    if (this.config.onProgress) {
      this.config.onProgress(this.getProgress());
    }
  }
}
