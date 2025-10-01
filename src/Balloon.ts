/**
 * Balloon component for displaying speech bubbles
 */

type BalloonPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export class Balloon {
  private targetEl: HTMLElement;
  private balloonEl: HTMLDivElement;
  private contentEl: HTMLDivElement;
  private tipEl: HTMLDivElement;
  private hidden = true;
  private active = false;
  private hold = false;
  private hidingTimeout?: number;
  private wordTimeout?: number;
  private completeCallback?: () => void;

  private readonly WORD_SPEAK_TIME = 200;
  private readonly CLOSE_BALLOON_DELAY = 2000;
  private readonly BALLOON_MARGIN = 15;

  constructor(targetEl: HTMLElement) {
    this.targetEl = targetEl;
    this.balloonEl = this.createBalloonElement();
    this.contentEl = this.balloonEl.querySelector(
      ".clippy-content",
    ) as HTMLDivElement;
    this.tipEl = this.balloonEl.querySelector(".clippy-tip") as HTMLDivElement;
    document.body.appendChild(this.balloonEl);
  }

  /**
   * Create the balloon DOM element
   */
  private createBalloonElement(): HTMLDivElement {
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
  public speak(text: string, hold = false): Promise<void> {
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
  public show(): void {
    if (this.hidden) return;
    this.balloonEl.style.display = "block";
  }

  /**
   * Hide the balloon
   */
  public hide(immediately = false): void {
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
  public close(): void {
    if (this.active) {
      this.hold = false;
    } else if (this.hold && this.completeCallback) {
      this.completeCallback();
    }
  }

  /**
   * Pause the balloon animation
   */
  public pause(): void {
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
  public resume(): void {
    if (this.active) {
      this.addWord && this.addWord();
    } else if (!this.hold && !this.hidden) {
      this.hidingTimeout = window.setTimeout(() => {
        this.finishHideBalloon();
      }, this.CLOSE_BALLOON_DELAY);
    }
  }

  /**
   * Reposition the balloon relative to target element
   */
  public reposition(): void {
    const positions: BalloonPosition[] = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];

    for (const position of positions) {
      this.position(position);
      if (!this.isOutOfBounds()) break;
    }
  }

  /**
   * Position the balloon at a specific location
   */
  private position(side: BalloonPosition): void {
    const rect = this.targetEl.getBoundingClientRect();
    const balloonHeight = this.balloonEl.offsetHeight;
    const balloonWidth = this.balloonEl.offsetWidth;

    // Remove all position classes
    this.balloonEl.classList.remove(
      "clippy-top-left",
      "clippy-top-right",
      "clippy-bottom-left",
      "clippy-bottom-right",
    );

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
  private isOutOfBounds(): boolean {
    const rect = this.balloonEl.getBoundingClientRect();
    const margin = 5;

    if (rect.top - margin < 0 || rect.left - margin < 0) {
      return true;
    }

    return (
      rect.bottom + margin > window.innerHeight ||
      rect.right + margin > window.innerWidth
    );
  }

  /**
   * Animate the words appearing in the balloon
   */
  private sayWords(text: string, hold: boolean): void {
    this.active = true;
    this.hold = hold;
    const words = text.split(/\s+/);
    let currentIndex = 0;

    const addNextWord = () => {
      if (!this.active) return;

      if (currentIndex >= words.length) {
        this.active = false;
        if (!this.hold) {
          if (this.completeCallback) {
            this.completeCallback();
          }
          this.hide();
        }
      } else {
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
  private finishHideBalloon(): void {
    if (this.active) return;
    this.balloonEl.style.display = "none";
    this.hidden = true;
    this.hidingTimeout = undefined;
  }

  /**
   * Stored function for resuming word animation
   */
  private addWord?: () => void;

  /**
   * Destroy the balloon and clean up
   */
  public destroy(): void {
    if (this.hidingTimeout) {
      window.clearTimeout(this.hidingTimeout);
    }
    if (this.wordTimeout) {
      window.clearTimeout(this.wordTimeout);
    }
    this.balloonEl.remove();
  }
}
