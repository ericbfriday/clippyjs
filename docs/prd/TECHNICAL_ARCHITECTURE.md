# Technical Architecture Document
# ClippyJS Browser-Based AI Assistant

**Version:** 1.0.0
**Date:** February 2026
**Status:** Draft

---

## Overview

This document describes the technical architecture for extending ClippyJS from a React-focused library into a universal browser-based AI assistant that can operate autonomously on any webpage.

---

## Current Architecture

### Existing Packages

```
@clippyjs/
├── types/           # Shared TypeScript types
├── react/           # React components & hooks
├── ai/              # AI integration core
├── ai-anthropic/    # Claude provider
├── ai-openai/       # OpenAI provider
├── ai-openrouter/   # OpenRouter provider
├── ai-zai/          # ZAI provider
├── storybook/       # Component documentation
└── templates/       # Starter templates
```

### Current Capabilities

| Capability | Status | Location |
|------------|--------|----------|
| Agent rendering | ✅ Complete | `@clippyjs/react` |
| Animation system | ✅ Complete | `@clippyjs/react/Animator` |
| AI provider abstraction | ✅ Complete | `@clippyjs/ai/AIProvider` |
| Streaming chat | ✅ Complete | `@clippyjs/ai/StreamController` |
| Conversation management | ✅ Complete | `@clippyjs/ai/ConversationManager` |
| Context providers | ✅ Basic | `@clippyjs/ai/context/DOMContext` |
| Proactive behavior | ✅ Basic | `@clippyjs/ai/ProactiveBehaviorEngine` |
| Personality modes | ✅ Complete | `@clippyjs/ai/modes/PrebuiltModes` |

### Current Limitations

1. **React-Dependent Rendering**: Agent components require React
2. **Basic DOM Context**: Only extracts headings, forms, visible text, meta tags
3. **No Shadow DOM**: Styles can conflict with host page
4. **No Universal Embedding**: Requires bundler/integration setup
5. **Limited Interaction**: Cannot interact with page elements

---

## Proposed Architecture

### New Package Structure

```
@clippyjs/
├── types/                    # Shared types (existing)
├── react/                    # React components (existing)
├── ai/                       # AI integration (enhanced)
├── ai-anthropic/            # Claude provider (existing)
├── ai-openai/               # OpenAI provider (existing)
│
├── browser-assistant/       # 🆕 Universal browser assistant
│   ├── core/                # Core embedding engine
│   ├── parser/              # Enhanced page parsing
│   ├── interaction/         # Page interaction capabilities
│   ├── shadow/              # Shadow DOM isolation
│   └── extension/           # Browser extension
│
├── browser-parser/          # 🆕 Page parsing utilities
│   ├── semantic/            # Semantic content extraction
│   ├── structure/           # Page structure analysis
│   ├── accessibility/       # A11y tree extraction
│   └── interaction/         # Interactive element detection
│
└── context-providers/       # 🆕 Enhanced context providers
    ├── page-context/        # Full page understanding
    ├── user-behavior/       # User interaction tracking
    ├── form-analysis/       # Form field analysis
    └── journey-context/     # Multi-page journey
```

---

## Core Components

### 1. Universal Embedding System (`@clippyjs/browser-assistant`)

#### 1.1 Embedder

Responsible for injecting Clippy into any webpage without React dependencies.

```typescript
// packages/browser-assistant/core/Embedder.ts

interface EmbedConfig {
  apiKey: string;
  agentName: AgentName;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  theme?: 'light' | 'dark' | 'auto';
  proactive?: ProactiveConfig;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

class ClippyEmbedder {
  private shadowHost: HTMLElement;
  private shadow: ShadowRoot;
  private agent: AgentController;
  private parser: PageParser;
  private contextManager: ContextManager;
  
  constructor(config: EmbedConfig) {
    this.validateConfig(config);
    this.createShadowHost();
    this.initializeParser();
    this.initializeAgent(config);
  }
  
  private createShadowHost(): void {
    // Create isolated container
    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'clippy-assistant-root';
    document.body.appendChild(this.shadowHost);
    
    // Attach shadow DOM for style isolation
    this.shadow = this.shadowHost.attachShadow({ mode: 'closed' });
  }
  
  async init(): Promise<void> {
    // Load agent assets
    // Initialize chat interface
    // Start context monitoring
    // Begin proactive behavior engine
  }
  
  destroy(): void {
    // Cleanup all resources
    // Remove shadow host
    // Clear event listeners
  }
}
```

#### 1.2 Shadow DOM Renderer

Renders the Clippy UI in isolation from host page styles.

```typescript
// packages/browser-assistant/shadow/ShadowRenderer.ts

class ShadowRenderer {
  private shadow: ShadowRoot;
  private styles: CSSStyleSheet;
  
  constructor(shadow: ShadowRoot) {
    this.shadow = shadow;
    this.injectStyles();
  }
  
  private injectStyles(): void {
    // Create adopted stylesheet for shadow DOM
    this.styles = new CSSStyleSheet();
    this.styles.replaceSync(CLIPPY_STYLES);
    this.shadow.adoptedStyleSheets = [this.styles];
  }
  
  renderAgent(agentElement: HTMLElement): void {
    // Render the animated agent
    this.shadow.appendChild(agentElement);
  }
  
  renderChatPanel(chatElement: HTMLElement): void {
    // Render the chat interface
    this.shadow.appendChild(chatElement);
  }
  
  renderSpeechBalloon(balloonElement: HTMLElement): void {
    // Render speech balloon
    this.shadow.appendChild(balloonElement);
  }
}
```

### 2. Enhanced Page Parser (`@clippyjs/browser-parser`)

#### 2.1 Semantic Content Extractor

Extracts semantic meaning from page content, not just raw text.

```typescript
// packages/browser-parser/semantic/SemanticExtractor.ts

interface SemanticContent {
  title: string;
  description: string;
  mainTopics: string[];
  contentType: ContentType;
  sections: Section[];
  entities: Entity[];
}

type ContentType = 
  | 'article'
  | 'product'
  | 'form'
  | 'navigation'
  | 'dashboard'
  | 'documentation'
  | 'search-results'
  | 'checkout'
  | 'profile'
  | 'unknown';

interface Section {
  id: string;
  title: string;
  content: string;
  type: 'header' | 'main' | 'sidebar' | 'footer' | 'modal';
  importance: number;
}

interface Entity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'price' | 'product';
  confidence: number;
}

class SemanticExtractor {
  async extract(): Promise<SemanticContent> {
    return {
      title: this.extractTitle(),
      description: this.extractDescription(),
      mainTopics: await this.extractTopics(),
      contentType: await this.classifyContentType(),
      sections: this.extractSections(),
      entities: this.extractEntities()
    };
  }
  
  private async classifyContentType(): Promise<ContentType> {
    // Use heuristics + optional ML classification
    const features = this.extractPageFeatures();
    
    // Check for common patterns
    if (this.hasProductSchema()) return 'product';
    if (this.hasArticleSchema()) return 'article';
    if (this.hasCheckoutFlow()) return 'checkout';
    if (this.hasFormElements()) return 'form';
    
    // Fall back to DOM structure analysis
    return this.analyzeStructure();
  }
  
  private extractSections(): Section[] {
    const sections: Section[] = [];
    
    // Extract main content sections
    const landmarks = document.querySelectorAll('[role="main"], main, article, section');
    
    // Also check for semantic HTML5 elements
    const semantic = document.querySelectorAll('header, nav, main, article, aside, footer');
    
    // Process and categorize
    for (const el of [...landmarks, ...semantic]) {
      sections.push(this.processSection(el));
    }
    
    return sections;
  }
}
```

#### 2.2 Interactive Element Detector

Identifies and categorizes interactive elements on the page.

```typescript
// packages/browser-parser/interaction/InteractionDetector.ts

interface InteractiveElement {
  id: string;
  type: InteractiveType;
  element: HTMLElement;
  label: string;
  description: string;
  action: string;
  state: ElementState;
  position: BoundingBox;
}

type InteractiveType = 
  | 'button'
  | 'link'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'menu'
  | 'tab'
  | 'accordion';

interface ElementState {
  visible: boolean;
  enabled: boolean;
  focused: boolean;
  hovered: boolean;
  expanded: boolean;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

class InteractionDetector {
  private elements: Map<string, InteractiveElement>;
  private observer: MutationObserver;
  private resizeObserver: ResizeObserver;
  
  constructor() {
    this.elements = new Map();
    this.setupObservers();
  }
  
  detectAll(): InteractiveElement[] {
    const elements: InteractiveElement[] = [];
    
    // Find all interactive elements
    const selectors = [
      'button', 'a[href]', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[role="menuitem"]',
      '[tabindex]:not([tabindex="-1"])',
      '[onclick]', '[ng-click]', '[v-on:click]'
    ];
    
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      for (const el of found) {
        elements.push(this.processElement(el as HTMLElement));
      }
    }
    
    return elements;
  }
  
  getByType(type: InteractiveType): InteractiveElement[] {
    return Array.from(this.elements.values())
      .filter(el => el.type === type);
  }
  
  getByAction(action: string): InteractiveElement | undefined {
    return Array.from(this.elements.values())
      .find(el => el.action.toLowerCase().includes(action.toLowerCase()));
  }
  
  private processElement(el: HTMLElement): InteractiveElement {
    return {
      id: this.generateId(el),
      type: this.detectType(el),
      element: el,
      label: this.extractLabel(el),
      description: this.extractDescription(el),
      action: this.inferAction(el),
      state: this.getCurrentState(el),
      position: this.getBoundingBox(el)
    };
  }
}
```

#### 2.3 Form Analyzer

Deep analysis of form structures for assistance.

```typescript
// packages/browser-parser/interaction/FormAnalyzer.ts

interface FormAnalysis {
  form: HTMLFormElement;
  id: string;
  action: string;
  method: string;
  fields: FormField[];
  validation: ValidationRules;
  progress: FormProgress;
  autoComplete: boolean;
}

interface FormField {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  pattern?: RegExp;
  validation: FieldValidation;
  value: string;
  error?: string;
  helpText?: string;
}

interface FieldValidation {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: string) => boolean;
  errorMessage?: string;
}

interface FormProgress {
  total: number;
  filled: number;
  valid: number;
  percentage: number;
}

class FormAnalyzer {
  analyzeForm(form: HTMLFormElement): FormAnalysis {
    return {
      form,
      id: form.id || this.generateId(),
      action: form.action,
      method: form.method,
      fields: this.analyzeFields(form),
      validation: this.extractValidation(form),
      progress: this.calculateProgress(form),
      autoComplete: form.autocomplete !== 'off'
    };
  }
  
  detectCurrentField(): FormField | null {
    const active = document.activeElement;
    if (!active) return null;
    
    if (active instanceof HTMLInputElement ||
        active instanceof HTMLSelectElement ||
        active instanceof HTMLTextAreaElement) {
      return this.analyzeField(active);
    }
    
    return null;
  }
  
  validateField(field: FormField): ValidationResult {
    const value = field.element.value;
    const errors: string[] = [];
    
    if (field.required && !value) {
      errors.push(`${field.label} is required`);
    }
    
    if (field.validation.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors.push(field.validation.errorMessage || 'Invalid format');
      }
    }
    
    // Additional validations...
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  suggestValue(field: FormField): string | null {
    // Use field type, name, and context to suggest values
    // Could integrate with browser autofill data
    return null;
  }
}
```

### 3. Enhanced Context Providers (`@clippyjs/context-providers`)

#### 3.1 Page Context Provider

Comprehensive page understanding.

```typescript
// packages/context-providers/page-context/PageContextProvider.ts

interface PageContext {
  // Basic info
  url: string;
  title: string;
  description: string;
  
  // Content analysis
  contentType: ContentType;
  mainTopics: string[];
  readingLevel: string;
  wordCount: number;
  
  // Structure
  sections: Section[];
  navigation: NavigationItem[];
  
  // Interactive elements
  buttons: InteractiveElement[];
  links: InteractiveElement[];
  forms: FormAnalysis[];
  
  // User state
  scrollPosition: number;
  scrollDepth: number;
  focusedElement: InteractiveElement | null;
  viewport: ViewportInfo;
  
  // Accessibility
  headingStructure: Heading[];
  landmarkRoles: Landmark[];
  
  // Metadata
  schema: SchemaOrgData | null;
  openGraph: OpenGraphData | null;
}

class PageContextProvider implements ContextProvider {
  name = 'page-context';
  enabled = true;
  
  private semanticExtractor: SemanticExtractor;
  private interactionDetector: InteractionDetector;
  private formAnalyzer: FormAnalyzer;
  
  async gather(): Promise<ContextData> {
    const context: PageContext = {
      url: window.location.href,
      title: document.title,
      description: await this.extractDescription(),
      
      contentType: await this.semanticExtractor.classifyContentType(),
      mainTopics: await this.semanticExtractor.extractTopics(),
      readingLevel: this.calculateReadingLevel(),
      wordCount: this.countWords(),
      
      sections: this.semanticExtractor.extractSections(),
      navigation: this.extractNavigation(),
      
      buttons: this.interactionDetector.getByType('button'),
      links: this.interactionDetector.getByType('link'),
      forms: this.analyzeAllForms(),
      
      scrollPosition: window.scrollY,
      scrollDepth: this.calculateScrollDepth(),
      focusedElement: this.getFocusedElement(),
      viewport: this.getViewportInfo(),
      
      headingStructure: this.extractHeadingStructure(),
      landmarkRoles: this.extractLandmarks(),
      
      schema: this.extractSchemaOrg(),
      openGraph: this.extractOpenGraph()
    };
    
    return {
      provider: 'page-context',
      timestamp: new Date(),
      data: context
    };
  }
}
```

#### 3.2 User Behavior Provider

Tracks and analyzes user behavior patterns.

```typescript
// packages/context-providers/user-behavior/UserBehaviorProvider.ts

interface UserBehaviorContext {
  // Session info
  sessionDuration: number;
  pagesVisited: number;
  
  // Interaction patterns
  clickCount: number;
  scrollCount: number;
  formInteractions: number;
  
  // Engagement metrics
  timeOnPage: number;
  activeTime: number;
  idleTime: number;
  idleEvents: IdleEvent[];
  
  // Current focus
  currentTask: string | null;
  currentForm: FormAnalysis | null;
  readingSection: Section | null;
  
  // Frustration signals
  rageClicks: number;
  backtracking: number;
  errorEncounters: number;
  
  // Patterns
  commonActions: string[];
  frequentPages: string[];
}

interface IdleEvent {
  startTime: Date;
  duration: number;
  position: { x: number; y: number };
}

class UserBehaviorProvider implements ContextProvider {
  name = 'user-behavior';
  enabled = true;
  
  private startTime: Date;
  private lastActivityTime: Date;
  private idleThreshold: number = 30000; // 30 seconds
  
  private clickCount: number = 0;
  private scrollCount: number = 0;
  private rageClickThreshold: number = 3;
  private lastClickTime: number = 0;
  
  constructor() {
    this.setupEventListeners();
    this.startTime = new Date();
    this.lastActivityTime = new Date();
  }
  
  async gather(): Promise<ContextData> {
    return {
      provider: 'user-behavior',
      timestamp: new Date(),
      data: {
        sessionDuration: Date.now() - this.startTime.getTime(),
        pagesVisited: this.getPageCount(),
        
        clickCount: this.clickCount,
        scrollCount: this.scrollCount,
        formInteractions: this.formInteractionCount,
        
        timeOnPage: this.getTimeOnPage(),
        activeTime: this.getActiveTime(),
        idleTime: this.getIdleTime(),
        idleEvents: this.getIdleEvents(),
        
        currentTask: this.inferCurrentTask(),
        currentForm: this.getCurrentForm(),
        readingSection: this.getReadingSection(),
        
        rageClicks: this.rageClickCount,
        backtracking: this.backtrackCount,
        errorEncounters: this.errorCount,
        
        commonActions: this.getCommonActions(),
        frequentPages: this.getFrequentPages()
      }
    };
  }
  
  detectFrustration(): FrustrationSignal | null {
    // Check for rage clicks
    if (this.hasRecentRageClicks()) {
      return {
        type: 'rage-click',
        severity: 'high',
        element: this.lastRageClickElement,
        suggestion: 'It looks like something isn\'t working. Can I help?'
      };
    }
    
    // Check for form abandonment
    if (this.hasFormAbandonment()) {
      return {
        type: 'form-abandonment',
        severity: 'medium',
        form: this.abandonedForm,
        suggestion: 'I noticed you started this form but didn\'t finish. Need help?'
      };
    }
    
    // Check for navigation confusion
    if (this.hasNavigationBacktracking()) {
      return {
        type: 'navigation-confusion',
        severity: 'low',
        suggestion: 'Looking for something specific? I can help you find it.'
      };
    }
    
    return null;
  }
  
  private setupEventListeners(): void {
    // Track clicks
    document.addEventListener('click', (e) => {
      this.handleClick(e);
      this.resetIdleTimer();
    });
    
    // Track scrolls
    document.addEventListener('scroll', () => {
      this.scrollCount++;
      this.resetIdleTimer();
    }, { passive: true });
    
    // Track form interactions
    document.addEventListener('focus', (e) => {
      if (this.isFormElement(e.target)) {
        this.formInteractionCount++;
        this.resetIdleTimer();
      }
    }, true);
    
    // Track idle time
    this.setupIdleDetection();
  }
}
```

### 4. Page Interaction System

#### 4.1 Element Interaction Controller

Enables Clippy to interact with page elements safely.

```typescript
// packages/browser-assistant/interaction/InteractionController.ts

interface InteractionRequest {
  action: InteractionAction;
  target: string; // Element selector or ID
  value?: string;
  confirmation?: boolean;
}

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
  beforeState?: any;
  afterState?: any;
}

class InteractionController {
  private permissions: Set<InteractionAction>;
  private requireConfirmation: Set<InteractionAction>;
  
  constructor(config: InteractionConfig) {
    this.permissions = new Set(config.allowedActions || []);
    this.requireConfirmation = new Set(config.confirmationRequired || ['click']);
  }
  
  async execute(request: InteractionRequest): Promise<InteractionResult> {
    // Check permission
    if (!this.permissions.has(request.action)) {
      return {
        success: false,
        action: request.action,
        target: request.target,
        error: 'Action not permitted'
      };
    }
    
    // Find target element
    const element = this.findElement(request.target);
    if (!element) {
      return {
        success: false,
        action: request.action,
        target: request.target,
        error: 'Element not found'
      };
    }
    
    // Check if confirmation required
    if (this.requireConfirmation.has(request.action) && !request.confirmation) {
      const confirmed = await this.requestConfirmation(request, element);
      if (!confirmed) {
        return {
          success: false,
          action: request.action,
          target: request.target,
          error: 'User declined'
        };
      }
    }
    
    // Execute action
    const beforeState = this.captureState(element);
    
    try {
      await this.performAction(request.action, element, request.value);
      const afterState = this.captureState(element);
      
      return {
        success: true,
        action: request.action,
        target: request.target,
        beforeState,
        afterState
      };
    } catch (error) {
      return {
        success: false,
        action: request.action,
        target: request.target,
        error: error.message
      };
    }
  }
  
  private async performAction(
    action: InteractionAction, 
    element: HTMLElement, 
    value?: string
  ): Promise<void> {
    switch (action) {
      case 'highlight':
        await this.highlightElement(element);
        break;
      case 'scroll-to':
        await this.scrollToElement(element);
        break;
      case 'click':
        await this.clickElement(element);
        break;
      case 'fill':
        await this.fillElement(element, value || '');
        break;
      case 'focus':
        element.focus();
        break;
      case 'select':
        await this.selectOption(element, value || '');
        break;
    }
  }
  
  private async highlightElement(element: HTMLElement): Promise<void> {
    const originalOutline = element.style.outline;
    const originalBackground = element.style.backgroundColor;
    
    // Add highlight
    element.style.outline = '3px solid #FFD700';
    element.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
    
    // Wait for visibility
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Restore original styles
    element.style.outline = originalOutline;
    element.style.backgroundColor = originalBackground;
  }
  
  private async scrollToElement(element: HTMLElement): Promise<void> {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    
    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
```

---

## Data Flow Architecture

### Context Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Page                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │   DOM     │  │  Forms    │  │  Events   │  │  Styles   │    │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │
└────────┼──────────────┼──────────────┼──────────────┼──────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Context Providers                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ PageContext    │  │ UserBehavior   │  │ FormAnalysis   │    │
│  │ Provider       │  │ Provider       │  │ Provider       │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
└──────────┼───────────────────┼───────────────────┼──────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Context Aggregator                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Merge context from all providers                      │   │
│  │  • Prioritize by relevance                               │   │
│  │  • Optimize for token limits                             │   │
│  │  • Cache for repeated queries                            │   │
│  └────────────────────────┬────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Context Injection                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  System Prompt:                                          │   │
│  │  "You are Clippy, a helpful assistant on this webpage.   │   │
│  │   Current page context:                                  │   │
│  │   - Type: e-commerce product page                        │   │
│  │   - User is viewing: Product XYZ                         │   │
│  │   - User has been on page: 45 seconds                    │   │
│  │   - User has scrolled to: 60% depth                      │   │
│  │   - Available actions: Add to cart, Compare, Share..."   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Proactive Trigger Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Proactive Behavior Engine                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Trigger Checks                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Time-based  │  │ Behavior-   │  │ Context-    │     │   │
│  │  │ (idle)      │  │ based       │  │ based       │     │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │   │
│  │         │                │                │             │   │
│  │         └────────────────┼────────────────┘             │   │
│  │                          ▼                               │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │               Trigger Prioritizer                │   │   │
│  │  │  • Score triggers by relevance                   │   │   │
│  │  │  • Check intrusion level settings                │   │   │
│  │  │  • Verify cooldown periods                       │   │   │
│  │  └──────────────────────────┬──────────────────────┘   │   │
│  └─────────────────────────────┼───────────────────────────┘   │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Trigger Handler                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Example Triggers:                                        │   │
│  │                                                           │   │
│  │  1. Form Confusion                                        │   │
│  │     User has been on a required field for > 30s          │   │
│  │     → "Having trouble with this field? I can explain."   │   │
│  │                                                           │   │
│  │  2. Navigation Help                                       │   │
│  │     User scrolled past target section 2x                 │   │
│  │     → "Looking for something? I can help you find it."   │   │
│  │                                                           │   │
│  │  3. Checkout Assistance                                   │   │
│  │     User on checkout page, cart has items                │   │
│  │     → "Ready to checkout? I can guide you through it."   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Content Security Policy (CSP) Compatibility

```typescript
// CSP-compliant implementation

class CSPCompliantLoader {
  // Use nonces provided by host page
  private nonce: string | null;
  
  constructor() {
    this.nonce = this.findNonce();
  }
  
  private findNonce(): string | null {
    // Check for nonce in existing scripts
    const scripts = document.querySelectorAll('script[nonce]');
    if (scripts.length > 0) {
      return scripts[0].getAttribute('nonce');
    }
    return null;
  }
  
  // Inject inline styles with nonce
  injectStyles(css: string): void {
    const style = document.createElement('style');
    if (this.nonce) {
      style.setAttribute('nonce', this.nonce);
    }
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  // Use eval-free code
  // Avoid: eval(), new Function(), setTimeout(string)
  // Prefer: setTimeout(fn, ms), imported modules
}
```

### Data Privacy

```typescript
// Privacy-first data handling

interface PrivacyConfig {
  collectPII: boolean;        // Personal identifiable info
  shareWithThirdParties: boolean;
  persistAcrossSessions: boolean;
  dataRetentionDays: number;
}

class PrivacyManager {
  private config: PrivacyConfig;
  private consent: ConsentState;
  
  async requestConsent(): Promise<boolean> {
    // Show consent dialog
    const result = await this.showConsentDialog();
    this.consent = {
      granted: result.accepted,
      timestamp: new Date(),
      scopes: result.scopes
    };
    
    // Store consent
    this.persistConsent();
    
    return result.accepted;
  }
  
  sanitizeForTransmit(data: any): any {
    // Remove PII if not consented
    if (!this.consent.scopes.includes('pii')) {
      data = this.removePII(data);
    }
    
    // Anonymize identifiers
    data = this.anonymizeIdentifiers(data);
    
    return data;
  }
  
  private removePII(data: any): any {
    // Remove email addresses, phone numbers, names
    // Use regex patterns and ML detection
    return data;
  }
}
```

---

## Performance Optimization

### Lazy Loading

```typescript
class LazyLoader {
  private loadedModules: Map<string, Promise<any>>;
  
  async loadModule(name: string): Promise<any> {
    if (this.loadedModules.has(name)) {
      return this.loadedModules.get(name);
    }
    
    const promise = this.doLoad(name);
    this.loadedModules.set(name, promise);
    return promise;
  }
  
  private async doLoad(name: string): Promise<any> {
    switch (name) {
      case 'agent-animation':
        return import('./agent-animation');
      case 'chat-interface':
        return import('./chat-interface');
      case 'page-parser':
        return import('./page-parser');
      default:
        throw new Error(`Unknown module: ${name}`);
    }
  }
}
```

### Context Caching

```typescript
class ContextCache {
  private cache: Map<string, CachedContext>;
  private ttl: number = 30000; // 30 seconds
  
  get(key: string): CachedContext | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }
  
  set(key: string, context: any): void {
    this.cache.set(key, {
      context,
      expiry: Date.now() + this.ttl
    });
  }
  
  // Invalidate on DOM changes
  invalidateOnChange(): void {
    const observer = new MutationObserver(() => {
      this.cache.clear();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}
```

---

## Browser Extension Architecture

### Manifest V3 Structure

```
extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   ├── clippy-injector.js
│   └── styles.css
├── popup/
│   ├── popup.html
│   └── popup.js
├── options/
│   ├── options.html
│   └── options.js
└── assets/
    ├── agents/
    └── icons/
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Clippy Browser Assistant",
  "version": "1.0.0",
  "description": "Your AI-powered browser companion",
  
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  
  "host_permissions": [
    "https://api.clippyjs.org/*"
  ],
  
  "background": {
    "service_worker": "background/service-worker.js"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/clippy-injector.js"],
      "css": ["content/styles.css"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/PageParser.test.ts

describe('SemanticExtractor', () => {
  it('should classify e-commerce pages correctly', async () => {
    // Setup mock DOM
    document.body.innerHTML = `
      <div itemscope itemtype="https://schema.org/Product">
        <h1>Product Name</h1>
        <span itemprop="price">$99.99</span>
      </div>
    `;
    
    const extractor = new SemanticExtractor();
    const result = await extractor.extract();
    
    expect(result.contentType).toBe('product');
  });
  
  it('should extract form fields correctly', () => {
    document.body.innerHTML = `
      <form>
        <input name="email" type="email" required>
        <input name="password" type="password" required>
      </form>
    `;
    
    const analyzer = new FormAnalyzer();
    const forms = analyzer.detectAllForms();
    
    expect(forms).toHaveLength(1);
    expect(forms[0].fields).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
// tests/integration/Embedding.test.ts

describe('ClippyEmbedder', () => {
  let embedder: ClippyEmbedder;
  
  beforeEach(() => {
    embedder = new ClippyEmbedder({
      apiKey: 'test-key',
      agentName: 'Clippy'
    });
  });
  
  afterEach(() => {
    embedder.destroy();
  });
  
  it('should create shadow DOM host', async () => {
    await embedder.init();
    
    const host = document.getElementById('clippy-assistant-root');
    expect(host).toBeTruthy();
    expect(host.shadowRoot).toBeTruthy();
  });
  
  it('should isolate styles from host page', async () => {
    await embedder.init();
    
    // Host page styles should not affect Clippy
    const clippyElement = embedder.getShadowElement('.clippy-agent');
    const computed = getComputedStyle(clippyElement);
    
    expect(computed.fontFamily).not.toBe('host-page-font');
  });
});
```

### E2E Tests

```typescript
// tests/e2e/UserJourney.test.ts

describe('Browser Assistant E2E', () => {
  it('should help user complete a form', async () => {
    await page.goto('https://example.com/form-page');
    
    // Clippy should appear
    await page.waitForSelector('#clippy-assistant-root');
    
    // User clicks on Clippy
    await page.click('.clippy-agent');
    
    // Chat panel opens
    await page.waitForSelector('.chat-panel');
    
    // User asks for help
    await page.type('.chat-input', 'Help me fill this form');
    await page.press('.chat-input', 'Enter');
    
    // Clippy responds with form assistance
    await page.waitForSelector('.chat-response');
    const response = await page.textContent('.chat-response');
    
    expect(response).toContain('form');
    expect(response).toContain('field');
  });
});
```

---

## Deployment Architecture

### CDN Distribution

```
cdn.clippyjs.org/
├── assistant/
│   └── v1/
│       ├── clippy.min.js          # Main bundle (~80KB gzip)
│       ├── clippy.min.js.map      # Source map
│       ├── agents/                # Agent assets
│       │   ├── clippy.json
│       │   ├── clippy.png
│       │   └── ...
│       └── themes/                # Theme CSS
│           ├── light.css
│           └── dark.css
```

### API Endpoints

```
api.clippyjs.org/
├── /v1/chat                        # Chat completions
├── /v1/stream                      # Streaming responses
├── /v1/context                     # Context analysis
├── /v1/agents                      # Agent configurations
└── /v1/analytics                   # Usage analytics
```

---

## Migration Path

### From Current React Library

```typescript
// Before (React-only)
import { ClippyProvider, useClippy } from '@clippyjs/react';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

// After (Universal)
import { ClippyAssistant } from '@clippyjs/browser-assistant';

// React wrapper still works
import { BrowserClippy } from '@clippyjs/browser-assistant/react';
```

---

## Appendix A: API Types

See [API_SPECIFICATION.md](./API_SPECIFICATION.md)

## Appendix B: Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `EMBED_001` | Shadow DOM not supported | Use fallback renderer |
| `PARSE_001` | DOM parsing failed | Retry with debounce |
| `AI_001` | API key invalid | Check configuration |
| `AI_002` | Rate limit exceeded | Wait and retry |
| `INT_001` | Interaction not permitted | Check permissions config |

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Feb 2026 | Engineering | Initial architecture |
