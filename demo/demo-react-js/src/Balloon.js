/**
 * Balloon component for displaying speech bubbles
 */
export class Balloon {
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
