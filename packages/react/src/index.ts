"use client";

/**
 * @clippyjs/react - React components for Clippy
 */

// Context and Provider
export { ClippyProvider, useClippy } from "./ClippyProvider";

// Hooks
export { useAgent } from "./useAgent";

// Components (optional declarative API)
export { Clippy } from "./Clippy";

// Core classes
export { Agent } from "./Agent";
export { Animator } from "./Animator";
export { Balloon } from "./Balloon";
export { Queue } from "./Queue";

// Loader functions
export { load, ready, soundsReady } from "./loader";

// Types
export type * from "@clippyjs/types";
