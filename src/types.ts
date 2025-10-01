/**
 * Type definitions for Clippy.js
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Frame {
  duration: number;
  images?: number[][];
  sound?: string | boolean;
  exitBranch?: number;
  branching?: {
    branches: Branch[];
  };
}

export interface Branch {
  frameIndex: number;
  weight: number;
}

export interface Animation {
  frames: Frame[];
  useExitBranching?: boolean;
}

export interface AgentData {
  framesize: [number, number];
  overlayCount: number;
  animations: Record<string, Animation>;
  sounds: string[];
}

export interface SoundMap {
  [key: string]: string;
}

export type AnimationState = 'WAITING' | 'EXITED' | 'PLAYING';

export interface AnimatorStates {
  WAITING: 'WAITING';
  EXITED: 'EXITED';
  PLAYING: 'PLAYING';
}

export interface ClippyOptions {
  basePath?: string;
  soundEnabled?: boolean;
}

export interface AgentConfig {
  name: string;
  path: string;
  data: AgentData;
  sounds: SoundMap;
}

export type Direction = 'Up' | 'Down' | 'Left' | 'Right';

export type QueueCallback = () => void;

export interface BalloonOptions {
  hold?: boolean;
}

export interface LoadOptions {
  basePath?: string;
}