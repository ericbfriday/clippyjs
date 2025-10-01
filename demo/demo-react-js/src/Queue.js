/**
 * Queue implementation for managing animations and actions
 */
export class Queue {
    constructor(onEmptyCallback) {
        this.queue = [];
        this.active = false;
        this.onEmptyCallback = onEmptyCallback;
    }
    /**
     * Add a function to the queue
     */
    enqueue(func) {
        this.queue.push(func);
        if (this.queue.length === 1 && !this.active) {
            this.progressQueue();
        }
    }
    /**
     * Clear the queue
     */
    clear() {
        this.queue = [];
        this.active = false;
    }
    /**
     * Process the next item in the queue
     */
    next() {
        this.active = false;
        this.progressQueue();
    }
    /**
     * Get the current queue size
     */
    size() {
        return this.queue.length;
    }
    /**
     * Check if queue is active
     */
    isActive() {
        return this.active;
    }
    /**
     * Process the queue
     */
    progressQueue() {
        // Stop if nothing left in queue
        if (!this.queue.length) {
            if (this.onEmptyCallback) {
                this.onEmptyCallback();
            }
            return;
        }
        const func = this.queue.shift();
        if (!func)
            return;
        this.active = true;
        // Execute function with completion callback
        const completeFunction = () => this.next();
        func(completeFunction);
    }
}
