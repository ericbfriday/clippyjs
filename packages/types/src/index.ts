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

// ============================================================
// Browser-Based AI Assistant Types
// ============================================================

/**
 * Content types that can be detected on a web page
 */
export type ContentType =
  | 'article'
  | 'product'
  | 'product-listing'
  | 'form'
  | 'navigation'
  | 'dashboard'
  | 'documentation'
  | 'search-results'
  | 'checkout'
  | 'cart'
  | 'profile'
  | 'settings'
  | 'login'
  | 'registration'
  | 'landing'
  | 'unknown';

/**
 * A semantic section of a web page
 */
export interface PageSection {
  id: string;
  title: string;
  content: string;
  type: 'header' | 'main' | 'sidebar' | 'footer' | 'modal' | 'custom';
  importance: number; // 0-1
  visible: boolean;
}

/**
 * A named entity extracted from page content
 */
export interface PageEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'price' | 'product';
  confidence: number;
}

/**
 * Semantic content extracted from a web page
 */
export interface SemanticContent {
  title: string;
  description: string;
  mainTopics: string[];
  contentType: ContentType;
  sections: PageSection[];
  entities: PageEntity[];
}

/**
 * Interactive element type
 */
export type InteractiveType =
  | 'button'
  | 'link'
  | 'input-text'
  | 'input-email'
  | 'input-password'
  | 'input-number'
  | 'input-checkbox'
  | 'input-radio'
  | 'input-file'
  | 'select'
  | 'textarea'
  | 'toggle'
  | 'menu'
  | 'menuitem'
  | 'tab'
  | 'accordion'
  | 'slider'
  | 'unknown';

/**
 * State of an interactive element
 */
export interface ElementState {
  visible: boolean;
  enabled: boolean;
  focused: boolean;
  hovered: boolean;
  expanded: boolean;
  checked?: boolean;
}

/**
 * Bounding box for element position
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * An interactive element detected on the page
 */
export interface InteractiveElement {
  id: string;
  type: InteractiveType;
  selector: string;
  label: string;
  description: string;
  action: string;
  state: ElementState;
  position: BoundingBox;
}

/**
 * Validation rules for a form field
 */
export interface FieldValidation {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessage?: string;
}

/**
 * Form progress tracking
 */
export interface FormProgress {
  total: number;
  filled: number;
  valid: number;
  percentage: number;
}

/**
 * A single form field
 */
export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  validation: FieldValidation;
  value: string;
  isValid: boolean;
  error?: string;
  helpText?: string;
}

/**
 * Complete form analysis result
 */
export interface FormAnalysis {
  id: string;
  action: string;
  method: string;
  fields: FormField[];
  validation: Record<string, FieldValidation>;
  progress: FormProgress;
  autoComplete: boolean;
}

/**
 * Viewport information
 */
export interface ViewportInfo {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
}

/**
 * Heading structure for accessibility
 */
export interface HeadingItem {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id?: string;
}

/**
 * ARIA landmark role
 */
export interface LandmarkRole {
  role: string;
  label?: string;
  element: string;
}

/**
 * Full page context gathered by PageContextProvider
 */
export interface PageContext {
  url: string;
  title: string;
  description: string;
  contentType: ContentType;
  mainTopics: string[];
  readingLevel: string;
  wordCount: number;
  sections: PageSection[];
  buttons: InteractiveElement[];
  links: InteractiveElement[];
  forms: FormAnalysis[];
  scrollPosition: number;
  scrollDepth: number;
  focusedElement: InteractiveElement | null;
  viewport: ViewportInfo;
  headingStructure: HeadingItem[];
  landmarkRoles: LandmarkRole[];
}

/**
 * An idle event recorded when user is inactive
 */
export interface IdleEvent {
  startTime: Date;
  duration: number;
  position: { x: number; y: number };
}

/**
 * Type of frustration signal detected
 */
export type FrustrationSignalType =
  | 'rage-click'
  | 'form-abandonment'
  | 'navigation-confusion'
  | 'error-repetition';

/**
 * A frustration signal detected from user behavior
 */
export interface FrustrationSignal {
  type: FrustrationSignalType;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  element?: string;
  form?: FormAnalysis;
}

/**
 * User behavior context gathered by UserBehaviorProvider
 */
export interface UserBehaviorContext {
  sessionDuration: number;
  pagesVisited: number;
  clickCount: number;
  scrollCount: number;
  formInteractions: number;
  timeOnPage: number;
  activeTime: number;
  idleTime: number;
  idleEvents: IdleEvent[];
  currentTask: string | null;
  readingSection: PageSection | null;
  rageClicks: number;
  backtracking: number;
  errorEncounters: number;
  frustrationSignal: FrustrationSignal | null;
}

/**
 * Position for the browser assistant widget
 */
export type AssistantPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right';

/**
 * Theme for the browser assistant
 */
export type AssistantTheme = 'light' | 'dark' | 'auto';

/**
 * Interaction actions the assistant can perform
 */
export type InteractionAction =
  | 'highlight'
  | 'scroll-to'
  | 'click'
  | 'fill'
  | 'focus'
  | 'select';

/**
 * Permissions for what the assistant can interact with
 */
export interface InteractionPermissions {
  highlight?: boolean;
  scrollTo?: boolean;
  click?: boolean;
  fill?: boolean;
  focus?: boolean;
  select?: boolean;
  confirmBeforeAction?: boolean;
}

/**
 * Configuration for the browser assistant embed
 */
export interface BrowserAssistantConfig {
  apiKey: string;
  agentName?: AgentName;
  position?: AssistantPosition;
  theme?: AssistantTheme;
  zIndex?: number;
  proactive?: {
    enabled: boolean;
    intrusionLevel: 'low' | 'medium' | 'high';
    checkInterval: number;
    maxSuggestions?: number;
    cooldownAfterIgnore?: number;
  };
  interactionPermissions?: InteractionPermissions;
  onReady?: () => void;
  onError?: (error: Error) => void;
}