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

// Re-export types from core
export type * from "@clippyjs/core";
