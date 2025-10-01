/**
 * Agent class representing a Clippy character
 */
import { Queue } from './Queue';
import { Animator } from './Animator';
import { Balloon } from './Balloon';
export class Agent {
    constructor(path, data, sounds, options) {
        this.hidden = false;
        this.handleResize = () => {
            this.reposition();
        };
        this.path = path;
        // Create agent element
        this.element = document.createElement('div');
        this.element.className = 'clippy';
        this.element.style.display = 'none';
        this.element.style.position = 'fixed';
        this.element.style.zIndex = '9999';
        document.body.appendChild(this.element);
        // Initialize components
        this.queue = new Queue(() => this.onQueueEmpty());
        this.animator = new Animator(this.element, path, data, sounds);
        this.balloon = new Balloon(this.element);
        // Set up event handlers
        this.setupEvents(options);
    }
    /**
     * Show the agent with optional animation
     */
    async show(fast = false) {
        this.hidden = false;
        if (fast) {
            this.element.style.display = 'block';
            this.resume();
            this.onQueueEmpty();
            return Promise.resolve();
        }
        // Position the agent if not already positioned
        if (this.element.style.top === 'auto' || this.element.style.left === 'auto') {
            const left = window.innerWidth * 0.8;
            const top = (window.innerHeight + window.scrollY) * 0.8;
            this.element.style.left = `${left}px`;
            this.element.style.top = `${top}px`;
        }
        this.element.style.display = 'block';
        this.resume();
        return this.play('Show');
    }
    /**
     * Hide the agent with optional animation
     */
    async hide(fast = false) {
        this.hidden = true;
        this.stop();
        if (fast) {
            this.element.style.display = 'none';
            this.pause();
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.playInternal('Hide', (name, state) => {
                if (state === Animator.States.EXITED) {
                    this.element.style.display = 'none';
                    this.pause();
                    resolve();
                }
            });
        });
    }
    /**
     * Play an animation
     */
    play(animation, timeout = 5000) {
        if (!this.hasAnimation(animation)) {
            return Promise.reject(new Error(`Animation "${animation}" not found`));
        }
        return new Promise((resolve) => {
            this.queue.enqueue((complete) => {
                let completed = false;
                const callback = (name, state) => {
                    if (state === Animator.States.EXITED) {
                        completed = true;
                        resolve();
                        complete();
                    }
                };
                // Set timeout if specified
                if (timeout) {
                    window.setTimeout(() => {
                        if (completed)
                            return;
                        this.animator.exitAnimation();
                    }, timeout);
                }
                this.playInternal(animation, callback);
            });
        });
    }
    /**
     * Speak text in a balloon
     */
    speak(text, hold = false) {
        return new Promise((resolve) => {
            this.queue.enqueue(async (complete) => {
                await this.balloon.speak(text, hold);
                complete();
                resolve();
            });
        });
    }
    /**
     * Close the current balloon
     */
    closeBalloon() {
        this.balloon.hide();
    }
    /**
     * Move to a position
     */
    moveTo(x, y, duration = 1000) {
        const direction = this.getDirection(x, y);
        const animation = `Move${direction}`;
        return new Promise((resolve) => {
            this.queue.enqueue((complete) => {
                // Simple case - instant move
                if (duration === 0) {
                    this.element.style.left = `${x}px`;
                    this.element.style.top = `${y}px`;
                    this.reposition();
                    complete();
                    resolve();
                    return;
                }
                // No animation available - use CSS transition
                if (!this.hasAnimation(animation)) {
                    this.animatePosition(x, y, duration, () => {
                        complete();
                        resolve();
                    });
                    return;
                }
                // Use animation
                const callback = (name, state) => {
                    if (state === Animator.States.EXITED) {
                        complete();
                        resolve();
                    }
                    else if (state === Animator.States.WAITING) {
                        this.animatePosition(x, y, duration, () => {
                            this.animator.exitAnimation();
                        });
                    }
                };
                this.playInternal(animation, callback);
            });
        });
    }
    /**
     * Gesture at a position
     */
    async gestureAt(x, y) {
        const direction = this.getDirection(x, y);
        const gestureAnim = `Gesture${direction}`;
        const lookAnim = `Look${direction}`;
        const animation = this.hasAnimation(gestureAnim) ? gestureAnim : lookAnim;
        return this.play(animation);
    }
    /**
     * Play a random animation
     */
    async animate() {
        const animations = this.getAnimations();
        const nonIdleAnimations = animations.filter(a => !a.startsWith('Idle'));
        if (nonIdleAnimations.length === 0) {
            return Promise.resolve();
        }
        const randomAnimation = nonIdleAnimations[Math.floor(Math.random() * nonIdleAnimations.length)];
        return this.play(randomAnimation);
    }
    /**
     * Add delay to the queue
     */
    delay(time = 250) {
        return new Promise((resolve) => {
            this.queue.enqueue((complete) => {
                this.onQueueEmpty();
                window.setTimeout(() => {
                    complete();
                    resolve();
                }, time);
            });
        });
    }
    /**
     * Stop all current animations
     */
    stop() {
        this.queue.clear();
        this.animator.exitAnimation();
        this.balloon.hide();
    }
    /**
     * Stop current animation/action
     */
    stopCurrent() {
        this.animator.exitAnimation();
        this.balloon.close();
    }
    /**
     * Pause animations
     */
    pause() {
        this.animator.pause();
        this.balloon.pause();
    }
    /**
     * Resume animations
     */
    resume() {
        this.animator.resume();
        this.balloon.resume();
    }
    /**
     * Check if animation exists
     */
    hasAnimation(name) {
        return this.animator.hasAnimation(name);
    }
    /**
     * Get list of available animations
     */
    getAnimations() {
        return this.animator.getAnimations();
    }
    /**
     * Reposition to stay in viewport
     */
    reposition() {
        if (!this.isVisible())
            return;
        const rect = this.element.getBoundingClientRect();
        const margin = 5;
        let { top, left } = rect;
        // Adjust position to stay in viewport
        if (top - margin < 0) {
            top = margin;
        }
        else if (top + rect.height + margin > window.innerHeight) {
            top = window.innerHeight - rect.height - margin;
        }
        if (left - margin < 0) {
            left = margin;
        }
        else if (left + rect.width + margin > window.innerWidth) {
            left = window.innerWidth - rect.width - margin;
        }
        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
        // Reposition balloon
        this.balloon.reposition();
    }
    /**
     * Destroy the agent and clean up
     */
    destroy() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
        this.element.remove();
        this.animator.destroy();
        this.balloon.destroy();
    }
    // Private methods
    setupEvents(options) {
        // Window resize
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        // Mouse events
        this.element.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.element.addEventListener('dblclick', () => this.onDoubleClick(options));
    }
    onMouseDown(e) {
        e.preventDefault();
        this.startDrag(e);
    }
    onDoubleClick(options) {
        if (options?.onDoubleClick) {
            options.onDoubleClick();
        }
        else if (!this.play('ClickedOn')) {
            this.animate();
        }
    }
    startDrag(e) {
        this.pause();
        this.balloon.hide(true);
        const rect = this.element.getBoundingClientRect();
        this.dragOffset = {
            top: e.clientY - rect.top,
            left: e.clientX - rect.left
        };
        this.moveHandler = (e) => this.dragMove(e);
        this.upHandler = () => this.finishDrag();
        window.addEventListener('mousemove', this.moveHandler);
        window.addEventListener('mouseup', this.upHandler);
        this.updateDragPosition();
    }
    dragMove(e) {
        e.preventDefault();
        if (!this.dragOffset)
            return;
        this.targetX = e.clientX - this.dragOffset.left;
        this.targetY = e.clientY - this.dragOffset.top;
    }
    updateDragPosition() {
        if (this.targetX !== undefined && this.targetY !== undefined) {
            this.element.style.left = `${this.targetX}px`;
            this.element.style.top = `${this.targetY}px`;
        }
        this.dragUpdateLoop = window.setTimeout(() => this.updateDragPosition(), 10);
    }
    finishDrag() {
        if (this.dragUpdateLoop) {
            window.clearTimeout(this.dragUpdateLoop);
        }
        if (this.moveHandler && this.upHandler) {
            window.removeEventListener('mousemove', this.moveHandler);
            window.removeEventListener('mouseup', this.upHandler);
        }
        this.balloon.show();
        this.reposition();
        this.resume();
    }
    playInternal(animation, callback) {
        // If in idle animation, wait for it to complete
        if (this.isIdleAnimation() && this.idleDeferred) {
            this.idleDeferred.then(() => {
                this.playInternal(animation, callback);
            });
            return;
        }
        this.animator.showAnimation(animation, callback);
    }
    onQueueEmpty() {
        if (this.hidden || this.isIdleAnimation())
            return;
        const idleAnimation = this.getIdleAnimation();
        this.idleDeferred = new Promise((resolve) => {
            this.idleResolve = resolve;
        });
        this.animator.showAnimation(idleAnimation, (name, state) => {
            if (state === Animator.States.EXITED && this.idleResolve) {
                this.idleResolve();
                this.idleDeferred = undefined;
                this.idleResolve = undefined;
            }
        });
    }
    isIdleAnimation() {
        const current = this.animator.currentAnimationName;
        return !!current && current.startsWith('Idle');
    }
    getIdleAnimation() {
        const animations = this.getAnimations();
        const idleAnimations = animations.filter(a => a.startsWith('Idle'));
        if (idleAnimations.length === 0) {
            return animations[0] || 'Idle1';
        }
        return idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
    }
    getDirection(x, y) {
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const a = centerY - y;
        const b = centerX - x;
        const angle = Math.round((180 * Math.atan2(a, b)) / Math.PI);
        if (-45 <= angle && angle < 45)
            return 'Right';
        if (45 <= angle && angle < 135)
            return 'Up';
        if ((135 <= angle && angle <= 180) || (-180 <= angle && angle < -135))
            return 'Left';
        if (-135 <= angle && angle < -45)
            return 'Down';
        return 'Up'; // Default
    }
    animatePosition(x, y, duration, callback) {
        const startX = parseInt(this.element.style.left) || 0;
        const startY = parseInt(this.element.style.top) || 0;
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentX = startX + (x - startX) * progress;
            const currentY = startY + (y - startY) * progress;
            this.element.style.left = `${currentX}px`;
            this.element.style.top = `${currentY}px`;
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
            else {
                callback();
            }
        };
        animate();
    }
    isVisible() {
        return this.element.style.display !== 'none';
    }
}
