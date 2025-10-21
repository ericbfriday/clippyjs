/**
 * Clippy.js - Modern TypeScript and React implementation
 */

// Core classes
export { Agent } from "./Agent";
export { Animator } from "./Animator";
export { Balloon } from "./Balloon";
export { Queue } from "./Queue";

// Loader functions
export { load, ready, soundsReady } from "./loader";

// React components and hooks
export { ClippyProvider, useClippy } from "./ClippyProvider";
export { Clippy, useAgent } from "./Clippy";

// Types
export type * from "./types";

// Legacy API support
import { load, ready, soundsReady } from "./loader";
import { Agent } from "./Agent";
import { Animator } from "./Animator";
import { Balloon } from "./Balloon";
import { Queue } from "./Queue";

export const clippy = {
  load,
  ready,
  soundsReady,
  Agent,
  Animator,
  Balloon,
  Queue,
};

// Export default for backward compatibility
export default clippy;

export function setupGlobal() {
  // Set up global if in browser
  if (typeof window !== "undefined") {
    (window as any).clippy = clippy;
    console.info("Clippy.js set to window.");
  } else {
    console.info(
      `Clippy.js not running in a browser environment, global not set.`,
    );
  }
}
