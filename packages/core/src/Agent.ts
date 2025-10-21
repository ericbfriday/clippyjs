/**
 * Agent class representing a Clippy character
 */

import { Queue } from './Queue';
import { Animator } from './Animator';
import { Balloon } from './Balloon';
import { AgentData, SoundMap, Direction, AnimationState } from './types';

export interface AgentOptions {
  onDoubleClick?: () => void;
}

export class Agent {
  private path: string;
  private element: HTMLDivElement;
  private animator: Animator;
  private balloon: Balloon;
  private queue: Queue;

  private hidden = false;
  private idleDeferred?: Promise<void>;
  private idleResolve?: () => void;

  // Drag state
  private dragOffset?: { top: number; left: number };
  private targetX?: number;
  private targetY?: number;
  private dragUpdateLoop?: number;
  private moveHandler?: (e: MouseEvent) => void;
  private upHandler?: (e: MouseEvent) => void;

  private constructor(path: string, data: AgentData, sounds: SoundMap, options?: AgentOptions) {
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

  public static async create(path: string, data: AgentData, sounds: SoundMap, options?: AgentOptions): Promise<Agent> {
    const agent = new Agent(path, data, sounds, options);
    await (agent.animator as any).preloadSounds(sounds);
    return agent;
  }

  /**
   * Show the agent with optional animation
   */
  public async show(fast = false): Promise<void> {
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
  public async hide(fast = false): Promise<void> {
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
  public play(animation: string, timeout = 5000): Promise<void> {
    if (!this.hasAnimation(animation)) {
      return Promise.reject(new Error(`Animation "${animation}" not found`));
    }

    return new Promise((resolve) => {
      this.queue.enqueue((complete) => {
        let completed = false;
        const callback = (name: string, state: AnimationState) => {
          if (state === Animator.States.EXITED) {
            completed = true;
            resolve();
            complete();
          }
        };

        // Set timeout if specified
        if (timeout) {
          window.setTimeout(() => {
            if (completed) return;
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
  public speak(text: string, hold = false): Promise<void> {
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
  public closeBalloon(): void {
    this.balloon.hide();
  }

  /**
   * Move to a position
   */
  public moveTo(x: number, y: number, duration = 1000): Promise<void> {
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
        const callback = (name: string, state: AnimationState) => {
          if (state === Animator.States.EXITED) {
            complete();
            resolve();
          } else if (state === Animator.States.WAITING) {
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
  public async gestureAt(x: number, y: number): Promise<void> {
    const direction = this.getDirection(x, y);
    const gestureAnim = `Gesture${direction}`;
    const lookAnim = `Look${direction}`;

    const animation = this.hasAnimation(gestureAnim) ? gestureAnim : lookAnim;
    return this.play(animation);
  }

  /**
   * Play a random animation
   */
  public async animate(): Promise<void> {
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
  public delay(time = 250): Promise<void> {
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
  public stop(): void {
    this.queue.clear();
    this.animator.exitAnimation();
    this.balloon.hide();
  }

  /**
   * Stop current animation/action
   */
  public stopCurrent(): void {
    this.animator.exitAnimation();
    this.balloon.close();
  }

  /**
   * Pause animations
   */
  public pause(): void {
    this.animator.pause();
    this.balloon.pause();
  }

  /**
   * Resume animations
   */
  public resume(): void {
    this.animator.resume();
    this.balloon.resume();
  }

  /**
   * Check if animation exists
   */
  public hasAnimation(name: string): boolean {
    return this.animator.hasAnimation(name);
  }

  /**
   * Get list of available animations
   */
  public getAnimations(): string[] {
    return this.animator.getAnimations();
  }

  /**
   * Reposition to stay in viewport
   */
  public reposition(): void {
    if (!this.isVisible()) return;

    const rect = this.element.getBoundingClientRect();
    const margin = 5;
    let { top, left } = rect;

    // Adjust position to stay in viewport
    if (top - margin < 0) {
      top = margin;
    } else if (top + rect.height + margin > window.innerHeight) {
      top = window.innerHeight - rect.height - margin;
    }

    if (left - margin < 0) {
      left = margin;
    } else if (left + rect.width + margin > window.innerWidth) {
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
  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.element.remove();
    this.animator.destroy();
    this.balloon.destroy();
  }

  // Private methods

  private setupEvents(options?: AgentOptions): void {
    // Window resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // Mouse events
    this.element.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.element.addEventListener('dblclick', () => this.onDoubleClick(options));
  }

  private handleResize = (): void => {
    this.reposition();
  };

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.startDrag(e);
  }

  private onDoubleClick(options?: AgentOptions): void {
    if (options?.onDoubleClick) {
      options.onDoubleClick();
    } else if (!this.play('ClickedOn')) {
      this.animate();
    }
  }

  private startDrag(e: MouseEvent): void {
    this.pause();
    this.balloon.hide(true);

    const rect = this.element.getBoundingClientRect();
    this.dragOffset = {
      top: e.clientY - rect.top,
      left: e.clientX - rect.left
    };

    this.moveHandler = (e: MouseEvent) => this.dragMove(e);
    this.upHandler = () => this.finishDrag();

    window.addEventListener('mousemove', this.moveHandler);
    window.addEventListener('mouseup', this.upHandler);

    this.updateDragPosition();
  }

  private dragMove(e: MouseEvent): void {
    e.preventDefault();
    if (!this.dragOffset) return;

    this.targetX = e.clientX - this.dragOffset.left;
    this.targetY = e.clientY - this.dragOffset.top;
  }

  private updateDragPosition(): void {
    if (this.targetX !== undefined && this.targetY !== undefined) {
      this.element.style.left = `${this.targetX}px`;
      this.element.style.top = `${this.targetY}px`;
    }
    this.dragUpdateLoop = window.requestAnimationFrame(() => this.updateDragPosition());
  }

  private finishDrag(): void {
    if (this.dragUpdateLoop) {
      window.cancelAnimationFrame(this.dragUpdateLoop);
    }

    if (this.moveHandler && this.upHandler) {
      window.removeEventListener('mousemove', this.moveHandler);
      window.removeEventListener('mouseup', this.upHandler);
    }

    this.balloon.show();
    this.reposition();
    this.resume();
  }

  private playInternal(animation: string, callback?: (name: string, state: AnimationState) => void): void {
    // If in idle animation, wait for it to complete
    if (this.isIdleAnimation() && this.idleDeferred) {
      this.idleDeferred.then(() => {
        this.playInternal(animation, callback);
      });
      return;
    }

    this.animator.showAnimation(animation, callback);
  }

  private onQueueEmpty(): void {
    if (this.hidden || this.isIdleAnimation()) return;

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

  private isIdleAnimation(): boolean {
    const current = this.animator.currentAnimationName;
    return !!current && current.startsWith('Idle');
  }

  private getIdleAnimation(): string {
    const animations = this.getAnimations();
    const idleAnimations = animations.filter(a => a.startsWith('Idle'));

    if (idleAnimations.length === 0) {
      return animations[0] || 'Idle1';
    }

    return idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
  }

  private getDirection(x: number, y: number): Direction {
    const rect = this.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const a = centerY - y;
    const b = centerX - x;
    const angle = Math.round((180 * Math.atan2(a, b)) / Math.PI);

    if (-45 <= angle && angle < 45) return 'Right';
    if (45 <= angle && angle < 135) return 'Up';
    if ((135 <= angle && angle <= 180) || (-180 <= angle && angle < -135)) return 'Left';
    if (-135 <= angle && angle < -45) return 'Down';

    return 'Up'; // Default
  }

  private animatePosition(x: number, y: number, duration: number, callback: () => void): void {
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
      } else {
        callback();
      }
    };

    animate();
  }

  public isVisible(): boolean {
    return this.element.style.display !== 'none';
  }
}
