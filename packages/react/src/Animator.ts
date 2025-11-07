/**
 * Animator class for handling sprite animations
 */

import { AgentData, Animation, Frame, AnimationState, SoundMap } from './types';

export type AnimatorStateCallback = (name: string, state: AnimationState) => void;

export class Animator {
  public static readonly States = {
    WAITING: 'WAITING' as AnimationState,
    EXITED: 'EXITED' as AnimationState,
    PLAYING: 'PLAYING' as AnimationState,
  };

  private element: HTMLElement;
  private data: AgentData;
  private path: string;
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private overlays: HTMLElement[] = [];

  private currentAnimation?: Animation;
  private currentFrame?: Frame;
  private currentFrameIndex = 0;
  private exiting = false;
  private started = false;
  private paused = false;
  private loop?: number;
  private endCallback?: AnimatorStateCallback;

  public currentAnimationName?: string;

  private lastFrameTime?: number;

  constructor(element: HTMLElement, path: string, data: AgentData, sounds: SoundMap) {
    this.element = element;
    this.data = data;
    this.path = path;

    this.preloadSounds(sounds);
    this.setupElements();
  }

  /**
   * Set up the DOM elements for animation layers
   */
  private setupElements(): void {
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
  private setupElementStyle(element: HTMLElement): void {
    const [width, height] = this.data.framesize;
    element.style.display = 'none';
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.background = `url('${this.path}/map.png') no-repeat`;
  }

  /**
   * Preload sound files
   */
  private preloadSounds(sounds: SoundMap): Promise<void[]> {
    const promises: Promise<void>[] = [];
    for (const soundName of this.data.sounds) {
      const uri = sounds[soundName];
      if (uri) {
        const audio = new Audio(uri);
        this.sounds[soundName] = audio;
        promises.push(new Promise<void>((resolve) => {
          audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        }));
      }
    }
    return Promise.all(promises);
  }

  /**
   * Get list of available animations
   */
  public getAnimations(): string[] {
    return Object.keys(this.data.animations);
  }

  /**
   * Check if an animation exists
   */
  public hasAnimation(name: string): boolean {
    return !!this.data.animations[name];
  }

  /**
   * Start showing an animation
   */
  public showAnimation(animationName: string, stateChangeCallback?: AnimatorStateCallback): boolean {
    this.exiting = false;

    if (!this.hasAnimation(animationName)) {
      return false;
    }

    this.currentAnimation = this.data.animations[animationName];
    this.currentAnimationName = animationName;

    if (!this.started) {
      this.lastFrameTime = performance.now();
      this.loop = window.requestAnimationFrame((time) => this.step(time));
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
  public exitAnimation(): void {
    this.exiting = true;
  }

  /**
   * Pause the animation
   */
  public pause(): void {
    this.paused = true;
    if (this.loop) {
      window.cancelAnimationFrame(this.loop);
      this.loop = undefined;
    }
  }

  /**
   * Resume the animation
   */
  public resume(): void {
    this.paused = false;
    if (this.currentAnimation) {
      this.lastFrameTime = performance.now();
      this.loop = window.requestAnimationFrame((time) => this.step(time));
    }
  }

  /**
   * Main animation loop step
   */
  private step(time: number): void {
    if (!this.currentAnimation || this.paused) return;

    const timeSinceLastFrame = time - (this.lastFrameTime ?? time);
    const duration = this.currentFrame?.duration ?? 0;

    if (timeSinceLastFrame >= duration) {
      this.lastFrameTime = time;

      const newFrameIndex = Math.min(
        this.getNextAnimationFrame(),
        this.currentAnimation.frames.length - 1
      );
      const frameChanged = !this.currentFrame || this.currentFrameIndex !== newFrameIndex;
      this.currentFrameIndex = newFrameIndex;

      // Always switch frame data, unless at last frame with useExitBranching flag
      if (!(this.atLastFrame() && this.currentAnimation.useExitBranching)) {
        this.currentFrame = this.currentAnimation.frames[this.currentFrameIndex];
      }

      this.draw();
      this.playSound();

      // Fire events if frames changed and we reached an end
      if (this.endCallback && frameChanged && this.atLastFrame()) {
        if (this.currentAnimation.useExitBranching && !this.exiting) {
          this.endCallback(this.currentAnimationName!, Animator.States.WAITING);
        } else {
          this.endCallback(this.currentAnimationName!, Animator.States.EXITED);
        }
      }
    }

    this.loop = window.requestAnimationFrame((time) => this.step(time));
  }

  /**
   * Get the next animation frame index
   */
  private getNextAnimationFrame(): number {
    if (!this.currentAnimation) return 0;
    if (!this.currentFrame) return 0;

    const currentFrame = this.currentFrame;
    const branching = currentFrame.branching;

    if (this.exiting && currentFrame.exitBranch !== undefined) {
      return currentFrame.exitBranch;
    } else if (branching) {
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
  private draw(): void {
    const images = this.currentFrame?.images || [];

    for (let i = 0; i < this.overlays.length; i++) {
      if (i < images.length) {
        const [x, y] = images[i];
        const backgroundPosition = `-${x}px -${y}px`;
        this.overlays[i].style.backgroundPosition = backgroundPosition;
        this.overlays[i].style.display = 'block';
      } else {
        this.overlays[i].style.display = 'none';
      }
    }
  }

  /**
   * Play the current frame's sound
   */
  private playSound(): void {
    if (!this.currentFrame?.sound) return;

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
  private atLastFrame(): boolean {
    if (!this.currentAnimation) return false;
    return this.currentFrameIndex >= this.currentAnimation.frames.length - 1;
  }

  /**
   * Destroy the animator and clean up
   */
  public destroy(): void {
    this.pause();
    this.overlays = [];
    this.sounds = {};
  }
}