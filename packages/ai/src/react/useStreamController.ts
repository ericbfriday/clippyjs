import { useEffect, useRef, useState, useCallback } from 'react';
import { StreamController, type StreamProgress, type StreamState } from '../streaming/StreamController';
import { StreamMonitor, type StreamMetrics } from '../streaming/StreamMonitor';

/**
 * Hook result for stream control
 */
export interface UseStreamControllerResult {
  /** Stream controller instance */
  controller: StreamController;
  /** Stream monitor instance */
  monitor: StreamMonitor;
  /** Current stream state */
  state: StreamState;
  /** Current stream progress */
  progress: StreamProgress;
  /** Current stream metrics */
  metrics: StreamMetrics;
  /** Pause streaming */
  pause: () => void;
  /** Resume streaming */
  resume: () => void;
  /** Cancel streaming */
  cancel: () => void;
  /** Check if streaming */
  isStreaming: boolean;
  /** Check if paused */
  isPaused: boolean;
  /** Check if cancelled */
  isCancelled: boolean;
  /** Check if completed */
  isCompleted: boolean;
}

/**
 * Hook for controlling streaming operations
 *
 * Provides access to StreamController and StreamMonitor for managing
 * streaming behavior with pause/resume, cancellation, and progress tracking.
 *
 * Features:
 * - Pause/resume streaming mid-flight
 * - Cancel streaming operations
 * - Track progress (bytes, tokens, chunks, percentage)
 * - Monitor performance metrics (rates, timing)
 * - React to state changes
 *
 * Usage:
 * ```tsx
 * function StreamingComponent() {
 *   const {
 *     pause,
 *     resume,
 *     cancel,
 *     progress,
 *     metrics,
 *     isStreaming,
 *     isPaused,
 *   } = useStreamController();
 *
 *   return (
 *     <div>
 *       <div>Progress: {progress.percentage}%</div>
 *       <div>Rate: {metrics.currentRate} tokens/sec</div>
 *
 *       {isStreaming && (
 *         <button onClick={pause}>Pause</button>
 *       )}
 *
 *       {isPaused && (
 *         <button onClick={resume}>Resume</button>
 *       )}
 *
 *       <button onClick={cancel}>Cancel</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStreamController(): UseStreamControllerResult {
  // Create controller and monitor once
  const controllerRef = useRef<StreamController | null>(null);
  const monitorRef = useRef<StreamMonitor | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new StreamController({
      trackProgress: true,
    });
  }

  if (!monitorRef.current) {
    monitorRef.current = new StreamMonitor({
      detailedMetrics: true,
    });
  }

  const controller = controllerRef.current;
  const monitor = monitorRef.current;

  // Track state and metrics in React state
  const [state, setState] = useState<StreamState>(controller.getState());
  const [progress, setProgress] = useState<StreamProgress>(controller.getProgress());
  const [metrics, setMetrics] = useState<StreamMetrics>(monitor.getMetrics());

  // Update state when controller state changes
  useEffect(() => {
    const originalOnStateChange = controller['config'].onStateChange;

    controller['config'].onStateChange = (newState: StreamState) => {
      setState(newState);

      // Sync monitor state with controller
      if (newState === 'paused') {
        monitor.pause();
      } else if (newState === 'streaming' && monitor.isActive()) {
        monitor.resume();
      } else if (newState === 'idle' || newState === 'completed' || newState === 'error') {
        monitor.stop();
      }

      if (originalOnStateChange) {
        originalOnStateChange(newState);
      }
    };

    return () => {
      controller['config'].onStateChange = originalOnStateChange;
    };
  }, [controller, monitor]);

  // Update progress when controller progress changes
  useEffect(() => {
    const originalOnProgress = controller['config'].onProgress;

    controller['config'].onProgress = (newProgress: StreamProgress) => {
      setProgress(newProgress);

      if (originalOnProgress) {
        originalOnProgress(newProgress);
      }
    };

    return () => {
      controller['config'].onProgress = originalOnProgress;
    };
  }, [controller]);

  // Update metrics when monitor metrics change
  useEffect(() => {
    const originalOnMetricsUpdate = monitor['config'].onMetricsUpdate;

    monitor['config'].onMetricsUpdate = (newMetrics: StreamMetrics) => {
      setMetrics(newMetrics);

      if (originalOnMetricsUpdate) {
        originalOnMetricsUpdate(newMetrics);
      }
    };

    return () => {
      monitor['config'].onMetricsUpdate = originalOnMetricsUpdate;
    };
  }, [monitor]);

  // Control functions
  const pause = useCallback(() => {
    try {
      controller.pause();
    } catch (error) {
      console.error('Failed to pause stream:', error);
    }
  }, [controller]);

  const resume = useCallback(() => {
    try {
      controller.resume();
    } catch (error) {
      console.error('Failed to resume stream:', error);
    }
  }, [controller]);

  const cancel = useCallback(() => {
    try {
      controller.cancel();
    } catch (error) {
      console.error('Failed to cancel stream:', error);
    }
  }, [controller]);

  // Derived state
  const isStreaming = state === 'streaming';
  const isPaused = state === 'paused';
  const isCancelled = state === 'cancelled';
  const isCompleted = state === 'completed';

  return {
    controller,
    monitor,
    state,
    progress,
    metrics,
    pause,
    resume,
    cancel,
    isStreaming,
    isPaused,
    isCancelled,
    isCompleted,
  };
}
