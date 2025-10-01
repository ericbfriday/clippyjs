import require$$0, { createContext, useState, useEffect, useContext, useRef } from 'react';

/**
 * Queue implementation for managing animations and actions
 */
class Queue {
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

/**
 * Animator class for handling sprite animations
 */
class Animator {
    constructor(element, path, data, sounds) {
        this.sounds = {};
        this.overlays = [];
        this.currentFrameIndex = 0;
        this.exiting = false;
        this.started = false;
        this.paused = false;
        this.element = element;
        this.data = data;
        this.path = path;
        this.preloadSounds(sounds);
        this.setupElements();
    }
    /**
     * Set up the DOM elements for animation layers
     */
    setupElements() {
        this.overlays = [this.element];
        let currentElement = this.element;
        this.setupElementStyle(this.element);
        // Create overlay elements for multi-layer animations
        for (let i = 1; i < this.data.overlayCount; i++) {
            const innerElement = document.createElement('div');
            this.setupElementStyle(innerElement);
            currentElement.appendChild(innerElement);
            this.overlays.push(innerElement);
            currentElement = innerElement;
        }
    }
    /**
     * Set up styling for an animation element
     */
    setupElementStyle(element) {
        const [width, height] = this.data.framesize;
        element.style.display = 'none';
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        element.style.background = `url('${this.path}/map.png') no-repeat`;
    }
    /**
     * Preload sound files
     */
    preloadSounds(sounds) {
        for (const soundName of this.data.sounds) {
            const uri = sounds[soundName];
            if (uri) {
                this.sounds[soundName] = new Audio(uri);
            }
        }
    }
    /**
     * Get list of available animations
     */
    getAnimations() {
        return Object.keys(this.data.animations);
    }
    /**
     * Check if an animation exists
     */
    hasAnimation(name) {
        return !!this.data.animations[name];
    }
    /**
     * Start showing an animation
     */
    showAnimation(animationName, stateChangeCallback) {
        this.exiting = false;
        if (!this.hasAnimation(animationName)) {
            return false;
        }
        this.currentAnimation = this.data.animations[animationName];
        this.currentAnimationName = animationName;
        if (!this.started) {
            this.step();
            this.started = true;
        }
        this.currentFrameIndex = 0;
        this.currentFrame = undefined;
        this.endCallback = stateChangeCallback;
        return true;
    }
    /**
     * Exit the current animation
     */
    exitAnimation() {
        this.exiting = true;
    }
    /**
     * Pause the animation
     */
    pause() {
        this.paused = true;
        if (this.loop) {
            window.clearTimeout(this.loop);
            this.loop = undefined;
        }
    }
    /**
     * Resume the animation
     */
    resume() {
        this.paused = false;
        if (this.currentAnimation) {
            this.step();
        }
    }
    /**
     * Main animation loop step
     */
    step() {
        if (!this.currentAnimation || this.paused)
            return;
        const newFrameIndex = Math.min(this.getNextAnimationFrame(), this.currentAnimation.frames.length - 1);
        const frameChanged = !this.currentFrame || this.currentFrameIndex !== newFrameIndex;
        this.currentFrameIndex = newFrameIndex;
        // Always switch frame data, unless at last frame with useExitBranching flag
        if (!(this.atLastFrame() && this.currentAnimation.useExitBranching)) {
            this.currentFrame = this.currentAnimation.frames[this.currentFrameIndex];
        }
        this.draw();
        this.playSound();
        if (this.currentFrame) {
            this.loop = window.setTimeout(() => this.step(), this.currentFrame.duration);
        }
        // Fire events if frames changed and we reached an end
        if (this.endCallback && frameChanged && this.atLastFrame()) {
            if (this.currentAnimation.useExitBranching && !this.exiting) {
                this.endCallback(this.currentAnimationName, Animator.States.WAITING);
            }
            else {
                this.endCallback(this.currentAnimationName, Animator.States.EXITED);
            }
        }
    }
    /**
     * Get the next animation frame index
     */
    getNextAnimationFrame() {
        if (!this.currentAnimation)
            return 0;
        if (!this.currentFrame)
            return 0;
        const currentFrame = this.currentFrame;
        const branching = currentFrame.branching;
        if (this.exiting && currentFrame.exitBranch !== undefined) {
            return currentFrame.exitBranch;
        }
        else if (branching) {
            let rnd = Math.random() * 100;
            for (const branch of branching.branches) {
                if (rnd <= branch.weight) {
                    return branch.frameIndex;
                }
                rnd -= branch.weight;
            }
        }
        return this.currentFrameIndex + 1;
    }
    /**
     * Draw the current frame
     */
    draw() {
        const images = this.currentFrame?.images || [];
        for (let i = 0; i < this.overlays.length; i++) {
            if (i < images.length) {
                const [x, y] = images[i];
                const backgroundPosition = `-${x}px -${y}px`;
                this.overlays[i].style.backgroundPosition = backgroundPosition;
                this.overlays[i].style.display = 'block';
            }
            else {
                this.overlays[i].style.display = 'none';
            }
        }
    }
    /**
     * Play the current frame's sound
     */
    playSound() {
        if (!this.currentFrame?.sound)
            return;
        const soundName = this.currentFrame.sound;
        if (typeof soundName === 'string') {
            const audio = this.sounds[soundName];
            if (audio) {
                audio.play().catch(() => {
                    // Ignore audio play errors (browser autoplay policies)
                });
            }
        }
    }
    /**
     * Check if at last frame of animation
     */
    atLastFrame() {
        if (!this.currentAnimation)
            return false;
        return this.currentFrameIndex >= this.currentAnimation.frames.length - 1;
    }
    /**
     * Destroy the animator and clean up
     */
    destroy() {
        this.pause();
        this.overlays = [];
        this.sounds = {};
    }
}
Animator.States = {
    WAITING: 'WAITING',
    EXITED: 'EXITED',
    PLAYING: 'PLAYING',
};

/**
 * Balloon component for displaying speech bubbles
 */
class Balloon {
    constructor(targetEl) {
        this.hidden = true;
        this.active = false;
        this.hold = false;
        this.WORD_SPEAK_TIME = 200;
        this.CLOSE_BALLOON_DELAY = 2000;
        this.BALLOON_MARGIN = 15;
        this.targetEl = targetEl;
        this.balloonEl = this.createBalloonElement();
        this.contentEl = this.balloonEl.querySelector(".clippy-content");
        this.tipEl = this.balloonEl.querySelector(".clippy-tip");
        document.body.appendChild(this.balloonEl);
    }
    /**
     * Create the balloon DOM element
     */
    createBalloonElement() {
        const balloon = document.createElement("div");
        balloon.className = "clippy-balloon";
        balloon.style.display = "none";
        const tip = document.createElement("div");
        tip.className = "clippy-tip";
        const content = document.createElement("div");
        content.className = "clippy-content";
        balloon.appendChild(tip);
        balloon.appendChild(content);
        return balloon;
    }
    /**
     * Speak text with animation (returns Promise)
     */
    speak(text, hold = false) {
        return new Promise((resolve) => {
            this.hidden = false;
            this.show();
            // Set height to auto to measure
            this.contentEl.style.height = "auto";
            this.contentEl.style.width = "auto";
            // Add the text to measure
            this.contentEl.textContent = text;
            // Set fixed dimensions
            const height = this.contentEl.offsetHeight;
            const width = this.contentEl.offsetWidth;
            this.contentEl.style.height = `${height}px`;
            this.contentEl.style.width = `${width}px`;
            // Clear text for animation
            this.contentEl.textContent = "";
            this.reposition();
            this.completeCallback = resolve;
            this.sayWords(text, hold);
        });
    }
    /**
     * Show the balloon
     */
    show() {
        if (this.hidden)
            return;
        this.balloonEl.style.display = "block";
    }
    /**
     * Hide the balloon
     */
    hide(immediately = false) {
        if (immediately) {
            this.balloonEl.style.display = "none";
            this.hidden = true;
            return;
        }
        this.hidingTimeout = window.setTimeout(() => {
            this.finishHideBalloon();
        }, this.CLOSE_BALLOON_DELAY);
    }
    /**
     * Close the balloon
     */
    close() {
        if (this.active) {
            this.hold = false;
        }
        else if (this.hold && this.completeCallback) {
            this.completeCallback();
        }
    }
    /**
     * Pause the balloon animation
     */
    pause() {
        if (this.wordTimeout) {
            window.clearTimeout(this.wordTimeout);
        }
        if (this.hidingTimeout) {
            window.clearTimeout(this.hidingTimeout);
            this.hidingTimeout = undefined;
        }
    }
    /**
     * Resume the balloon animation
     */
    resume() {
        if (this.active) {
            this.addWord && this.addWord();
        }
        else if (!this.hold && !this.hidden) {
            this.hidingTimeout = window.setTimeout(() => {
                this.finishHideBalloon();
            }, this.CLOSE_BALLOON_DELAY);
        }
    }
    /**
     * Reposition the balloon relative to target element
     */
    reposition() {
        const positions = [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
        ];
        for (const position of positions) {
            this.position(position);
            if (!this.isOutOfBounds())
                break;
        }
    }
    /**
     * Position the balloon at a specific location
     */
    position(side) {
        const rect = this.targetEl.getBoundingClientRect();
        const balloonHeight = this.balloonEl.offsetHeight;
        const balloonWidth = this.balloonEl.offsetWidth;
        // Remove all position classes
        this.balloonEl.classList.remove("clippy-top-left", "clippy-top-right", "clippy-bottom-left", "clippy-bottom-right");
        let left = 0;
        let top = 0;
        switch (side) {
            case "top-left":
                left = rect.left + rect.width - balloonWidth;
                top = rect.top - balloonHeight - this.BALLOON_MARGIN;
                break;
            case "top-right":
                left = rect.left;
                top = rect.top - balloonHeight - this.BALLOON_MARGIN;
                break;
            case "bottom-right":
                left = rect.left;
                top = rect.top + rect.height + this.BALLOON_MARGIN;
                break;
            case "bottom-left":
                left = rect.left + rect.width - balloonWidth;
                top = rect.top + rect.height + this.BALLOON_MARGIN;
                break;
        }
        this.balloonEl.style.top = `${top}px`;
        this.balloonEl.style.left = `${left}px`;
        this.balloonEl.classList.add(`clippy-${side}`);
    }
    /**
     * Check if balloon is out of viewport bounds
     */
    isOutOfBounds() {
        const rect = this.balloonEl.getBoundingClientRect();
        const margin = 5;
        if (rect.top - margin < 0 || rect.left - margin < 0) {
            return true;
        }
        return (rect.bottom + margin > window.innerHeight ||
            rect.right + margin > window.innerWidth);
    }
    /**
     * Animate the words appearing in the balloon
     */
    sayWords(text, hold) {
        this.active = true;
        this.hold = hold;
        const words = text.split(/\s+/);
        let currentIndex = 0;
        const addNextWord = () => {
            if (!this.active)
                return;
            if (currentIndex >= words.length) {
                this.active = false;
                if (!this.hold) {
                    if (this.completeCallback) {
                        this.completeCallback();
                    }
                    this.hide();
                }
            }
            else {
                this.contentEl.textContent = words.slice(0, currentIndex + 1).join(" ");
                currentIndex++;
                this.wordTimeout = window.setTimeout(addNextWord, this.WORD_SPEAK_TIME);
            }
        };
        this.addWord = addNextWord;
        addNextWord();
    }
    /**
     * Complete hiding the balloon
     */
    finishHideBalloon() {
        if (this.active)
            return;
        this.balloonEl.style.display = "none";
        this.hidden = true;
        this.hidingTimeout = undefined;
    }
    /**
     * Destroy the balloon and clean up
     */
    destroy() {
        if (this.hidingTimeout) {
            window.clearTimeout(this.hidingTimeout);
        }
        if (this.wordTimeout) {
            window.clearTimeout(this.wordTimeout);
        }
        this.balloonEl.remove();
    }
}

/**
 * Agent class representing a Clippy character
 */
class Agent {
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

/**
 * Modern Promise-based loader for Clippy agents
 */
// Global registry for loaded data
const loadedMaps = new Map();
const loadedSounds = new Map();
const loadedData = new Map();
// Callbacks for JSONP-style loading
const dataCallbacks = new Map();
const soundCallbacks = new Map();
/**
 * Load a Clippy agent
 */
async function load(name, options) {
    const basePath = options?.basePath ||
        window.CLIPPY_CDN ||
        'https://gitcdn.xyz/repo/pi0/clippyjs/master/assets/agents/';
    const path = `${basePath}${name}`;
    // Load all resources in parallel
    const [, agentData, sounds] = await Promise.all([
        loadMap(path),
        loadAgentData(name, path),
        loadSounds(name, path)
    ]);
    return new Agent(path, agentData, sounds);
}
/**
 * Load the sprite map image
 */
async function loadMap(path) {
    // Check if already loading/loaded
    const existing = loadedMaps.get(path);
    if (existing)
        return existing;
    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load map: ${path}/map.png`));
        img.src = `${path}/map.png`;
    });
    loadedMaps.set(path, promise);
    return promise;
}
/**
 * Load agent animation data
 */
async function loadAgentData(name, path) {
    // Check if already loading/loaded
    const existing = loadedData.get(name);
    if (existing)
        return existing;
    const promise = new Promise((resolve, reject) => {
        // Set up callback for JSONP-style loading
        dataCallbacks.set(name, resolve);
        // Create and load script
        const script = document.createElement('script');
        script.src = `${path}/agent.js`;
        script.async = true;
        script.onerror = () => {
            dataCallbacks.delete(name);
            reject(new Error(`Failed to load agent data: ${path}/agent.js`));
        };
        document.head.appendChild(script);
    });
    loadedData.set(name, promise);
    return promise;
}
/**
 * Load agent sounds
 */
async function loadSounds(name, path) {
    // Check if already loading/loaded
    const existing = loadedSounds.get(name);
    if (existing)
        return existing;
    const promise = new Promise((resolve, reject) => {
        // Check audio support
        const audio = document.createElement('audio');
        const canPlayMp3 = !!audio.canPlayType && audio.canPlayType('audio/mpeg') !== '';
        const canPlayOgg = !!audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"') !== '';
        if (!canPlayMp3 && !canPlayOgg) {
            resolve({});
            return;
        }
        // Set up callback for JSONP-style loading
        soundCallbacks.set(name, resolve);
        // Load appropriate sound format
        const soundFile = canPlayMp3 ? 'sounds-mp3.js' : 'sounds-ogg.js';
        const script = document.createElement('script');
        script.src = `${path}/${soundFile}`;
        script.async = true;
        script.onerror = () => {
            soundCallbacks.delete(name);
            // Don't reject on sound load failure, just return empty
            resolve({});
        };
        document.head.appendChild(script);
    });
    loadedSounds.set(name, promise);
    return promise;
}
/**
 * Called by agent.js files to provide data (JSONP-style)
 * This maintains backward compatibility with existing agent files
 */
function ready(name, data) {
    const callback = dataCallbacks.get(name);
    if (callback) {
        callback(data);
        dataCallbacks.delete(name);
    }
}
/**
 * Called by sounds-*.js files to provide sound data (JSONP-style)
 * This maintains backward compatibility with existing sound files
 */
function soundsReady(name, sounds) {
    const callback = soundCallbacks.get(name);
    if (callback) {
        callback(sounds);
        soundCallbacks.delete(name);
    }
}
// Expose ready functions globally for backward compatibility
if (typeof window !== 'undefined') {
    window.clippy = {
        ...(window.clippy || {}),
        ready,
        soundsReady
    };
}

var jsxRuntime = {exports: {}};

var reactJsxRuntime_production_min = {};

/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var hasRequiredReactJsxRuntime_production_min;

function requireReactJsxRuntime_production_min () {
	if (hasRequiredReactJsxRuntime_production_min) return reactJsxRuntime_production_min;
	hasRequiredReactJsxRuntime_production_min = 1;
var f=require$$0,k=Symbol.for("react.element"),l=Symbol.for("react.fragment"),m=Object.prototype.hasOwnProperty,n=f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,p={key:true,ref:true,__self:true,__source:true};
	function q(c,a,g){var b,d={},e=null,h=null;void 0!==g&&(e=""+g);void 0!==a.key&&(e=""+a.key);void 0!==a.ref&&(h=a.ref);for(b in a)m.call(a,b)&&!p.hasOwnProperty(b)&&(d[b]=a[b]);if(c&&c.defaultProps)for(b in a=c.defaultProps,a) void 0===d[b]&&(d[b]=a[b]);return {$$typeof:k,type:c,key:e,ref:h,props:d,_owner:n.current}}reactJsxRuntime_production_min.Fragment=l;reactJsxRuntime_production_min.jsx=q;reactJsxRuntime_production_min.jsxs=q;
	return reactJsxRuntime_production_min;
}

var reactJsxRuntime_development = {};

/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var hasRequiredReactJsxRuntime_development;

function requireReactJsxRuntime_development () {
	if (hasRequiredReactJsxRuntime_development) return reactJsxRuntime_development;
	hasRequiredReactJsxRuntime_development = 1;

	if (process.env.NODE_ENV !== "production") {
	  (function() {

	var React = require$$0;

	// ATTENTION
	// When adding new symbols to this file,
	// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
	// The Symbol used to tag the ReactElement-like types.
	var REACT_ELEMENT_TYPE = Symbol.for('react.element');
	var REACT_PORTAL_TYPE = Symbol.for('react.portal');
	var REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
	var REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
	var REACT_PROFILER_TYPE = Symbol.for('react.profiler');
	var REACT_PROVIDER_TYPE = Symbol.for('react.provider');
	var REACT_CONTEXT_TYPE = Symbol.for('react.context');
	var REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
	var REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
	var REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
	var REACT_MEMO_TYPE = Symbol.for('react.memo');
	var REACT_LAZY_TYPE = Symbol.for('react.lazy');
	var REACT_OFFSCREEN_TYPE = Symbol.for('react.offscreen');
	var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	var FAUX_ITERATOR_SYMBOL = '@@iterator';
	function getIteratorFn(maybeIterable) {
	  if (maybeIterable === null || typeof maybeIterable !== 'object') {
	    return null;
	  }

	  var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

	  if (typeof maybeIterator === 'function') {
	    return maybeIterator;
	  }

	  return null;
	}

	var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

	function error(format) {
	  {
	    {
	      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
	        args[_key2 - 1] = arguments[_key2];
	      }

	      printWarning('error', format, args);
	    }
	  }
	}

	function printWarning(level, format, args) {
	  // When changing this logic, you might want to also
	  // update consoleWithStackDev.www.js as well.
	  {
	    var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
	    var stack = ReactDebugCurrentFrame.getStackAddendum();

	    if (stack !== '') {
	      format += '%s';
	      args = args.concat([stack]);
	    } // eslint-disable-next-line react-internal/safe-string-coercion


	    var argsWithFormat = args.map(function (item) {
	      return String(item);
	    }); // Careful: RN currently depends on this prefix

	    argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
	    // breaks IE9: https://github.com/facebook/react/issues/13610
	    // eslint-disable-next-line react-internal/no-production-logging

	    Function.prototype.apply.call(console[level], console, argsWithFormat);
	  }
	}

	// -----------------------------------------------------------------------------

	var enableScopeAPI = false; // Experimental Create Event Handle API.
	var enableCacheElement = false;
	var enableTransitionTracing = false; // No known bugs, but needs performance testing

	var enableLegacyHidden = false; // Enables unstable_avoidThisFallback feature in Fiber
	// stuff. Intended to enable React core members to more easily debug scheduling
	// issues in DEV builds.

	var enableDebugTracing = false; // Track which Fiber(s) schedule render work.

	var REACT_MODULE_REFERENCE;

	{
	  REACT_MODULE_REFERENCE = Symbol.for('react.module.reference');
	}

	function isValidElementType(type) {
	  if (typeof type === 'string' || typeof type === 'function') {
	    return true;
	  } // Note: typeof might be other than 'symbol' or 'number' (e.g. if it's a polyfill).


	  if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing  || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden  || type === REACT_OFFSCREEN_TYPE || enableScopeAPI  || enableCacheElement  || enableTransitionTracing ) {
	    return true;
	  }

	  if (typeof type === 'object' && type !== null) {
	    if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
	    // types supported by any Flight configuration anywhere since
	    // we don't know which Flight build this will end up being used
	    // with.
	    type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== undefined) {
	      return true;
	    }
	  }

	  return false;
	}

	function getWrappedName(outerType, innerType, wrapperName) {
	  var displayName = outerType.displayName;

	  if (displayName) {
	    return displayName;
	  }

	  var functionName = innerType.displayName || innerType.name || '';
	  return functionName !== '' ? wrapperName + "(" + functionName + ")" : wrapperName;
	} // Keep in sync with react-reconciler/getComponentNameFromFiber


	function getContextName(type) {
	  return type.displayName || 'Context';
	} // Note that the reconciler package should generally prefer to use getComponentNameFromFiber() instead.


	function getComponentNameFromType(type) {
	  if (type == null) {
	    // Host root, text node or just invalid type.
	    return null;
	  }

	  {
	    if (typeof type.tag === 'number') {
	      error('Received an unexpected object in getComponentNameFromType(). ' + 'This is likely a bug in React. Please file an issue.');
	    }
	  }

	  if (typeof type === 'function') {
	    return type.displayName || type.name || null;
	  }

	  if (typeof type === 'string') {
	    return type;
	  }

	  switch (type) {
	    case REACT_FRAGMENT_TYPE:
	      return 'Fragment';

	    case REACT_PORTAL_TYPE:
	      return 'Portal';

	    case REACT_PROFILER_TYPE:
	      return 'Profiler';

	    case REACT_STRICT_MODE_TYPE:
	      return 'StrictMode';

	    case REACT_SUSPENSE_TYPE:
	      return 'Suspense';

	    case REACT_SUSPENSE_LIST_TYPE:
	      return 'SuspenseList';

	  }

	  if (typeof type === 'object') {
	    switch (type.$$typeof) {
	      case REACT_CONTEXT_TYPE:
	        var context = type;
	        return getContextName(context) + '.Consumer';

	      case REACT_PROVIDER_TYPE:
	        var provider = type;
	        return getContextName(provider._context) + '.Provider';

	      case REACT_FORWARD_REF_TYPE:
	        return getWrappedName(type, type.render, 'ForwardRef');

	      case REACT_MEMO_TYPE:
	        var outerName = type.displayName || null;

	        if (outerName !== null) {
	          return outerName;
	        }

	        return getComponentNameFromType(type.type) || 'Memo';

	      case REACT_LAZY_TYPE:
	        {
	          var lazyComponent = type;
	          var payload = lazyComponent._payload;
	          var init = lazyComponent._init;

	          try {
	            return getComponentNameFromType(init(payload));
	          } catch (x) {
	            return null;
	          }
	        }

	      // eslint-disable-next-line no-fallthrough
	    }
	  }

	  return null;
	}

	var assign = Object.assign;

	// Helpers to patch console.logs to avoid logging during side-effect free
	// replaying on render function. This currently only patches the object
	// lazily which won't cover if the log function was extracted eagerly.
	// We could also eagerly patch the method.
	var disabledDepth = 0;
	var prevLog;
	var prevInfo;
	var prevWarn;
	var prevError;
	var prevGroup;
	var prevGroupCollapsed;
	var prevGroupEnd;

	function disabledLog() {}

	disabledLog.__reactDisabledLog = true;
	function disableLogs() {
	  {
	    if (disabledDepth === 0) {
	      /* eslint-disable react-internal/no-production-logging */
	      prevLog = console.log;
	      prevInfo = console.info;
	      prevWarn = console.warn;
	      prevError = console.error;
	      prevGroup = console.group;
	      prevGroupCollapsed = console.groupCollapsed;
	      prevGroupEnd = console.groupEnd; // https://github.com/facebook/react/issues/19099

	      var props = {
	        configurable: true,
	        enumerable: true,
	        value: disabledLog,
	        writable: true
	      }; // $FlowFixMe Flow thinks console is immutable.

	      Object.defineProperties(console, {
	        info: props,
	        log: props,
	        warn: props,
	        error: props,
	        group: props,
	        groupCollapsed: props,
	        groupEnd: props
	      });
	      /* eslint-enable react-internal/no-production-logging */
	    }

	    disabledDepth++;
	  }
	}
	function reenableLogs() {
	  {
	    disabledDepth--;

	    if (disabledDepth === 0) {
	      /* eslint-disable react-internal/no-production-logging */
	      var props = {
	        configurable: true,
	        enumerable: true,
	        writable: true
	      }; // $FlowFixMe Flow thinks console is immutable.

	      Object.defineProperties(console, {
	        log: assign({}, props, {
	          value: prevLog
	        }),
	        info: assign({}, props, {
	          value: prevInfo
	        }),
	        warn: assign({}, props, {
	          value: prevWarn
	        }),
	        error: assign({}, props, {
	          value: prevError
	        }),
	        group: assign({}, props, {
	          value: prevGroup
	        }),
	        groupCollapsed: assign({}, props, {
	          value: prevGroupCollapsed
	        }),
	        groupEnd: assign({}, props, {
	          value: prevGroupEnd
	        })
	      });
	      /* eslint-enable react-internal/no-production-logging */
	    }

	    if (disabledDepth < 0) {
	      error('disabledDepth fell below zero. ' + 'This is a bug in React. Please file an issue.');
	    }
	  }
	}

	var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
	var prefix;
	function describeBuiltInComponentFrame(name, source, ownerFn) {
	  {
	    if (prefix === undefined) {
	      // Extract the VM specific prefix used by each line.
	      try {
	        throw Error();
	      } catch (x) {
	        var match = x.stack.trim().match(/\n( *(at )?)/);
	        prefix = match && match[1] || '';
	      }
	    } // We use the prefix to ensure our stacks line up with native stack frames.


	    return '\n' + prefix + name;
	  }
	}
	var reentry = false;
	var componentFrameCache;

	{
	  var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
	  componentFrameCache = new PossiblyWeakMap();
	}

	function describeNativeComponentFrame(fn, construct) {
	  // If something asked for a stack inside a fake render, it should get ignored.
	  if ( !fn || reentry) {
	    return '';
	  }

	  {
	    var frame = componentFrameCache.get(fn);

	    if (frame !== undefined) {
	      return frame;
	    }
	  }

	  var control;
	  reentry = true;
	  var previousPrepareStackTrace = Error.prepareStackTrace; // $FlowFixMe It does accept undefined.

	  Error.prepareStackTrace = undefined;
	  var previousDispatcher;

	  {
	    previousDispatcher = ReactCurrentDispatcher.current; // Set the dispatcher in DEV because this might be call in the render function
	    // for warnings.

	    ReactCurrentDispatcher.current = null;
	    disableLogs();
	  }

	  try {
	    // This should throw.
	    if (construct) {
	      // Something should be setting the props in the constructor.
	      var Fake = function () {
	        throw Error();
	      }; // $FlowFixMe


	      Object.defineProperty(Fake.prototype, 'props', {
	        set: function () {
	          // We use a throwing setter instead of frozen or non-writable props
	          // because that won't throw in a non-strict mode function.
	          throw Error();
	        }
	      });

	      if (typeof Reflect === 'object' && Reflect.construct) {
	        // We construct a different control for this case to include any extra
	        // frames added by the construct call.
	        try {
	          Reflect.construct(Fake, []);
	        } catch (x) {
	          control = x;
	        }

	        Reflect.construct(fn, [], Fake);
	      } else {
	        try {
	          Fake.call();
	        } catch (x) {
	          control = x;
	        }

	        fn.call(Fake.prototype);
	      }
	    } else {
	      try {
	        throw Error();
	      } catch (x) {
	        control = x;
	      }

	      fn();
	    }
	  } catch (sample) {
	    // This is inlined manually because closure doesn't do it for us.
	    if (sample && control && typeof sample.stack === 'string') {
	      // This extracts the first frame from the sample that isn't also in the control.
	      // Skipping one frame that we assume is the frame that calls the two.
	      var sampleLines = sample.stack.split('\n');
	      var controlLines = control.stack.split('\n');
	      var s = sampleLines.length - 1;
	      var c = controlLines.length - 1;

	      while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
	        // We expect at least one stack frame to be shared.
	        // Typically this will be the root most one. However, stack frames may be
	        // cut off due to maximum stack limits. In this case, one maybe cut off
	        // earlier than the other. We assume that the sample is longer or the same
	        // and there for cut off earlier. So we should find the root most frame in
	        // the sample somewhere in the control.
	        c--;
	      }

	      for (; s >= 1 && c >= 0; s--, c--) {
	        // Next we find the first one that isn't the same which should be the
	        // frame that called our sample function and the control.
	        if (sampleLines[s] !== controlLines[c]) {
	          // In V8, the first line is describing the message but other VMs don't.
	          // If we're about to return the first line, and the control is also on the same
	          // line, that's a pretty good indicator that our sample threw at same line as
	          // the control. I.e. before we entered the sample frame. So we ignore this result.
	          // This can happen if you passed a class to function component, or non-function.
	          if (s !== 1 || c !== 1) {
	            do {
	              s--;
	              c--; // We may still have similar intermediate frames from the construct call.
	              // The next one that isn't the same should be our match though.

	              if (c < 0 || sampleLines[s] !== controlLines[c]) {
	                // V8 adds a "new" prefix for native classes. Let's remove it to make it prettier.
	                var _frame = '\n' + sampleLines[s].replace(' at new ', ' at '); // If our component frame is labeled "<anonymous>"
	                // but we have a user-provided "displayName"
	                // splice it in to make the stack more readable.


	                if (fn.displayName && _frame.includes('<anonymous>')) {
	                  _frame = _frame.replace('<anonymous>', fn.displayName);
	                }

	                {
	                  if (typeof fn === 'function') {
	                    componentFrameCache.set(fn, _frame);
	                  }
	                } // Return the line we found.


	                return _frame;
	              }
	            } while (s >= 1 && c >= 0);
	          }

	          break;
	        }
	      }
	    }
	  } finally {
	    reentry = false;

	    {
	      ReactCurrentDispatcher.current = previousDispatcher;
	      reenableLogs();
	    }

	    Error.prepareStackTrace = previousPrepareStackTrace;
	  } // Fallback to just using the name if we couldn't make it throw.


	  var name = fn ? fn.displayName || fn.name : '';
	  var syntheticFrame = name ? describeBuiltInComponentFrame(name) : '';

	  {
	    if (typeof fn === 'function') {
	      componentFrameCache.set(fn, syntheticFrame);
	    }
	  }

	  return syntheticFrame;
	}
	function describeFunctionComponentFrame(fn, source, ownerFn) {
	  {
	    return describeNativeComponentFrame(fn, false);
	  }
	}

	function shouldConstruct(Component) {
	  var prototype = Component.prototype;
	  return !!(prototype && prototype.isReactComponent);
	}

	function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {

	  if (type == null) {
	    return '';
	  }

	  if (typeof type === 'function') {
	    {
	      return describeNativeComponentFrame(type, shouldConstruct(type));
	    }
	  }

	  if (typeof type === 'string') {
	    return describeBuiltInComponentFrame(type);
	  }

	  switch (type) {
	    case REACT_SUSPENSE_TYPE:
	      return describeBuiltInComponentFrame('Suspense');

	    case REACT_SUSPENSE_LIST_TYPE:
	      return describeBuiltInComponentFrame('SuspenseList');
	  }

	  if (typeof type === 'object') {
	    switch (type.$$typeof) {
	      case REACT_FORWARD_REF_TYPE:
	        return describeFunctionComponentFrame(type.render);

	      case REACT_MEMO_TYPE:
	        // Memo may contain any component type so we recursively resolve it.
	        return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);

	      case REACT_LAZY_TYPE:
	        {
	          var lazyComponent = type;
	          var payload = lazyComponent._payload;
	          var init = lazyComponent._init;

	          try {
	            // Lazy may contain any component type so we recursively resolve it.
	            return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
	          } catch (x) {}
	        }
	    }
	  }

	  return '';
	}

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	var loggedTypeFailures = {};
	var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

	function setCurrentlyValidatingElement(element) {
	  {
	    if (element) {
	      var owner = element._owner;
	      var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
	      ReactDebugCurrentFrame.setExtraStackFrame(stack);
	    } else {
	      ReactDebugCurrentFrame.setExtraStackFrame(null);
	    }
	  }
	}

	function checkPropTypes(typeSpecs, values, location, componentName, element) {
	  {
	    // $FlowFixMe This is okay but Flow doesn't know it.
	    var has = Function.call.bind(hasOwnProperty);

	    for (var typeSpecName in typeSpecs) {
	      if (has(typeSpecs, typeSpecName)) {
	        var error$1 = void 0; // Prop type validation may throw. In case they do, we don't want to
	        // fail the render phase where it didn't fail before. So we log it.
	        // After these have been cleaned up, we'll let them throw.

	        try {
	          // This is intentionally an invariant that gets caught. It's the same
	          // behavior as without this statement except with a better message.
	          if (typeof typeSpecs[typeSpecName] !== 'function') {
	            // eslint-disable-next-line react-internal/prod-error-codes
	            var err = Error((componentName || 'React class') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' + 'it must be a function, usually from the `prop-types` package, but received `' + typeof typeSpecs[typeSpecName] + '`.' + 'This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.');
	            err.name = 'Invariant Violation';
	            throw err;
	          }

	          error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
	        } catch (ex) {
	          error$1 = ex;
	        }

	        if (error$1 && !(error$1 instanceof Error)) {
	          setCurrentlyValidatingElement(element);

	          error('%s: type specification of %s' + ' `%s` is invalid; the type checker ' + 'function must return `null` or an `Error` but returned a %s. ' + 'You may have forgotten to pass an argument to the type checker ' + 'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' + 'shape all require an argument).', componentName || 'React class', location, typeSpecName, typeof error$1);

	          setCurrentlyValidatingElement(null);
	        }

	        if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
	          // Only monitor this failure once because there tends to be a lot of the
	          // same error.
	          loggedTypeFailures[error$1.message] = true;
	          setCurrentlyValidatingElement(element);

	          error('Failed %s type: %s', location, error$1.message);

	          setCurrentlyValidatingElement(null);
	        }
	      }
	    }
	  }
	}

	var isArrayImpl = Array.isArray; // eslint-disable-next-line no-redeclare

	function isArray(a) {
	  return isArrayImpl(a);
	}

	/*
	 * The `'' + value` pattern (used in in perf-sensitive code) throws for Symbol
	 * and Temporal.* types. See https://github.com/facebook/react/pull/22064.
	 *
	 * The functions in this module will throw an easier-to-understand,
	 * easier-to-debug exception with a clear errors message message explaining the
	 * problem. (Instead of a confusing exception thrown inside the implementation
	 * of the `value` object).
	 */
	// $FlowFixMe only called in DEV, so void return is not possible.
	function typeName(value) {
	  {
	    // toStringTag is needed for namespaced types like Temporal.Instant
	    var hasToStringTag = typeof Symbol === 'function' && Symbol.toStringTag;
	    var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || 'Object';
	    return type;
	  }
	} // $FlowFixMe only called in DEV, so void return is not possible.


	function willCoercionThrow(value) {
	  {
	    try {
	      testStringCoercion(value);
	      return false;
	    } catch (e) {
	      return true;
	    }
	  }
	}

	function testStringCoercion(value) {
	  // If you ended up here by following an exception call stack, here's what's
	  // happened: you supplied an object or symbol value to React (as a prop, key,
	  // DOM attribute, CSS property, string ref, etc.) and when React tried to
	  // coerce it to a string using `'' + value`, an exception was thrown.
	  //
	  // The most common types that will cause this exception are `Symbol` instances
	  // and Temporal objects like `Temporal.Instant`. But any object that has a
	  // `valueOf` or `[Symbol.toPrimitive]` method that throws will also cause this
	  // exception. (Library authors do this to prevent users from using built-in
	  // numeric operators like `+` or comparison operators like `>=` because custom
	  // methods are needed to perform accurate arithmetic or comparison.)
	  //
	  // To fix the problem, coerce this object or symbol value to a string before
	  // passing it to React. The most reliable way is usually `String(value)`.
	  //
	  // To find which value is throwing, check the browser or debugger console.
	  // Before this exception was thrown, there should be `console.error` output
	  // that shows the type (Symbol, Temporal.PlainDate, etc.) that caused the
	  // problem and how that type was used: key, atrribute, input value prop, etc.
	  // In most cases, this console output also shows the component and its
	  // ancestor components where the exception happened.
	  //
	  // eslint-disable-next-line react-internal/safe-string-coercion
	  return '' + value;
	}
	function checkKeyStringCoercion(value) {
	  {
	    if (willCoercionThrow(value)) {
	      error('The provided key is an unsupported type %s.' + ' This value must be coerced to a string before before using it here.', typeName(value));

	      return testStringCoercion(value); // throw (to help callers find troubleshooting comments)
	    }
	  }
	}

	var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
	var RESERVED_PROPS = {
	  key: true,
	  ref: true,
	  __self: true,
	  __source: true
	};
	var specialPropKeyWarningShown;
	var specialPropRefWarningShown;

	function hasValidRef(config) {
	  {
	    if (hasOwnProperty.call(config, 'ref')) {
	      var getter = Object.getOwnPropertyDescriptor(config, 'ref').get;

	      if (getter && getter.isReactWarning) {
	        return false;
	      }
	    }
	  }

	  return config.ref !== undefined;
	}

	function hasValidKey(config) {
	  {
	    if (hasOwnProperty.call(config, 'key')) {
	      var getter = Object.getOwnPropertyDescriptor(config, 'key').get;

	      if (getter && getter.isReactWarning) {
	        return false;
	      }
	    }
	  }

	  return config.key !== undefined;
	}

	function warnIfStringRefCannotBeAutoConverted(config, self) {
	  {
	    if (typeof config.ref === 'string' && ReactCurrentOwner.current && self) ;
	  }
	}

	function defineKeyPropWarningGetter(props, displayName) {
	  {
	    var warnAboutAccessingKey = function () {
	      if (!specialPropKeyWarningShown) {
	        specialPropKeyWarningShown = true;

	        error('%s: `key` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
	      }
	    };

	    warnAboutAccessingKey.isReactWarning = true;
	    Object.defineProperty(props, 'key', {
	      get: warnAboutAccessingKey,
	      configurable: true
	    });
	  }
	}

	function defineRefPropWarningGetter(props, displayName) {
	  {
	    var warnAboutAccessingRef = function () {
	      if (!specialPropRefWarningShown) {
	        specialPropRefWarningShown = true;

	        error('%s: `ref` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
	      }
	    };

	    warnAboutAccessingRef.isReactWarning = true;
	    Object.defineProperty(props, 'ref', {
	      get: warnAboutAccessingRef,
	      configurable: true
	    });
	  }
	}
	/**
	 * Factory method to create a new React element. This no longer adheres to
	 * the class pattern, so do not use new to call it. Also, instanceof check
	 * will not work. Instead test $$typeof field against Symbol.for('react.element') to check
	 * if something is a React Element.
	 *
	 * @param {*} type
	 * @param {*} props
	 * @param {*} key
	 * @param {string|object} ref
	 * @param {*} owner
	 * @param {*} self A *temporary* helper to detect places where `this` is
	 * different from the `owner` when React.createElement is called, so that we
	 * can warn. We want to get rid of owner and replace string `ref`s with arrow
	 * functions, and as long as `this` and owner are the same, there will be no
	 * change in behavior.
	 * @param {*} source An annotation object (added by a transpiler or otherwise)
	 * indicating filename, line number, and/or other information.
	 * @internal
	 */


	var ReactElement = function (type, key, ref, self, source, owner, props) {
	  var element = {
	    // This tag allows us to uniquely identify this as a React Element
	    $$typeof: REACT_ELEMENT_TYPE,
	    // Built-in properties that belong on the element
	    type: type,
	    key: key,
	    ref: ref,
	    props: props,
	    // Record the component responsible for creating this element.
	    _owner: owner
	  };

	  {
	    // The validation flag is currently mutative. We put it on
	    // an external backing store so that we can freeze the whole object.
	    // This can be replaced with a WeakMap once they are implemented in
	    // commonly used development environments.
	    element._store = {}; // To make comparing ReactElements easier for testing purposes, we make
	    // the validation flag non-enumerable (where possible, which should
	    // include every environment we run tests in), so the test framework
	    // ignores it.

	    Object.defineProperty(element._store, 'validated', {
	      configurable: false,
	      enumerable: false,
	      writable: true,
	      value: false
	    }); // self and source are DEV only properties.

	    Object.defineProperty(element, '_self', {
	      configurable: false,
	      enumerable: false,
	      writable: false,
	      value: self
	    }); // Two elements created in two different places should be considered
	    // equal for testing purposes and therefore we hide it from enumeration.

	    Object.defineProperty(element, '_source', {
	      configurable: false,
	      enumerable: false,
	      writable: false,
	      value: source
	    });

	    if (Object.freeze) {
	      Object.freeze(element.props);
	      Object.freeze(element);
	    }
	  }

	  return element;
	};
	/**
	 * https://github.com/reactjs/rfcs/pull/107
	 * @param {*} type
	 * @param {object} props
	 * @param {string} key
	 */

	function jsxDEV(type, config, maybeKey, source, self) {
	  {
	    var propName; // Reserved names are extracted

	    var props = {};
	    var key = null;
	    var ref = null; // Currently, key can be spread in as a prop. This causes a potential
	    // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
	    // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
	    // but as an intermediary step, we will use jsxDEV for everything except
	    // <div {...props} key="Hi" />, because we aren't currently able to tell if
	    // key is explicitly declared to be undefined or not.

	    if (maybeKey !== undefined) {
	      {
	        checkKeyStringCoercion(maybeKey);
	      }

	      key = '' + maybeKey;
	    }

	    if (hasValidKey(config)) {
	      {
	        checkKeyStringCoercion(config.key);
	      }

	      key = '' + config.key;
	    }

	    if (hasValidRef(config)) {
	      ref = config.ref;
	      warnIfStringRefCannotBeAutoConverted(config, self);
	    } // Remaining properties are added to a new props object


	    for (propName in config) {
	      if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
	        props[propName] = config[propName];
	      }
	    } // Resolve default props


	    if (type && type.defaultProps) {
	      var defaultProps = type.defaultProps;

	      for (propName in defaultProps) {
	        if (props[propName] === undefined) {
	          props[propName] = defaultProps[propName];
	        }
	      }
	    }

	    if (key || ref) {
	      var displayName = typeof type === 'function' ? type.displayName || type.name || 'Unknown' : type;

	      if (key) {
	        defineKeyPropWarningGetter(props, displayName);
	      }

	      if (ref) {
	        defineRefPropWarningGetter(props, displayName);
	      }
	    }

	    return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
	  }
	}

	var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
	var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;

	function setCurrentlyValidatingElement$1(element) {
	  {
	    if (element) {
	      var owner = element._owner;
	      var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
	      ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
	    } else {
	      ReactDebugCurrentFrame$1.setExtraStackFrame(null);
	    }
	  }
	}

	var propTypesMisspellWarningShown;

	{
	  propTypesMisspellWarningShown = false;
	}
	/**
	 * Verifies the object is a ReactElement.
	 * See https://reactjs.org/docs/react-api.html#isvalidelement
	 * @param {?object} object
	 * @return {boolean} True if `object` is a ReactElement.
	 * @final
	 */


	function isValidElement(object) {
	  {
	    return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
	  }
	}

	function getDeclarationErrorAddendum() {
	  {
	    if (ReactCurrentOwner$1.current) {
	      var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);

	      if (name) {
	        return '\n\nCheck the render method of `' + name + '`.';
	      }
	    }

	    return '';
	  }
	}

	function getSourceInfoErrorAddendum(source) {
	  {

	    return '';
	  }
	}
	/**
	 * Warn if there's no key explicitly set on dynamic arrays of children or
	 * object keys are not valid. This allows us to keep track of children between
	 * updates.
	 */


	var ownerHasKeyUseWarning = {};

	function getCurrentComponentErrorInfo(parentType) {
	  {
	    var info = getDeclarationErrorAddendum();

	    if (!info) {
	      var parentName = typeof parentType === 'string' ? parentType : parentType.displayName || parentType.name;

	      if (parentName) {
	        info = "\n\nCheck the top-level render call using <" + parentName + ">.";
	      }
	    }

	    return info;
	  }
	}
	/**
	 * Warn if the element doesn't have an explicit key assigned to it.
	 * This element is in an array. The array could grow and shrink or be
	 * reordered. All children that haven't already been validated are required to
	 * have a "key" property assigned to it. Error statuses are cached so a warning
	 * will only be shown once.
	 *
	 * @internal
	 * @param {ReactElement} element Element that requires a key.
	 * @param {*} parentType element's parent's type.
	 */


	function validateExplicitKey(element, parentType) {
	  {
	    if (!element._store || element._store.validated || element.key != null) {
	      return;
	    }

	    element._store.validated = true;
	    var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);

	    if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
	      return;
	    }

	    ownerHasKeyUseWarning[currentComponentErrorInfo] = true; // Usually the current owner is the offender, but if it accepts children as a
	    // property, it may be the creator of the child that's responsible for
	    // assigning it a key.

	    var childOwner = '';

	    if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
	      // Give the component that originally created this child.
	      childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
	    }

	    setCurrentlyValidatingElement$1(element);

	    error('Each child in a list should have a unique "key" prop.' + '%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);

	    setCurrentlyValidatingElement$1(null);
	  }
	}
	/**
	 * Ensure that every element either is passed in a static location, in an
	 * array with an explicit keys property defined, or in an object literal
	 * with valid key property.
	 *
	 * @internal
	 * @param {ReactNode} node Statically passed child of any type.
	 * @param {*} parentType node's parent's type.
	 */


	function validateChildKeys(node, parentType) {
	  {
	    if (typeof node !== 'object') {
	      return;
	    }

	    if (isArray(node)) {
	      for (var i = 0; i < node.length; i++) {
	        var child = node[i];

	        if (isValidElement(child)) {
	          validateExplicitKey(child, parentType);
	        }
	      }
	    } else if (isValidElement(node)) {
	      // This element was passed in a valid location.
	      if (node._store) {
	        node._store.validated = true;
	      }
	    } else if (node) {
	      var iteratorFn = getIteratorFn(node);

	      if (typeof iteratorFn === 'function') {
	        // Entry iterators used to provide implicit keys,
	        // but now we print a separate warning for them later.
	        if (iteratorFn !== node.entries) {
	          var iterator = iteratorFn.call(node);
	          var step;

	          while (!(step = iterator.next()).done) {
	            if (isValidElement(step.value)) {
	              validateExplicitKey(step.value, parentType);
	            }
	          }
	        }
	      }
	    }
	  }
	}
	/**
	 * Given an element, validate that its props follow the propTypes definition,
	 * provided by the type.
	 *
	 * @param {ReactElement} element
	 */


	function validatePropTypes(element) {
	  {
	    var type = element.type;

	    if (type === null || type === undefined || typeof type === 'string') {
	      return;
	    }

	    var propTypes;

	    if (typeof type === 'function') {
	      propTypes = type.propTypes;
	    } else if (typeof type === 'object' && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
	    // Inner props are checked in the reconciler.
	    type.$$typeof === REACT_MEMO_TYPE)) {
	      propTypes = type.propTypes;
	    } else {
	      return;
	    }

	    if (propTypes) {
	      // Intentionally inside to avoid triggering lazy initializers:
	      var name = getComponentNameFromType(type);
	      checkPropTypes(propTypes, element.props, 'prop', name, element);
	    } else if (type.PropTypes !== undefined && !propTypesMisspellWarningShown) {
	      propTypesMisspellWarningShown = true; // Intentionally inside to avoid triggering lazy initializers:

	      var _name = getComponentNameFromType(type);

	      error('Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?', _name || 'Unknown');
	    }

	    if (typeof type.getDefaultProps === 'function' && !type.getDefaultProps.isReactClassApproved) {
	      error('getDefaultProps is only used on classic React.createClass ' + 'definitions. Use a static property named `defaultProps` instead.');
	    }
	  }
	}
	/**
	 * Given a fragment, validate that it can only be provided with fragment props
	 * @param {ReactElement} fragment
	 */


	function validateFragmentProps(fragment) {
	  {
	    var keys = Object.keys(fragment.props);

	    for (var i = 0; i < keys.length; i++) {
	      var key = keys[i];

	      if (key !== 'children' && key !== 'key') {
	        setCurrentlyValidatingElement$1(fragment);

	        error('Invalid prop `%s` supplied to `React.Fragment`. ' + 'React.Fragment can only have `key` and `children` props.', key);

	        setCurrentlyValidatingElement$1(null);
	        break;
	      }
	    }

	    if (fragment.ref !== null) {
	      setCurrentlyValidatingElement$1(fragment);

	      error('Invalid attribute `ref` supplied to `React.Fragment`.');

	      setCurrentlyValidatingElement$1(null);
	    }
	  }
	}

	var didWarnAboutKeySpread = {};
	function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
	  {
	    var validType = isValidElementType(type); // We warn in this case but don't throw. We expect the element creation to
	    // succeed and there will likely be errors in render.

	    if (!validType) {
	      var info = '';

	      if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
	        info += ' You likely forgot to export your component from the file ' + "it's defined in, or you might have mixed up default and named imports.";
	      }

	      var sourceInfo = getSourceInfoErrorAddendum();

	      if (sourceInfo) {
	        info += sourceInfo;
	      } else {
	        info += getDeclarationErrorAddendum();
	      }

	      var typeString;

	      if (type === null) {
	        typeString = 'null';
	      } else if (isArray(type)) {
	        typeString = 'array';
	      } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
	        typeString = "<" + (getComponentNameFromType(type.type) || 'Unknown') + " />";
	        info = ' Did you accidentally export a JSX literal instead of a component?';
	      } else {
	        typeString = typeof type;
	      }

	      error('React.jsx: type is invalid -- expected a string (for ' + 'built-in components) or a class/function (for composite ' + 'components) but got: %s.%s', typeString, info);
	    }

	    var element = jsxDEV(type, props, key, source, self); // The result can be nullish if a mock or a custom function is used.
	    // TODO: Drop this when these are no longer allowed as the type argument.

	    if (element == null) {
	      return element;
	    } // Skip key warning if the type isn't valid since our key validation logic
	    // doesn't expect a non-string/function type and can throw confusing errors.
	    // We don't want exception behavior to differ between dev and prod.
	    // (Rendering will throw with a helpful message and as soon as the type is
	    // fixed, the key warnings will appear.)


	    if (validType) {
	      var children = props.children;

	      if (children !== undefined) {
	        if (isStaticChildren) {
	          if (isArray(children)) {
	            for (var i = 0; i < children.length; i++) {
	              validateChildKeys(children[i], type);
	            }

	            if (Object.freeze) {
	              Object.freeze(children);
	            }
	          } else {
	            error('React.jsx: Static children should always be an array. ' + 'You are likely explicitly calling React.jsxs or React.jsxDEV. ' + 'Use the Babel transform instead.');
	          }
	        } else {
	          validateChildKeys(children, type);
	        }
	      }
	    }

	    {
	      if (hasOwnProperty.call(props, 'key')) {
	        var componentName = getComponentNameFromType(type);
	        var keys = Object.keys(props).filter(function (k) {
	          return k !== 'key';
	        });
	        var beforeExample = keys.length > 0 ? '{key: someKey, ' + keys.join(': ..., ') + ': ...}' : '{key: someKey}';

	        if (!didWarnAboutKeySpread[componentName + beforeExample]) {
	          var afterExample = keys.length > 0 ? '{' + keys.join(': ..., ') + ': ...}' : '{}';

	          error('A props object containing a "key" prop is being spread into JSX:\n' + '  let props = %s;\n' + '  <%s {...props} />\n' + 'React keys must be passed directly to JSX without using spread:\n' + '  let props = %s;\n' + '  <%s key={someKey} {...props} />', beforeExample, componentName, afterExample, componentName);

	          didWarnAboutKeySpread[componentName + beforeExample] = true;
	        }
	      }
	    }

	    if (type === REACT_FRAGMENT_TYPE) {
	      validateFragmentProps(element);
	    } else {
	      validatePropTypes(element);
	    }

	    return element;
	  }
	} // These two functions exist to still get child warnings in dev
	// even with the prod transform. This means that jsxDEV is purely
	// opt-in behavior for better messages but that we won't stop
	// giving you warnings if you use production apis.

	function jsxWithValidationStatic(type, props, key) {
	  {
	    return jsxWithValidation(type, props, key, true);
	  }
	}
	function jsxWithValidationDynamic(type, props, key) {
	  {
	    return jsxWithValidation(type, props, key, false);
	  }
	}

	var jsx =  jsxWithValidationDynamic ; // we may want to special case jsxs internally to take advantage of static children.
	// for now we can ship identical prod functions

	var jsxs =  jsxWithValidationStatic ;

	reactJsxRuntime_development.Fragment = REACT_FRAGMENT_TYPE;
	reactJsxRuntime_development.jsx = jsx;
	reactJsxRuntime_development.jsxs = jsxs;
	  })();
	}
	return reactJsxRuntime_development;
}

if (process.env.NODE_ENV === 'production') {
  jsxRuntime.exports = requireReactJsxRuntime_production_min();
} else {
  jsxRuntime.exports = requireReactJsxRuntime_development();
}

var jsxRuntimeExports = jsxRuntime.exports;

const ClippyContext = createContext(undefined);
/**
 * Provider component for managing Clippy agents
 */
const ClippyProvider = ({ children, defaultBasePath }) => {
    const [agents, setAgents] = useState(new Map());
    const loadAgent = async (name, options) => {
        // Check if already loaded
        const existing = agents.get(name);
        if (existing)
            return existing;
        try {
            // Load the agent
            const agent = await load(name, {
                basePath: options?.basePath || defaultBasePath
            });
            // Add to state
            setAgents(prev => new Map(prev).set(name, agent));
            // Show if requested
            if (options?.show !== false) {
                await agent.show();
            }
            return agent;
        }
        catch (error) {
            console.error(`Failed to load agent ${name}:`, error);
            throw error;
        }
    };
    const unloadAgent = (name) => {
        const agent = agents.get(name);
        if (agent) {
            agent.destroy();
            setAgents(prev => {
                const next = new Map(prev);
                next.delete(name);
                return next;
            });
        }
    };
    const getAgent = (name) => {
        return agents.get(name);
    };
    // Clean up on unmount
    useEffect(() => {
        return () => {
            agents.forEach(agent => agent.destroy());
        };
    }, []);
    const value = {
        agents,
        loadAgent,
        unloadAgent,
        getAgent
    };
    return (jsxRuntimeExports.jsx(ClippyContext.Provider, { value: value, children: children }));
};
/**
 * Hook to access Clippy context
 */
const useClippy = () => {
    const context = useContext(ClippyContext);
    if (!context) {
        throw new Error('useClippy must be used within a ClippyProvider');
    }
    return context;
};

/**
 * React component for Clippy agents
 */
/**
 * Clippy React Component
 */
const Clippy = ({ name, basePath, showOnLoad = true, onLoad, onError, position, speak, holdSpeech = false }) => {
    const { loadAgent, getAgent, unloadAgent } = useClippy();
    const [agent, setAgent] = useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        let currentAgent;
        const initAgent = async () => {
            try {
                setLoading(true);
                setError(null);
                // Check if already loaded
                currentAgent = getAgent(name);
                if (!currentAgent) {
                    // Load the agent
                    currentAgent = await loadAgent(name, {
                        basePath,
                        show: showOnLoad
                    });
                }
                else if (showOnLoad) {
                    await currentAgent.show();
                }
                if (!mountedRef.current)
                    return;
                setAgent(currentAgent);
                // Set initial position if provided
                if (position && currentAgent) {
                    await currentAgent.moveTo(position.x, position.y, 0);
                }
                // Speak initial message if provided
                if (speak && currentAgent) {
                    await currentAgent.speak(speak, holdSpeech);
                }
                // Call onLoad callback
                if (onLoad && currentAgent) {
                    onLoad(currentAgent);
                }
            }
            catch (err) {
                if (!mountedRef.current)
                    return;
                const error = err;
                setError(error);
                if (onError) {
                    onError(error);
                }
            }
            finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        };
        initAgent();
        return () => {
            mountedRef.current = false;
            // Note: We don't unload the agent here as it might be used elsewhere
            // The ClippyProvider handles cleanup on unmount
        };
    }, [name, basePath, showOnLoad]);
    // Handle speak prop changes
    useEffect(() => {
        if (agent && speak) {
            agent.speak(speak, holdSpeech);
        }
    }, [speak, holdSpeech]);
    // This component doesn't render anything - the Agent manages its own DOM
    return null;
};
/**
 * Hook to control a specific agent
 */
const useAgent = (name) => {
    const { loadAgent, getAgent, unloadAgent } = useClippy();
    const [agent, setAgent] = useState(() => getAgent(name));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const loadedAgent = await loadAgent(name);
            setAgent(loadedAgent);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setLoading(false);
        }
    };
    const unload = () => {
        unloadAgent(name);
        setAgent(undefined);
    };
    useEffect(() => {
        // Update agent reference if it changes
        const currentAgent = getAgent(name);
        if (currentAgent !== agent) {
            setAgent(currentAgent);
        }
    }, [name]);
    return {
        agent,
        loading,
        error,
        load,
        unload
    };
};

/**
 * Clippy.js - Modern TypeScript and React implementation
 */
// Core classes
const clippy = {
    load,
    ready,
    soundsReady,
    Agent,
    Animator,
    Balloon,
    Queue
};
// Set up global if in browser
if (typeof window !== 'undefined') {
    window.clippy = clippy;
}

export { Agent, Animator, Balloon, Clippy, ClippyProvider, Queue, clippy as default, load, ready, soundsReady, useAgent, useClippy };
//# sourceMappingURL=index.esm.js.map
