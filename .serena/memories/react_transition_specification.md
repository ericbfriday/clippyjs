# ClippyJS React Component Transition - Technical Specification

**Document Version**: 1.0  
**Created**: 2025-10-20  
**Status**: Requirements Approved, Ready for Implementation

## Executive Summary

Transform the ClippyJS library into a standalone, fully-packaged React component library with hook-based imperative API, comprehensive documentation, and modern developer experience.

**Key Decisions:**
- Separate packages for vanilla JS (deprecated) and React (primary)
- Imperative hook-based API as primary interface
- Auto-cleanup with multiple agent support
- Bundled assets with separate CSS file
- Full TypeScript support with SSR awareness
- Comprehensive documentation including Storybook and starter templates

## 1. Package Architecture

### 1.1 Package Separation Strategy

**Current State**: Single `clippyjs` package with both vanilla and React APIs

**Target State**: Two separate packages

#### Package 1: `@clippyjs/core` (Vanilla JS - Deprecated)
```json
{
  "name": "@clippyjs/core",
  "version": "1.0.0",
  "description": "ClippyJS core library (DEPRECATED - use @clippyjs/react)",
  "deprecated": "This package is deprecated. Please use @clippyjs/react instead.",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts"
}
```

**Contents:**
- Core classes: Agent, Animator, Balloon, Queue
- Loader functions
- TypeScript types
- NO React dependencies

**Purpose**: 
- Provide vanilla JS API for legacy users
- Serve as internal dependency for React package
- Mark as deprecated, minimal maintenance

#### Package 2: `@clippyjs/react` (Primary Package)
```json
{
  "name": "@clippyjs/react",
  "version": "1.0.0",
  "description": "Add Clippy or his friends to any React website for instant nostalgia",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@clippyjs/core": "^1.0.0"
  }
}
```

**Contents:**
- ClippyProvider context
- useClippy hook (context consumer)
- useAgent hook (primary imperative API)
- Clippy component (optional declarative API)
- Re-exported types from @clippyjs/core
- Bundled agent assets
- Separate CSS file

### 1.2 Monorepo Structure

```
clippyjs/
├── packages/
│   ├── core/                      # @clippyjs/core (vanilla JS)
│   │   ├── src/
│   │   │   ├── Agent.ts
│   │   │   ├── Animator.ts
│   │   │   ├── Balloon.ts
│   │   │   ├── Queue.ts
│   │   │   ├── loader.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── assets/                # Agent sprite data
│   │   ├── dist/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── rollup.config.js
│   │
│   ├── react/                     # @clippyjs/react (primary)
│   │   ├── src/
│   │   │   ├── ClippyProvider.tsx
│   │   │   ├── useAgent.ts        # Enhanced hook
│   │   │   ├── Clippy.tsx         # Optional component
│   │   │   ├── index.ts
│   │   │   └── styles.css
│   │   ├── assets/                # Bundled assets (copied)
│   │   ├── dist/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── rollup.config.js
│   │
│   ├── storybook/                 # Storybook for testing/demo
│   │   ├── stories/
│   │   ├── .storybook/
│   │   └── package.json
│   │
│   └── templates/                 # Starter templates
│       ├── nextjs-starter/
│       ├── vite-starter/
│       └── README.md
│
├── docs/                          # Documentation site
│   ├── api-reference/
│   ├── getting-started/
│   ├── examples/
│   └── migration-guide/
│
├── package.json                   # Root workspace
└── README.md
```

## 2. API Design

### 2.1 Primary API: useAgent Hook (Imperative)

**Enhanced Hook Design:**

```typescript
interface UseAgentOptions {
  /** Auto-load agent on mount */
  autoLoad?: boolean;
  /** Auto-show agent after loading */
  autoShow?: boolean;
  /** Initial position */
  initialPosition?: { x: number; y: number };
  /** Initial message to speak */
  initialMessage?: string;
  /** Base path for assets (optional override) */
  basePath?: string;
}

interface UseAgentReturn {
  // State
  agent: Agent | null;
  loading: boolean;
  error: Error | null;
  
  // Lifecycle
  load: () => Promise<Agent>;
  unload: () => void;
  reload: () => Promise<Agent>;
  
  // Agent Methods (convenience wrappers)
  show: () => Promise<void>;
  hide: () => Promise<void>;
  play: (animation: string) => Promise<void>;
  animate: () => Promise<void>;
  speak: (text: string, hold?: boolean) => Promise<void>;
  moveTo: (x: number, y: number, duration?: number) => Promise<void>;
  gestureAt: (x: number, y: number) => Promise<void>;
  stop: () => void;
  stopCurrent: () => void;
  pause: () => void;
  resume: () => void;
  
  // Utilities
  getAnimations: () => string[];
  hasAnimation: (name: string) => boolean;
  isVisible: () => boolean;
}

function useAgent(
  name: AgentName,
  options?: UseAgentOptions
): UseAgentReturn;
```

**Usage Example:**
```typescript
function MyComponent() {
  const clippy = useAgent('Clippy', {
    autoLoad: true,
    autoShow: true,
    initialPosition: { x: 100, y: 100 }
  });
  
  const handleGreet = async () => {
    await clippy.speak('Hello! Need help?');
    await clippy.play('Wave');
  };
  
  if (clippy.loading) return <div>Loading Clippy...</div>;
  if (clippy.error) return <div>Error: {clippy.error.message}</div>;
  
  return (
    <div>
      <button onClick={handleGreet}>Greet</button>
      <button onClick={() => clippy.hide()}>Hide</button>
      <button onClick={() => clippy.show()}>Show</button>
    </div>
  );
}
```

### 2.2 Secondary API: Declarative Component (Optional)

**For simple use cases, provide declarative component:**

```typescript
interface ClippyProps {
  name: AgentName;
  autoShow?: boolean;
  position?: { x: number; y: number };
  message?: string;
  animation?: string;
  onLoad?: (agent: Agent) => void;
  onError?: (error: Error) => void;
}

<Clippy 
  name="Clippy" 
  autoShow 
  position={{ x: 100, y: 100 }}
  message="Hello!"
  onLoad={(agent) => console.log('Loaded!', agent)}
/>
```

### 2.3 ClippyProvider Configuration

**Enhanced Provider:**

```typescript
interface ClippyProviderProps {
  children: ReactNode;
  /** Base path for all agents */
  basePath?: string;
  /** Maximum concurrent agents */
  maxAgents?: number;
  /** Default sound enabled */
  soundEnabled?: boolean;
  /** Global error handler */
  onError?: (error: Error) => void;
}

<ClippyProvider 
  basePath="/assets/agents"
  maxAgents={3}
  soundEnabled={true}
>
  <App />
</ClippyProvider>
```

## 3. Implementation Requirements

### 3.1 Feature Parity Checklist

**All vanilla JS Agent methods must be accessible:**

- [x] show() - Display agent
- [x] hide() - Hide agent  
- [x] play(animation) - Play specific animation
- [x] animate() - Play random animation
- [x] speak(text, hold) - Show speech balloon
- [x] closeBalloon() - Close speech balloon
- [x] moveTo(x, y, duration) - Move to position
- [x] gestureAt(x, y) - Point at location
- [x] stop() - Stop all actions
- [x] stopCurrent() - Stop current action
- [x] pause() - Pause animations
- [x] resume() - Resume animations
- [x] delay(ms) - Add delay to queue
- [x] getAnimations() - Get available animations
- [x] hasAnimation(name) - Check animation exists
- [x] isVisible() - Check visibility
- [x] destroy() - Cleanup (auto-handled by hook)

**Additional React-specific features:**

- [ ] Auto-cleanup on unmount
- [ ] Multiple concurrent agents support
- [ ] Loading/error states
- [ ] SSR compatibility (client-side only checks)
- [ ] TypeScript strict mode support

### 3.2 Asset Bundling Strategy

**Current**: CDN-only asset loading  
**Target**: Bundled assets with CDN fallback

#### Asset Organization
```
packages/react/assets/
├── agents/
│   ├── Clippy/
│   │   ├── agent.json      # Sprite data
│   │   ├── map.png         # Sprite sheet
│   │   └── sounds/         # Audio files
│   ├── Bonzi/
│   ├── F1/
│   ├── Genie/
│   ├── Genius/
│   ├── Links/
│   ├── Merlin/
│   ├── Peedy/
│   ├── Rocky/
│   └── Rover/
└── clippy.css              # Base styles
```

#### Build Process
1. Copy assets from @clippyjs/core during build
2. Include in package distribution (not bundled in JS)
3. Users copy to public folder or serve statically
4. Provide webpack/vite plugins for auto-copy (future)

#### Asset Loading
```typescript
// Default: bundled assets
const agent = await loadAgent('Clippy'); 
// Uses: /assets/agents/Clippy/agent.json

// Override: custom path
const agent = await loadAgent('Clippy', { 
  basePath: 'https://cdn.example.com/agents' 
});
```

### 3.3 CSS Strategy

**Separate CSS file approach:**

**File**: `packages/react/dist/styles.css`

**Import methods:**
```typescript
// Method 1: Manual import in app
import '@clippyjs/react/dist/styles.css';

// Method 2: Next.js _app.tsx
import '@clippyjs/react/dist/styles.css';

// Method 3: Vite main.tsx
import '@clippyjs/react/dist/styles.css';
```

**CSS Modules** (future consideration for tree-shaking):
```typescript
import styles from '@clippyjs/react/clippy.module.css';
```

### 3.4 TypeScript Configuration

**Strict Mode Enabled:**
```json
{
  "compilerOptions": {
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  }
}
```

**Exported Types:**
```typescript
// Re-export all core types
export type * from '@clippyjs/core';

// React-specific types
export type {
  UseAgentOptions,
  UseAgentReturn,
  ClippyProps,
  ClippyProviderProps,
};
```

### 3.5 SSR Compatibility

**Client-side only operations with SSR safety:**

```typescript
export function useAgent(name: AgentName, options?: UseAgentOptions) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Only load agent on client
  useEffect(() => {
    if (!isClient) return;
    // ... load logic
  }, [isClient, name]);
  
  return {
    // ... return hook API
  };
}
```

**Next.js Dynamic Import Support:**
```typescript
import dynamic from 'next/dynamic';

const ClippyComponent = dynamic(
  () => import('@clippyjs/react').then(mod => mod.Clippy),
  { ssr: false }
);
```

## 4. Documentation Requirements

### 4.1 API Reference

**Comprehensive API documentation covering:**

1. **Installation**
   - npm/yarn/pnpm commands
   - Asset setup instructions
   - CSS import methods

2. **Hooks**
   - useAgent() with all options and return values
   - useClippy() context hook
   - Code examples for each method

3. **Components**
   - ClippyProvider props and usage
   - Clippy component (declarative API)

4. **Types**
   - All exported TypeScript types
   - AgentName union type
   - Animation names and behaviors

5. **Advanced**
   - Custom asset paths
   - Multiple agents
   - Animation sequencing
   - Error handling patterns

### 4.2 Getting Started Guide

**Step-by-step tutorial:**

1. Installation
2. Basic setup with ClippyProvider
3. First agent with useAgent hook
4. Making agent speak
5. Animations and movements
6. Multiple agents
7. Styling and customization

### 4.3 Interactive Examples

**CodeSandbox/StackBlitz examples:**

1. Basic Usage
2. Multiple Agents
3. Custom Animations
4. Next.js Integration
5. Vite Integration
6. TypeScript Advanced Usage
7. Error Handling
8. Custom Positioning

### 4.4 Starter Templates

**Full project templates:**

#### Next.js Starter
```
nextjs-starter/
├── app/
│   ├── layout.tsx           # ClippyProvider setup
│   ├── page.tsx             # Example usage
│   └── clippy-demo.tsx      # Interactive demo
├── public/
│   └── assets/              # Agent assets
├── package.json
└── README.md
```

#### Vite Starter
```
vite-starter/
├── src/
│   ├── App.tsx              # ClippyProvider setup
│   ├── ClippyDemo.tsx       # Interactive demo
│   └── main.tsx             # CSS import
├── public/
│   └── assets/              # Agent assets
├── package.json
└── README.md
```

### 4.5 Storybook Instance

**Storybook configuration:**

```
packages/storybook/
├── stories/
│   ├── Introduction.mdx
│   ├── useAgent.stories.tsx
│   ├── Clippy.stories.tsx
│   ├── ClippyProvider.stories.tsx
│   ├── Animations.stories.tsx
│   └── MultipleAgents.stories.tsx
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── manager.ts
└── package.json
```

**Stories to create:**
1. Basic Usage
2. All Agent Methods
3. All Animations (per agent)
4. Multiple Agents
5. Error States
6. Loading States
7. Custom Positioning
8. Speech Balloons
9. Interactive Controls

## 5. Implementation Gaps Analysis

### 5.1 Current State vs Target State

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Package Structure | Single package | Separate core + react | 🔴 Major |
| Hook API | Basic useAgent | Enhanced with all methods | 🟡 Moderate |
| Asset Strategy | CDN only | Bundled + CDN fallback | 🟡 Moderate |
| CSS | Inline/separate | Separate CSS file | 🟢 Minor |
| TypeScript | Strict mode | Strict mode | ✅ Complete |
| SSR Support | Partial | Full SSR awareness | 🟡 Moderate |
| Documentation | Basic README | Comprehensive | 🔴 Major |
| Examples | Demo apps | Interactive examples | 🔴 Major |
| Storybook | None | Full instance | 🔴 Major |
| Starter Templates | None | Next.js + Vite | 🔴 Major |

### 5.2 Priority Assessment

**P0 (Critical - Must Have):**
- Package separation (core + react)
- Enhanced useAgent hook with all methods
- Auto-cleanup on unmount
- Basic documentation (README, API reference)
- Asset bundling setup

**P1 (High - Should Have):**
- SSR compatibility improvements
- Storybook instance
- Getting started guide
- TypeScript usage examples
- CSS optimization

**P2 (Medium - Nice to Have):**
- Starter templates (Next.js, Vite)
- Interactive CodeSandbox examples
- Advanced documentation
- Tree-shaking support
- webpack/Vite plugins

**P3 (Low - Future Enhancements):**
- CSS modules
- Animation builder
- Custom agent support
- Performance monitoring
- Analytics integration

## 6. Migration Strategy

### 6.1 Vanilla JS Deprecation Plan

**Phase 1: Initial Release**
- Publish @clippyjs/core as v1.0.0
- Mark as deprecated in package.json
- Add deprecation notice to README

**Phase 2: 6 Months**
- Continue bug fixes only
- No new features
- Encourage migration to @clippyjs/react

**Phase 3: 12 Months**
- Final release
- Archive repository
- Redirect to @clippyjs/react

### 6.2 Versioning Strategy

**@clippyjs/core**: v1.0.0 (deprecated)
**@clippyjs/react**: v1.0.0 (primary)

**Semantic Versioning:**
- Major: Breaking API changes
- Minor: New features, backward compatible
- Patch: Bug fixes

**Example Roadmap:**
- v1.0.0: Initial release
- v1.1.0: Starter templates added
- v1.2.0: Tree-shaking support
- v2.0.0: API redesign (if needed)

## 7. Success Criteria

### 7.1 Technical Metrics

- [ ] 100% TypeScript strict mode compliance
- [ ] < 50KB gzipped bundle size (excluding assets)
- [ ] All Agent methods accessible via hook
- [ ] Zero memory leaks (auto-cleanup verified)
- [ ] SSR compatible (no client-side crashes)
- [ ] React 18 & 19 peer dependency support

### 7.2 Documentation Metrics

- [ ] Complete API reference
- [ ] Getting started guide
- [ ] 5+ interactive examples
- [ ] 2 starter templates (Next.js, Vite)
- [ ] Storybook with 10+ stories
- [ ] Migration guide from vanilla JS

### 7.3 Developer Experience

- [ ] < 5 minutes from install to first agent
- [ ] IntelliSense support in all major IDEs
- [ ] Clear error messages
- [ ] TypeScript autocomplete working
- [ ] Hot reload working in dev mode

## 8. Timeline Estimate

**Phase 1: Package Architecture (1-2 weeks)**
- Separate packages
- Build configuration
- Asset bundling setup

**Phase 2: Enhanced Hook API (1 week)**
- Implement enhanced useAgent
- Auto-cleanup logic
- SSR compatibility

**Phase 3: Documentation (2 weeks)**
- API reference
- Getting started guide
- TypeScript examples

**Phase 4: Storybook (1 week)**
- Setup Storybook
- Create stories
- Interactive demos

**Phase 5: Starter Templates (1 week)**
- Next.js starter
- Vite starter
- Documentation

**Total Estimated Time: 6-7 weeks**

## Next Steps

1. Review and approve specification
2. Create detailed task breakdown
3. Set up project board
4. Begin Phase 1 implementation
5. Iterate based on feedback
