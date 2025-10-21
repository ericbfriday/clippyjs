/**
 * Queue implementation for managing animations and actions
 */

type QueueFunction = (complete: () => void) => void;

export class Queue {
  private queue: QueueFunction[] = [];
  private active = false;
  private onEmptyCallback: (() => void) | undefined;

  constructor(onEmptyCallback?: () => void) {
    this.onEmptyCallback = onEmptyCallback;
  }

  /**
   * Add a function to the queue
   */
  public enqueue(func: QueueFunction): void {
    this.queue.push(func);

    if (this.queue.length === 1 && !this.active) {
      this.progressQueue();
    }
  }

  /**
   * Clear the queue
   */
  public clear(): void {
    this.queue = [];
    this.active = false;
  }

  /**
   * Process the next item in the queue
   */
  public next(): void {
    this.active = false;
    this.progressQueue();
  }

  /**
   * Get the current queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is active
   */
  public isActive(): boolean {
    return this.active;
  }

  /**
   * Process the queue
   */
  private progressQueue(): void {
    // Stop if nothing left in queue
    if (!this.queue.length) {
      if (this.onEmptyCallback) {
        this.onEmptyCallback();
      }
      return;
    }

    const func = this.queue.shift();
    if (!func) return;

    this.active = true;

    // Execute function with completion callback
    const completeFunction = () => this.next();
    func(completeFunction);
  }
}