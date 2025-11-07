// Agent name type (defined here during migration)
export type AgentName =
  | "Clippy"
  | "Bonzi"
  | "F1"
  | "Genie"
  | "Genius"
  | "Links"
  | "Merlin"
  | "Peedy"
  | "Rocky"
  | "Rover";

// Core types (temporarily defined here during migration)
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

export type AnimationState = "WAITING" | "EXITED" | "PLAYING";

export interface AnimatorStates {
  WAITING: "WAITING";
  EXITED: "EXITED";
  PLAYING: "PLAYING";
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

export type Direction = "Up" | "Down" | "Left" | "Right";

export type QueueCallback = () => void;

export interface BalloonOptions {
  hold?: boolean;
}

export interface LoadOptions {
  basePath?: string;
}

// AI provider types (temporarily defined here during migration)
export interface AIProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export type ContentBlockType = 'text' | 'image' | 'tool_use' | 'tool_result';

export interface ImageSource {
  type: 'base64' | 'url';
  mediaType: string;
  data?: string;
  url?: string;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageBlock {
  type: 'image';
  source: ImageSource;
}

export interface ToolUseContentBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultContentBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
}

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | ToolUseContentBlock
  | ToolResultContentBlock;

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

export type StreamChunkType =
  | 'content_delta'
  | 'tool_use'
  | 'tool_use_start'
  | 'tool_use_delta'
  | 'complete'
  | 'error';

export interface ToolUseBlock {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface StreamChunk {
  type: StreamChunkType;
  delta?: string;
  toolUse?: ToolUseBlock;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface ChatOptions {
  systemPrompt?: string;
  tools?: Tool[];
  maxTokens?: number;
  temperature?: number;
}

// AI conversation types (temporarily defined here during migration)
export interface ConversationMessage extends Message {
  id: string;
  timestamp: Date;
  context?: ContextData[];
}

export interface ConversationHistory {
  messages: ConversationMessage[];
  agentName: AgentName;
  startedAt: Date;
  lastInteraction: Date;
}

export interface HistoryStore {
  save(history: ConversationHistory): Promise<void>;
  load(agentName: AgentName): Promise<ConversationHistory | null>;
  clear(agentName: AgentName): Promise<void>;
  clearAll?(): Promise<void>;
}

// AI personality types (temporarily defined here during migration)
export type PersonalityMode = 'classic' | 'extended';

export interface PersonalityProfile {
  systemPrompt: string;
  traits: string[];
  quirks?: string[];
}

// React-specific types
export interface UseAgentOptions {
  agentName?: AgentName;
  autoStart?: boolean;
  autoLoad?: boolean;
  autoShow?: boolean;
  autoCleanup?: boolean;
  initialPosition?: { x: number; y: number };
  initialMessage?: string;
  basePath?: string;
}

export interface UseAgentReturn {
  agent: any; // Will be typed properly when core is migrated
  isLoading: boolean;
  loading: boolean;
  error: Error | null;

  // Lifecycle
  load: () => Promise<any>;
  unload: () => void;
  reload: () => Promise<any>;

  // Core Methods
  show: () => Promise<void>;
  hide: () => Promise<void>;
  play: (animation: string) => Promise<void>;
  animate: () => Promise<void>;
  speak: (text: string, hold?: boolean) => Promise<void>;
  moveTo: (x: number, y: number, duration?: number) => Promise<void>;
  gestureAt: (x: number, y: number) => Promise<void>;

  // Control Methods
  stop: () => void;
  stopCurrent: () => void;
  pause: () => void;
  resume: () => void;
  delay: (ms: number) => Promise<void>;
  closeBalloon: () => void;

  // Utility Methods
  getAnimations: () => string[];
  hasAnimation: (name: string) => boolean;
  isVisible: () => boolean;
}

// Context data types
export interface ContextData {
  id: string;
  type: string;
  content: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}