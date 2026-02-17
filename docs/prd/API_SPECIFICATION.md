# API Specification
# ClippyJS Browser-Based AI Assistant

**Version:** 1.0.0
**Date:** February 2026

---

## Overview

This document specifies the APIs for the Browser-Based AI Assistant, including the JavaScript SDK, REST API, and event interfaces.

---

## JavaScript SDK API

### Initialization

#### `ClippyAssistant.init(config)`

Initializes the browser assistant on the current page.

```typescript
interface ClippyConfig {
  // Required
  apiKey: string;
  
  // Agent Configuration
  agentName?: AgentName;                    // Default: 'Clippy'
  personality?: PersonalityMode;            // Default: 'helpful'
  
  // AI Provider Configuration
  provider?: 'anthropic' | 'openai' | 'openrouter';
  model?: string;                           // Provider-specific model
  
  // UI Configuration
  position?: Position;                      // Default: 'bottom-right'
  theme?: Theme;                            // Default: 'auto'
  zIndex?: number;                          // Default: 9999
  
  // Behavior Configuration
  proactive?: ProactiveConfig;
  contextProviders?: ContextProviderConfig[];
  interactionPermissions?: InteractionPermissions;
  
  // Callbacks
  onReady?: () => void;
  onError?: (error: ClippyError) => void;
  onMessage?: (message: AssistantMessage) => void;
  onSuggestion?: (suggestion: ProactiveSuggestion) => void;
  onInteraction?: (interaction: InteractionEvent) => void;
}

type Position = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
type Theme = 'light' | 'dark' | 'auto';

type AgentName = 
  | 'Clippy'
  | 'Bonzi'
  | 'F1'
  | 'Genie'
  | 'Genius'
  | 'Links'
  | 'Merlin'
  | 'Peedy'
  | 'Rocky'
  | 'Rover';

type PersonalityMode = 
  | 'helpful'      // Balanced, friendly
  | 'concise'      // Brief, to the point
  | 'technical'    // Detailed, technical
  | 'creative';    // More personality, less formal
```

**Example:**

```javascript
const assistant = ClippyAssistant.init({
  apiKey: 'your-api-key',
  agentName: 'Clippy',
  personality: 'helpful',
  position: 'bottom-right',
  theme: 'auto',
  
  proactive: {
    enabled: true,
    intrusionLevel: 'medium',
    checkInterval: 60000
  },
  
  interactionPermissions: {
    highlight: true,
    scrollTo: true,
    click: false,
    fill: false
  },
  
  onReady: () => console.log('Clippy is ready!'),
  onError: (err) => console.error('Error:', err),
  onSuggestion: (suggestion) => console.log('Suggestion:', suggestion)
});
```

### Instance Methods

#### `assistant.show()`

Shows the assistant if hidden.

```typescript
assistant.show(): Promise<void>
```

#### `assistant.hide()`

Hides the assistant.

```typescript
assistant.hide(): Promise<void>
```

#### `assistant.toggle()`

Toggles visibility.

```typescript
assistant.toggle(): Promise<void>
```

#### `assistant.ask(question, options?)`

Asks the assistant a question.

```typescript
interface AskOptions {
  includeContext?: boolean;     // Include page context (default: true)
  stream?: boolean;             // Stream response (default: true)
  timeout?: number;             // Timeout in ms (default: 30000)
}

interface AskResponse {
  messageId: string;
  content: string;
  suggestions?: string[];
  actions?: AssistantAction[];
}

assistant.ask(question: string, options?: AskOptions): Promise<AskResponse>
```

**Example:**

```javascript
// Simple question
const response = await assistant.ask('What can I do on this page?');
console.log(response.content);

// With streaming
const response = await assistant.ask('Explain this form', { stream: true });
for await (const chunk of response.stream) {
  console.log(chunk.delta);
}
```

#### `assistant.getContext()`

Gets the current page context.

```typescript
interface PageContext {
  url: string;
  title: string;
  contentType: ContentType;
  sections: Section[];
  interactiveElements: InteractiveElement[];
  forms: FormInfo[];
  userState: UserState;
}

assistant.getContext(): Promise<PageContext>
```

#### `assistant.highlight(element, options?)`

Highlights an element on the page.

```typescript
interface HighlightOptions {
  color?: string;        // Default: '#FFD700'
  duration?: number;     // Default: 2000ms
  pulse?: boolean;       // Default: true
}

assistant.highlight(
  selector: string | HTMLElement, 
  options?: HighlightOptions
): Promise<void>
```

#### `assistant.scrollTo(element, options?)`

Scrolls to an element on the page.

```typescript
interface ScrollOptions {
  behavior?: 'auto' | 'smooth';   // Default: 'smooth'
  block?: 'start' | 'center' | 'end';  // Default: 'center'
}

assistant.scrollTo(
  selector: string | HTMLElement,
  options?: ScrollOptions
): Promise<void>
```

#### `assistant.interact(action, target, value?)`

Performs an interaction on the page.

```typescript
type InteractionAction = 
  | 'highlight'
  | 'scroll-to'
  | 'click'
  | 'fill'
  | 'focus'
  | 'select';

interface InteractionResult {
  success: boolean;
  action: InteractionAction;
  target: string;
  error?: string;
}

assistant.interact(
  action: InteractionAction,
  target: string,
  value?: string
): Promise<InteractionResult>
```

**Example:**

```javascript
// Highlight a button
await assistant.interact('highlight', '#submit-button');

// Scroll to a section
await assistant.interact('scroll-to', '#pricing');

// Fill a form field (if permitted)
await assistant.interact('fill', '#email', 'user@example.com');
```

#### `assistant.updateConfig(config)`

Updates the assistant configuration.

```typescript
assistant.updateConfig(config: Partial<ClippyConfig>): void
```

#### `assistant.destroy()`

Destroys the assistant instance and cleans up.

```typescript
assistant.destroy(): void
```

### Event Handling

#### `assistant.on(event, callback)`

Subscribes to assistant events.

```typescript
type AssistantEvent = 
  | 'ready'
  | 'error'
  | 'message'
  | 'suggestion'
  | 'interaction'
  | 'visibility-change'
  | 'context-update';

assistant.on(event: AssistantEvent, callback: Function): () => void
```

**Example:**

```javascript
const unsubscribe = assistant.on('suggestion', (suggestion) => {
  console.log('Proactive suggestion:', suggestion.message);
});

// Later, unsubscribe
unsubscribe();
```

---

## REST API

### Base URL

```
https://api.clippyjs.org/v1
```

### Authentication

All API requests require an API key in the `Authorization` header:

```
Authorization: Bearer your-api-key
```

### Endpoints

#### POST /chat

Send a chat message to the assistant.

**Request:**

```typescript
interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: PageContextPayload;
  options?: ChatOptions;
}

interface PageContextPayload {
  url: string;
  title: string;
  contentType: string;
  visibleText?: string;        // Max 5000 chars
  interactiveElements?: InteractiveElementSummary[];
  forms?: FormSummary[];
}

interface InteractiveElementSummary {
  type: string;
  label: string;
  selector: string;
}

interface FormSummary {
  id: string;
  fields: FormFieldSummary[];
}

interface FormFieldSummary {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

interface ChatOptions {
  agentName?: AgentName;
  personality?: PersonalityMode;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}
```

**Response (Non-streaming):**

```typescript
interface ChatResponse {
  id: string;
  conversationId: string;
  message: Message;
  usage: TokenUsage;
}

interface Message {
  role: 'assistant';
  content: string;
  timestamp: string;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

**Response (Streaming):**

Server-Sent Events with the following event types:

```
event: content_delta
data: {"delta": "Hello!"}

event: content_delta
data: {"delta": " How can I"}

event: content_delta
data: {"delta": " help you today?"}

event: done
data: {"conversationId": "conv_123", "usage": {...}}
```

**Example:**

```bash
curl -X POST https://api.clippyjs.org/v1/chat \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What can I do on this page?",
    "context": {
      "url": "https://example.com/products",
      "title": "Products - Example Store",
      "contentType": "product-listing",
      "visibleText": "Browse our collection..."
    },
    "options": {
      "agentName": "Clippy",
      "personality": "helpful",
      "stream": true
    }
  }'
```

#### POST /context/analyze

Analyze page context without chat.

**Request:**

```typescript
interface ContextAnalyzeRequest {
  html: string;              // Page HTML (max 100KB)
  url: string;
  focus?: {
    selector: string;
    text: string;
  };
}

interface ContextAnalyzeResponse {
  contentType: ContentType;
  topics: string[];
  entities: Entity[];
  interactiveElements: InteractiveElement[];
  forms: FormAnalysis[];
  suggestions: ContextSuggestion[];
}
```

#### GET /agents

List available agents.

**Response:**

```typescript
interface AgentListResponse {
  agents: AgentInfo[];
}

interface AgentInfo {
  name: AgentName;
  displayName: string;
  description: string;
  previewUrl: string;
  animations: string[];
}
```

#### GET /agents/{name}

Get agent configuration.

**Response:**

```typescript
interface AgentConfigResponse {
  name: AgentName;
  displayName: string;
  description: string;
  animations: Record<string, AnimationConfig>;
  sounds: Record<string, string>;
  personalityProfiles: PersonalityProfile[];
}
```

---

## Type Definitions

### Common Types

```typescript
// Error Types
interface ClippyError {
  code: string;
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
}

// Error Codes
enum ErrorCode {
  // Initialization Errors
  API_KEY_INVALID = 'AUTH_001',
  API_KEY_EXPIRED = 'AUTH_002',
  RATE_LIMIT_EXCEEDED = 'AUTH_003',
  
  // Embedding Errors
  SHADOW_DOM_UNSUPPORTED = 'EMBED_001',
  CSP_VIOLATION = 'EMBED_002',
  
  // Parsing Errors
  DOM_PARSE_FAILED = 'PARSE_001',
  CONTEXT_EXTRACTION_FAILED = 'PARSE_002',
  
  // AI Errors
  MODEL_UNAVAILABLE = 'AI_001',
  CONTEXT_TOO_LONG = 'AI_002',
  STREAM_INTERRUPTED = 'AI_003',
  
  // Interaction Errors
  ELEMENT_NOT_FOUND = 'INT_001',
  INTERACTION_NOT_PERMITTED = 'INT_002',
  INTERACTION_FAILED = 'INT_003'
}

// Content Types
type ContentType =
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

// Proactive Configuration
interface ProactiveConfig {
  enabled: boolean;
  intrusionLevel: 'low' | 'medium' | 'high';
  checkInterval: number;          // milliseconds
  maxSuggestions: number;         // per session
  cooldownAfterIgnore: number;    // milliseconds
  triggers?: ProactiveTrigger[];
}

interface ProactiveTrigger {
  type: TriggerType;
  condition: TriggerCondition;
  message: string;
  priority: number;
}

type TriggerType =
  | 'idle'
  | 'scroll-depth'
  | 'form-started'
  | 'form-stalled'
  | 'error-encountered'
  | 'element-hover'
  | 'custom';

interface TriggerCondition {
  threshold?: number;
  selector?: string;
  custom?: (context: PageContext) => boolean;
}

// Interaction Permissions
interface InteractionPermissions {
  highlight?: boolean;      // Default: true
  scrollTo?: boolean;       // Default: true
  click?: boolean;          // Default: false
  fill?: boolean;           // Default: false
  focus?: boolean;          // Default: true
  select?: boolean;         // Default: false
  confirmBeforeAction?: boolean;  // Default: true
}

// User State
interface UserState {
  scrollPosition: number;
  scrollDepth: number;
  focusedElement: InteractiveElement | null;
  activeForm: FormInfo | null;
  timeOnPage: number;
  isIdle: boolean;
}

// Section
interface Section {
  id: string;
  title: string;
  content: string;
  type: 'header' | 'main' | 'sidebar' | 'footer' | 'modal' | 'custom';
  importance: number;       // 0-1
  visible: boolean;
}

// Interactive Element
interface InteractiveElement {
  id: string;
  type: InteractiveType;
  selector: string;
  label: string;
  description: string;
  action: string;
  state: ElementState;
  position: BoundingBox;
}

type InteractiveType =
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

interface ElementState {
  visible: boolean;
  enabled: boolean;
  focused: boolean;
  hovered: boolean;
  expanded: boolean;
  checked?: boolean;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Form Info
interface FormInfo {
  id: string;
  action: string;
  method: string;
  fields: FormField[];
  progress: FormProgress;
  isValid: boolean;
}

interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  value: string;
  isValid: boolean;
  error?: string;
  helpText?: string;
}

interface FormProgress {
  total: number;
  filled: number;
  valid: number;
  percentage: number;
}

// Proactive Suggestion
interface ProactiveSuggestion {
  id: string;
  message: string;
  type: SuggestionType;
  trigger: TriggerType;
  confidence: number;
  actions?: SuggestedAction[];
  dismissible: boolean;
}

type SuggestionType =
  | 'help-offer'
  | 'form-assistance'
  | 'navigation-help'
  | 'error-recovery'
  | 'tip'
  | 'contextual-info';

interface SuggestedAction {
  type: InteractionAction;
  label: string;
  target: string;
  value?: string;
}

// Assistant Message
interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: PageContextSummary;
  actions?: AssistantAction[];
}

interface PageContextSummary {
  url: string;
  title: string;
  focusedElement?: string;
  activeForm?: string;
}

interface AssistantAction {
  type: string;
  label: string;
  data: Record<string, any>;
}
```

---

## Embedding Snippets

### CDN Embed

```html
<!-- Minimal embed -->
<script src="https://cdn.clippyjs.org/assistant/v1/clippy.min.js"></script>
<script>
  ClippyAssistant.init({ apiKey: 'your-api-key' });
</script>
```

### With Configuration

```html
<script src="https://cdn.clippyjs.org/assistant/v1/clippy.min.js"></script>
<script>
  ClippyAssistant.init({
    apiKey: 'your-api-key',
    agentName: 'Clippy',
    position: 'bottom-right',
    theme: 'auto',
    proactive: {
      enabled: true,
      intrusionLevel: 'medium'
    },
    onReady: function() {
      console.log('Clippy is ready to help!');
    }
  });
</script>
```

### Async Loading

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://cdn.clippyjs.org/assistant/v1/clippy.min.js';
    script.async = true;
    script.onload = function() {
      ClippyAssistant.init({ apiKey: 'your-api-key' });
    };
    document.head.appendChild(script);
  })();
</script>
```

### React Integration

```tsx
import { BrowserClippy } from '@clippyjs/browser-assistant/react';

function App() {
  return (
    <div>
      <BrowserClippy
        apiKey="your-api-key"
        agentName="Clippy"
        position="bottom-right"
        proactive={true}
        onSuggestion={(suggestion) => {
          console.log('Suggestion:', suggestion);
        }}
      />
      {/* Your app content */}
    </div>
  );
}
```

---

## Rate Limits

| Plan | Requests/min | Tokens/day | Concurrent Streams |
|------|--------------|------------|-------------------|
| Free | 10 | 10,000 | 1 |
| Starter | 60 | 100,000 | 3 |
| Business | 300 | 1,000,000 | 10 |
| Enterprise | Unlimited | Unlimited | Unlimited |

---

## Versioning

The API uses URL-based versioning (e.g., `/v1/chat`). Breaking changes will result in a new version number. Old versions will be supported for at least 12 months after a new version is released.

---

## SDK Language Support

| Language | Package | Status |
|----------|---------|--------|
| JavaScript | `@clippyjs/browser-assistant` | Planned |
| TypeScript | Included in JS package | Planned |
| Python | `clippyjs-python` | Future |
| Node.js | `@clippyjs/node` | Future |

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Feb 2026 | API Team | Initial specification |
