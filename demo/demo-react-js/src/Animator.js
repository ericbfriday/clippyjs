/**
 * Animator class for handling sprite animations
 */
export class Animator {
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
