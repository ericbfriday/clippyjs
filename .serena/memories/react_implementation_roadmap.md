# ClippyJS React Transition - Implementation Roadmap

**Document Version**: 1.0  
**Created**: 2025-10-20  
**Reference**: react_transition_specification.md

## Overview

This roadmap breaks down the React transition into 5 distinct phases with clear deliverables, dependencies, and acceptance criteria.

## Phase 1: Package Architecture & Separation

**Duration**: 1-2 weeks  
**Priority**: P0 (Critical)  
**Dependencies**: None

### Objectives
- Separate vanilla JS and React into distinct packages
- Establish monorepo build configuration
- Set up asset bundling strategy
- Create package publication workflow

### Tasks

#### 1.1 Create Package Structure
```bash
packages/
├── core/              # @clippyjs/core (vanilla JS)
├── react/             # @clippyjs/react (primary)
├── storybook/         # Storybook instance
└── templates/         # Starter templates
```

**Steps:**
1. Create `packages/core/` directory
2. Move Agent, Animator, Balloon, Queue to core
3. Move loader functions to core
4. Create `packages/react/` directory
5. Move React components (ClippyProvider, Clippy) to react
6. Update import paths

**Acceptance Criteria:**
- [ ] Both packages compile independently
- [ ] `@clippyjs/react` imports from `@clippyjs/core` successfully
- [ ] No circular dependencies
- [ ] TypeScript builds without errors

#### 1.2 Configure Build Systems

**Core Package (`packages/core/rollup.config.js`):**
```javascript
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'cjs' },
    { file: 'dist/index.esm.js', format: 'esm' }
  ],
  external: [], // No external deps for core
  plugins: [
    typescript(),
    terser()
  ]
};
```

**React Package (`packages/react/rollup.config.js`):**
```javascript
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'cjs' },
    { file: 'dist/index.esm.js', format: 'esm' }
  ],
  external: ['react', 'react-dom', '@clippyjs/core'],
  plugins: [
    typescript(),
    terser(),
    copy({
      targets: [
        { src: '../core/assets/*', dest: 'assets' }
      ]
    })
  ]
};
```

**Acceptance Criteria:**
- [ ] Core builds to CommonJS and ESM
- [ ] React builds with externalized dependencies
- [ ] Assets copied during React build
- [ ] Type definitions generated for both packages
- [ ] Source maps available for debugging

#### 1.3 Configure Package.json Files

**Core Package:**
```json
{
  "name": "@clippyjs/core",
  "version": "1.0.0",
  "description": "ClippyJS core library (DEPRECATED)",
  "deprecated": "This package is deprecated. Use @clippyjs/react instead.",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "assets"
  ],
  "scripts": {
    "build": "rollup -c",
    "clean": "rm -rf dist",
    "prepublishOnly": "yarn clean && yarn build"
  }
}
```

**React Package:**
```json
{
  "name": "@clippyjs/react",
  "version": "1.0.0",
  "description": "Add Clippy to any React website",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "assets"
  ],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@clippyjs/core": "workspace:*"
  },
  "scripts": {
    "build": "rollup -c",
    "clean": "rm -rf dist",
    "prepublishOnly": "yarn clean && yarn build"
  }
}
```

**Acceptance Criteria:**
- [ ] Workspace dependencies configured correctly
- [ ] Peer dependencies specified for React
- [ ] Package files include only dist and assets
- [ ] Build scripts work from root and package directories

#### 1.4 Asset Management

**Create asset build pipeline:**
1. Copy assets from core to react during build
2. Verify all 10 agents have complete assets
3. Optimize asset sizes if needed
4. Document asset usage in README

**Acceptance Criteria:**
- [ ] All agent assets available in react package
- [ ] Asset paths configurable via basePath
- [ ] Assets not bundled in JavaScript
- [ ] Asset loading works in development and production

### Phase 1 Deliverables
- ✅ Separate @clippyjs/core and @clippyjs/react packages
- ✅ Working build configuration for both packages
- ✅ Asset bundling and distribution setup
- ✅ Workspace dependencies configured

---

## Phase 2: Enhanced Hook API & Auto-Cleanup

**Duration**: 1 week  
**Priority**: P0 (Critical)  
**Dependencies**: Phase 1 complete

### Objectives
- Implement enhanced useAgent hook with all Agent methods
- Add auto-cleanup on component unmount
- Support multiple concurrent agents
- Ensure SSR compatibility

### Tasks

#### 2.1 Enhanced useAgent Hook

**File**: `packages/react/src/useAgent.ts`

**Implementation:**
```typescript
export function useAgent(
  name: AgentName,
  options: UseAgentOptions = {}
): UseAgentReturn {
  const { loadAgent, getAgent, unloadAgent } = useClippy();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  
  // Auto-load logic
  useEffect(() => {
    if (!options.autoLoad) return;
    load();
  }, [name, options.autoLoad]);
  
  // Auto-cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (agent && options.autoCleanup !== false) {
        agent.destroy();
        unloadAgent(name);
      }
    };
  }, [agent, name]);
  
  // Method implementations...
  const load = async () => { /* ... */ };
  const show = async () => { /* ... */ };
  const hide = async () => { /* ... */ };
  // ... all other methods
  
  return {
    agent,
    loading,
    error,
    load,
    unload,
    show,
    hide,
    play,
    animate,
    speak,
    moveTo,
    gestureAt,
    stop,
    stopCurrent,
    pause,
    resume,
    getAnimations,
    hasAnimation,
    isVisible,
  };
}
```

**Acceptance Criteria:**
- [ ] All Agent methods exposed via hook
- [ ] Auto-load works when enabled
- [ ] Auto-cleanup prevents memory leaks
- [ ] Loading and error states managed correctly
- [ ] TypeScript types fully defined
- [ ] Mounted check prevents state updates after unmount

#### 2.2 Multiple Agent Support

**ClippyProvider Enhancement:**
```typescript
interface ClippyProviderProps {
  children: ReactNode;
  basePath?: string;
  maxAgents?: number; // NEW
  soundEnabled?: boolean;
  onError?: (error: Error) => void;
}

export const ClippyProvider: React.FC<ClippyProviderProps> = ({
  children,
  maxAgents = 5, // Default limit
  ...props
}) => {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());
  
  const loadAgent = async (name: string, options?: LoadOptions) => {
    // Check max agents limit
    if (agents.size >= maxAgents) {
      throw new Error(`Maximum ${maxAgents} agents allowed`);
    }
    // ... load logic
  };
  
  // ... rest of implementation
};
```

**Acceptance Criteria:**
- [ ] Multiple agents can be loaded simultaneously
- [ ] maxAgents limit enforced
- [ ] Each agent has independent state
- [ ] No conflicts between agents
- [ ] Agents can be unloaded individually

#### 2.3 SSR Compatibility

**Add client-side detection:**
```typescript
export function useAgent(name: AgentName, options?: UseAgentOptions) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (!isClient) return;
    // Only execute client-side operations
  }, [isClient]);
  
  return {
    // ... hook API
  };
}
```

**Test with Next.js:**
```typescript
// pages/_app.tsx
import { ClippyProvider } from '@clippyjs/react';
import '@clippyjs/react/dist/styles.css';

export default function App({ Component, pageProps }) {
  return (
    <ClippyProvider>
      <Component {...pageProps} />
    </ClippyProvider>
  );
}

// pages/index.tsx
import dynamic from 'next/dynamic';

const ClippyDemo = dynamic(
  () => import('../components/ClippyDemo'),
  { ssr: false }
);
```

**Acceptance Criteria:**
- [ ] No hydration errors in Next.js
- [ ] No window/document access during SSR
- [ ] Client-side only checks in place
- [ ] Works with Next.js app router
- [ ] Works with Remix

### Phase 2 Deliverables
- ✅ Enhanced useAgent hook with all methods
- ✅ Auto-cleanup on unmount
- ✅ Multiple agent support with limits
- ✅ SSR compatibility verified

---

## Phase 3: Documentation & Examples

**Duration**: 2 weeks  
**Priority**: P0 (Critical)  
**Dependencies**: Phase 2 complete

### Objectives
- Create comprehensive API reference
- Write getting started guide
- Develop TypeScript usage examples
- Set up documentation site infrastructure

### Tasks

#### 3.1 API Reference Documentation

**Structure:**
```
docs/
├── api-reference/
│   ├── hooks/
│   │   ├── useAgent.md
│   │   └── useClippy.md
│   ├── components/
│   │   ├── ClippyProvider.md
│   │   └── Clippy.md
│   ├── types/
│   │   └── index.md
│   └── advanced/
│       ├── custom-assets.md
│       ├── multiple-agents.md
│       └── error-handling.md
```

**Content Requirements:**
- Description and purpose
- Parameters/props with types
- Return values
- Code examples
- Common patterns
- Troubleshooting

**Acceptance Criteria:**
- [ ] All hooks documented
- [ ] All components documented
- [ ] All types documented
- [ ] Code examples tested and working
- [ ] Search functionality works

#### 3.2 Getting Started Guide

**Tutorial Flow:**
1. Installation
2. Setup ClippyProvider
3. Use useAgent hook
4. Make agent speak
5. Play animations
6. Move agent around
7. Multiple agents
8. Error handling

**Acceptance Criteria:**
- [ ] Step-by-step tutorial complete
- [ ] All code examples working
- [ ] Screenshots/GIFs included
- [ ] Covers both Next.js and Vite
- [ ] < 10 minutes to first agent

#### 3.3 TypeScript Examples

**Examples to create:**
1. Basic TypeScript setup
2. Strict mode usage
3. Custom type definitions
4. Generic agent utilities
5. Type-safe animations
6. Advanced hook patterns

**Acceptance Criteria:**
- [ ] All examples type-check
- [ ] Strict mode enabled
- [ ] IntelliSense works
- [ ] No `any` types
- [ ] Clear type annotations

#### 3.4 Interactive Examples

**CodeSandbox Templates:**
1. Basic Usage
2. Multiple Agents
3. Custom Animations Sequence
4. Error Handling
5. Next.js Integration
6. Vite Integration
7. Advanced Controls

**Acceptance Criteria:**
- [ ] 7+ interactive examples
- [ ] Examples fork-able
- [ ] All dependencies locked
- [ ] Examples load quickly
- [ ] Mobile-friendly

### Phase 3 Deliverables
- ✅ Complete API reference
- ✅ Getting started guide
- ✅ TypeScript examples
- ✅ 7+ interactive CodeSandbox examples

---

## Phase 4: Storybook Instance

**Duration**: 1 week  
**Priority**: P1 (High)  
**Dependencies**: Phase 2 complete

### Objectives
- Set up Storybook for component testing and demos
- Create comprehensive stories for all features
- Enable interactive testing
- Provide visual regression baseline

### Tasks

#### 4.1 Storybook Setup

**Install and Configure:**
```bash
cd packages/storybook
yarn add -D @storybook/react-vite
yarn add -D storybook
npx storybook@latest init
```

**Configuration:**
```typescript
// .storybook/main.ts
export default {
  stories: ['../stories/**/*.stories.@(ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};
```

**Acceptance Criteria:**
- [ ] Storybook runs locally
- [ ] Hot reload works
- [ ] TypeScript support enabled
- [ ] Addons configured

#### 4.2 Create Stories

**Stories to Implement:**

1. **Introduction.mdx** - Overview and setup
2. **useAgent/Basic.stories.tsx** - Basic hook usage
3. **useAgent/AllMethods.stories.tsx** - All hook methods
4. **useAgent/Loading.stories.tsx** - Loading states
5. **useAgent/Error.stories.tsx** - Error handling
6. **Animations/Clippy.stories.tsx** - All Clippy animations
7. **Animations/Bonzi.stories.tsx** - All Bonzi animations
8. **MultipleAgents.stories.tsx** - Multiple concurrent agents
9. **CustomPositioning.stories.tsx** - Position control
10. **SpeechBalloons.stories.tsx** - Speech variations

**Story Template:**
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ClippyProvider } from '@clippyjs/react';
import { DemoComponent } from './DemoComponent';

const meta: Meta<typeof DemoComponent> = {
  title: 'Hooks/useAgent',
  component: DemoComponent,
  decorators: [
    (Story) => (
      <ClippyProvider>
        <Story />
      </ClippyProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DemoComponent>;

export const Basic: Story = {
  args: {
    agentName: 'Clippy',
    autoLoad: true,
  },
};
```

**Acceptance Criteria:**
- [ ] 10+ stories created
- [ ] All stories render correctly
- [ ] Interactive controls work
- [ ] Stories cover all features
- [ ] Documentation in stories

#### 4.3 Deploy Storybook

**Build and Deploy:**
```bash
yarn build-storybook
# Deploy to GitHub Pages or Netlify
```

**Acceptance Criteria:**
- [ ] Storybook builds successfully
- [ ] Deployed to public URL
- [ ] All stories work in production
- [ ] Performance acceptable

### Phase 4 Deliverables
- ✅ Working Storybook instance
- ✅ 10+ comprehensive stories
- ✅ Deployed to public URL
- ✅ Interactive demos functional

---

## Phase 5: Starter Templates

**Duration**: 1 week  
**Priority**: P1 (High)  
**Dependencies**: Phase 3 complete

### Objectives
- Create Next.js starter template
- Create Vite starter template
- Provide ready-to-use examples
- Document template usage

### Tasks

#### 5.1 Next.js Starter Template

**Structure:**
```
packages/templates/nextjs-starter/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── clippy-demo/
│       └── page.tsx
├── components/
│   └── ClippyDemo.tsx
├── public/
│   └── assets/
│       └── agents/
├── package.json
└── README.md
```

**Features:**
- ClippyProvider in layout
- Example page with useAgent
- Interactive demo component
- Asset setup instructions
- TypeScript configured
- App router compatible

**Acceptance Criteria:**
- [ ] Template initializes correctly
- [ ] No hydration errors
- [ ] All agents work
- [ ] TypeScript strict mode
- [ ] README comprehensive

#### 5.2 Vite Starter Template

**Structure:**
```
packages/templates/vite-starter/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── components/
│       └── ClippyDemo.tsx
├── public/
│   └── assets/
│       └── agents/
├── package.json
├── vite.config.ts
└── README.md
```

**Features:**
- ClippyProvider in App
- Example components
- Hot reload working
- Asset setup
- TypeScript configured

**Acceptance Criteria:**
- [ ] Template runs with `yarn dev`
- [ ] Hot reload works
- [ ] All agents work
- [ ] Build succeeds
- [ ] README comprehensive

#### 5.3 Template Documentation

**For each template:**
1. Prerequisites
2. Installation steps
3. Running locally
4. Building for production
5. Customization guide
6. Troubleshooting

**Acceptance Criteria:**
- [ ] Documentation complete
- [ ] Commands verified
- [ ] Common issues covered
- [ ] Customization examples

### Phase 5 Deliverables
- ✅ Next.js starter template
- ✅ Vite starter template
- ✅ Complete template documentation
- ✅ Templates tested and working

---

## Post-Release Roadmap

### Version 1.1.0 (1-2 months after release)
- Tree-shaking support
- Performance optimizations
- Additional agents support
- React Native compatibility exploration

### Version 1.2.0 (3-4 months after release)
- Webpack/Vite plugins for auto-asset copying
- CSS modules support
- Animation builder tool
- Custom agent creation guide

### Version 2.0.0 (6-12 months after release)
- API redesign based on feedback
- Breaking changes if needed
- New features from community requests

## Implementation Checklist

### Phase 1: Package Architecture ✅
- [ ] Package separation complete
- [ ] Build configuration working
- [ ] Asset bundling operational
- [ ] Dependencies configured

### Phase 2: Enhanced API ✅
- [ ] useAgent hook enhanced
- [ ] Auto-cleanup implemented
- [ ] Multiple agents supported
- [ ] SSR compatible

### Phase 3: Documentation ✅
- [ ] API reference complete
- [ ] Getting started guide
- [ ] TypeScript examples
- [ ] Interactive examples

### Phase 4: Storybook ✅
- [ ] Storybook setup
- [ ] Stories created
- [ ] Deployed publicly

### Phase 5: Templates ✅
- [ ] Next.js template
- [ ] Vite template
- [ ] Documentation complete

## Success Metrics

**Technical:**
- All phases completed
- Zero critical bugs
- TypeScript strict mode passing
- Bundle size < 50KB

**Documentation:**
- API reference 100% coverage
- 7+ interactive examples
- 2 starter templates
- Storybook deployed

**Developer Experience:**
- < 5 min to first agent
- IntelliSense working
- Clear error messages
- Hot reload functional

## Risk Mitigation

**Risk**: Asset bundling increases package size  
**Mitigation**: Document CDN fallback option, consider lazy loading

**Risk**: SSR compatibility issues  
**Mitigation**: Extensive testing with Next.js and Remix, clear docs

**Risk**: Breaking changes during development  
**Mitigation**: Version lock all dependencies, comprehensive tests

**Risk**: Timeline overruns  
**Mitigation**: Prioritize P0 features, defer P2/P3 to future versions
