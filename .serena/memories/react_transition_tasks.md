# ClippyJS React Transition - Actionable Task Breakdown

**Document Version**: 1.0  
**Created**: 2025-10-20  
**Reference**: react_transition_specification.md, react_implementation_roadmap.md

## Task Format

Each task includes:
- **ID**: Unique identifier
- **Phase**: Which implementation phase
- **Priority**: P0-P3 classification
- **Estimate**: Time estimate in hours
- **Dependencies**: Prerequisite tasks
- **Acceptance Criteria**: Clear completion criteria
- **Commands**: Specific commands to run

---

## Phase 1: Package Architecture

### TASK-1.1: Create Core Package Structure
**Priority**: P0  
**Estimate**: 4 hours  
**Dependencies**: None

**Steps:**
```bash
# 1. Create directory structure
mkdir -p packages/core/src
mkdir -p packages/core/assets

# 2. Move core files
mv packages/clippyjs-lib/src/Agent.ts packages/core/src/
mv packages/clippyjs-lib/src/Animator.ts packages/core/src/
mv packages/clippyjs-lib/src/Balloon.ts packages/core/src/
mv packages/clippyjs-lib/src/Queue.ts packages/core/src/
mv packages/clippyjs-lib/src/loader.ts packages/core/src/
mv packages/clippyjs-lib/src/types.ts packages/core/src/

# 3. Copy assets
cp -R packages/clippyjs-lib/assets/* packages/core/assets/

# 4. Create index.ts
touch packages/core/src/index.ts
```

**Acceptance Criteria:**
- [ ] packages/core/src/ contains all core TypeScript files
- [ ] packages/core/assets/ contains all 10 agent assets
- [ ] No React dependencies in core files
- [ ] All imports use relative paths

**Files to Create:**
- `packages/core/src/index.ts`
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/rollup.config.js`

---

### TASK-1.2: Create React Package Structure
**Priority**: P0  
**Estimate**: 3 hours  
**Dependencies**: TASK-1.1

**Steps:**
```bash
# 1. Create directory structure
mkdir -p packages/react/src
mkdir -p packages/react/assets

# 2. Move React files
mv packages/clippyjs-lib/src/ClippyProvider.tsx packages/react/src/
mv packages/clippyjs-lib/src/Clippy.tsx packages/react/src/

# 3. Create new files
touch packages/react/src/useAgent.ts
touch packages/react/src/index.ts
touch packages/react/src/styles.css
```

**Acceptance Criteria:**
- [ ] packages/react/src/ contains React components
- [ ] All React components import from @clippyjs/core
- [ ] No vanilla JS loader in React package
- [ ] CSS file created

**Files to Create:**
- `packages/react/src/index.ts`
- `packages/react/src/useAgent.ts`
- `packages/react/src/styles.css`
- `packages/react/package.json`
- `packages/react/tsconfig.json`
- `packages/react/rollup.config.js`

---

### TASK-1.3: Configure Core Package Build
**Priority**: P0  
**Estimate**: 2 hours  
**Dependencies**: TASK-1.1

**Create**: `packages/core/package.json`
```json
{
  "name": "@clippyjs/core",
  "version": "1.0.0",
  "description": "ClippyJS core library (DEPRECATED - use @clippyjs/react)",
  "deprecated": "This package is deprecated. Please use @clippyjs/react instead.",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "assets"],
  "scripts": {
    "build": "yarn clean && yarn build:ts && yarn build:bundle",
    "build:ts": "tsc",
    "build:bundle": "rollup -c",
    "clean": "rm -rf dist",
    "prepublishOnly": "yarn build"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^28.0.2",
    "@rollup/plugin-node-resolve": "^16.0.0",
    "@rollup/plugin-terser": "^0.4.4",
    "@rollup/plugin-typescript": "^12.1.2",
    "rollup": "^4.31.0",
    "typescript": "^5.7.3"
  }
}
```

**Create**: `packages/core/rollup.config.js`
```javascript
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
      rootDir: 'src',
    }),
    terser(),
  ],
};
```

**Commands to Test:**
```bash
cd packages/core
yarn install
yarn build
ls -la dist/  # Verify output files
```

**Acceptance Criteria:**
- [ ] `yarn build` completes without errors
- [ ] dist/ contains index.js, index.esm.js, index.d.ts
- [ ] Source maps generated
- [ ] Types resolve correctly
- [ ] Bundle size reasonable

---

### TASK-1.4: Configure React Package Build
**Priority**: P0  
**Estimate**: 3 hours  
**Dependencies**: TASK-1.2, TASK-1.3

**Create**: `packages/react/package.json`
```json
{
  "name": "@clippyjs/react",
  "version": "1.0.0",
  "description": "Add Clippy or his friends to any React website for instant nostalgia",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "assets"],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@clippyjs/core": "workspace:*"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^28.0.2",
    "@rollup/plugin-node-resolve": "^16.0.0",
    "@rollup/plugin-terser": "^0.4.4",
    "@rollup/plugin-typescript": "^12.1.2",
    "@types/react": "^19.1.16",
    "@types/react-dom": "^19.1.9",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "rollup": "^4.31.0",
    "rollup-plugin-copy": "^3.5.0",
    "typescript": "^5.7.3"
  },
  "scripts": {
    "build": "yarn clean && yarn build:ts && yarn build:bundle && yarn build:css",
    "build:ts": "tsc",
    "build:bundle": "rollup -c",
    "build:css": "cp src/styles.css dist/styles.css",
    "clean": "rm -rf dist",
    "prepublishOnly": "yarn build"
  }
}
```

**Create**: `packages/react/rollup.config.js`
```javascript
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  external: ['react', 'react-dom', '@clippyjs/core'],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
      rootDir: 'src',
    }),
    copy({
      targets: [
        { src: '../core/assets/*', dest: 'assets' }
      ],
      hook: 'buildEnd'
    }),
    terser(),
  ],
};
```

**Commands to Test:**
```bash
cd packages/react
yarn install
yarn build
ls -la dist/  # Verify output files
ls -la assets/  # Verify assets copied
```

**Acceptance Criteria:**
- [ ] `yarn build` completes without errors
- [ ] dist/ contains index.js, index.esm.js, index.d.ts, styles.css
- [ ] assets/ directory populated from core
- [ ] React/React-DOM externalized (not bundled)
- [ ] @clippyjs/core externalized
- [ ] Bundle size < 50KB

---

### TASK-1.5: Update Root Workspace Configuration
**Priority**: P0  
**Estimate**: 1 hour  
**Dependencies**: TASK-1.3, TASK-1.4

**Update**: `package.json` (root)
```json
{
  "name": "clippyjs-workspace",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "yarn workspaces foreach -pt run build",
    "clean": "yarn workspaces foreach run clean",
    "build:core": "yarn workspace @clippyjs/core build",
    "build:react": "yarn workspace @clippyjs/react build"
  }
}
```

**Commands to Test:**
```bash
# From root
yarn install
yarn build:core
yarn build:react
yarn build  # Build all packages
```

**Acceptance Criteria:**
- [ ] Workspace commands work from root
- [ ] Core builds before React (dependency order)
- [ ] All packages build successfully
- [ ] Clean command removes all dist folders

---

## Phase 2: Enhanced Hook API

### TASK-2.1: Implement Enhanced useAgent Hook
**Priority**: P0  
**Estimate**: 6 hours  
**Dependencies**: TASK-1.4

**Create**: `packages/react/src/useAgent.ts`

**Implementation Outline:**
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { Agent, AgentName } from '@clippyjs/core';
import { useClippy } from './ClippyProvider';

export interface UseAgentOptions {
  autoLoad?: boolean;
  autoShow?: boolean;
  autoCleanup?: boolean;
  initialPosition?: { x: number; y: number };
  initialMessage?: string;
  basePath?: string;
}

export interface UseAgentReturn {
  // State
  agent: Agent | null;
  loading: boolean;
  error: Error | null;
  
  // Lifecycle
  load: () => Promise<Agent>;
  unload: () => void;
  reload: () => Promise<Agent>;
  
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

export function useAgent(
  name: AgentName,
  options: UseAgentOptions = {}
): UseAgentReturn {
  // Implementation here
}
```

**Key Features:**
1. Auto-load on mount if enabled
2. Auto-cleanup on unmount
3. Loading/error state management
4. Mounted ref to prevent state updates
5. All Agent methods wrapped
6. TypeScript strict mode compliant

**Acceptance Criteria:**
- [ ] All Agent methods accessible
- [ ] Auto-load works when enabled
- [ ] Auto-cleanup prevents memory leaks
- [ ] Loading/error states correct
- [ ] No state updates after unmount
- [ ] TypeScript types complete
- [ ] Works with multiple agents

**Test File**: `packages/react/src/useAgent.test.ts`

---

### TASK-2.2: Add SSR Compatibility
**Priority**: P0  
**Estimate**: 2 hours  
**Dependencies**: TASK-2.1

**Update**: `packages/react/src/useAgent.ts`

**Add client-side detection:**
```typescript
export function useAgent(name: AgentName, options: UseAgentOptions = {}) {
  const [isClient, setIsClient] = useState(false);
  
  // Detect client-side
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Only load on client
  useEffect(() => {
    if (!isClient) return;
    if (!options.autoLoad) return;
    load();
  }, [isClient, name, options.autoLoad]);
  
  // Rest of implementation
}
```

**Test with Next.js:**
```bash
cd packages/templates
npx create-next-app@latest nextjs-test --typescript
cd nextjs-test
yarn add @clippyjs/react@workspace:*
# Test SSR rendering
```

**Acceptance Criteria:**
- [ ] No window/document access during SSR
- [ ] No hydration errors in Next.js
- [ ] Works with app router
- [ ] Works with pages router
- [ ] No console warnings

---

### TASK-2.3: Enhance ClippyProvider for Multiple Agents
**Priority**: P0  
**Estimate**: 3 hours  
**Dependencies**: TASK-2.1

**Update**: `packages/react/src/ClippyProvider.tsx`

**Add maxAgents support:**
```typescript
interface ClippyProviderProps {
  children: ReactNode;
  basePath?: string;
  maxAgents?: number;
  soundEnabled?: boolean;
  onError?: (error: Error) => void;
}

export const ClippyProvider: React.FC<ClippyProviderProps> = ({
  children,
  basePath,
  maxAgents = 5,
  soundEnabled = true,
  onError,
}) => {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());
  
  const loadAgent = useCallback(async (
    name: string,
    options?: LoadOptions
  ): Promise<Agent> => {
    // Check max limit
    if (agents.size >= maxAgents) {
      const error = new Error(`Maximum ${maxAgents} agents allowed`);
      onError?.(error);
      throw error;
    }
    
    // Check if already loaded
    if (agents.has(name)) {
      return agents.get(name)!;
    }
    
    // Load agent
    try {
      const agent = await load(name, {
        basePath: options?.basePath || basePath,
        ...options,
      });
      
      setAgents(prev => new Map(prev).set(name, agent));
      return agent;
    } catch (err) {
      const error = err as Error;
      onError?.(error);
      throw error;
    }
  }, [agents, basePath, maxAgents, onError]);
  
  // ... rest of implementation
};
```

**Acceptance Criteria:**
- [ ] Multiple agents can load simultaneously
- [ ] maxAgents limit enforced
- [ ] Error callback invoked on errors
- [ ] Agents independently controlled
- [ ] No agent ID conflicts
- [ ] Memory cleanup on provider unmount

---

## Phase 3: Documentation

### TASK-3.1: Create API Reference
**Priority**: P0  
**Estimate**: 8 hours  
**Dependencies**: TASK-2.1, TASK-2.3

**Create Documentation Structure:**
```bash
mkdir -p docs/api-reference/{hooks,components,types,advanced}
```

**Files to Create:**
1. `docs/api-reference/hooks/useAgent.md` - Complete useAgent documentation
2. `docs/api-reference/hooks/useClippy.md` - ClippyProvider context hook
3. `docs/api-reference/components/ClippyProvider.md` - Provider props and usage
4. `docs/api-reference/components/Clippy.md` - Declarative component
5. `docs/api-reference/types/index.md` - All exported types
6. `docs/api-reference/advanced/custom-assets.md` - Asset path configuration
7. `docs/api-reference/advanced/multiple-agents.md` - Multiple agent patterns
8. `docs/api-reference/advanced/error-handling.md` - Error handling strategies

**Template for Each Doc:**
```markdown
# [API Name]

## Description
[What it does]

## Signature
```typescript
[Type definition]
```

## Parameters/Props
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| ... | ... | ... | ... | ... |

## Returns/Output
[What it returns]

## Examples

### Basic Usage
```typescript
[Basic example]
```

### Advanced Usage
```typescript
[Advanced example]
```

## Notes
[Important considerations]

## See Also
- [Related API]
```

**Acceptance Criteria:**
- [ ] All public APIs documented
- [ ] Code examples tested
- [ ] Types accurate
- [ ] Cross-references work
- [ ] Search-friendly

---

### TASK-3.2: Write Getting Started Guide
**Priority**: P0  
**Estimate**: 4 hours  
**Dependencies**: TASK-3.1

**Create**: `docs/getting-started/index.md`

**Tutorial Sections:**
1. Installation
2. Setup (ClippyProvider)
3. First Agent (useAgent basic)
4. Making Agent Speak
5. Playing Animations
6. Moving Agent
7. Multiple Agents
8. Error Handling
9. Next Steps

**Acceptance Criteria:**
- [ ] < 10 minutes to complete
- [ ] All code examples work
- [ ] Covers both Next.js and Vite
- [ ] Screenshots/GIFs included
- [ ] Common pitfalls covered

---

### TASK-3.3: Create TypeScript Examples
**Priority**: P1  
**Estimate**: 3 hours  
**Dependencies**: TASK-2.1

**Create**: `docs/examples/typescript/`

**Examples:**
1. basic-typescript.tsx - Basic TS setup
2. strict-mode.tsx - Strict mode usage
3. custom-types.tsx - Custom type definitions
4. generic-utils.tsx - Generic agent utilities
5. type-safe-animations.tsx - Type-safe animation handling

**Acceptance Criteria:**
- [ ] All examples type-check
- [ ] Strict mode enabled
- [ ] No `any` types
- [ ] IntelliSense works
- [ ] Well-commented

---

## Phase 4: Storybook

### TASK-4.1: Set Up Storybook
**Priority**: P1  
**Estimate**: 2 hours  
**Dependencies**: TASK-2.3

**Commands:**
```bash
mkdir -p packages/storybook
cd packages/storybook
npx storybook@latest init
```

**Configure**: `.storybook/main.ts`
```typescript
export default {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
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
- [ ] TypeScript configured
- [ ] Addons working

---

### TASK-4.2: Create Core Stories
**Priority**: P1  
**Estimate**: 6 hours  
**Dependencies**: TASK-4.1

**Stories to Create:**
1. Introduction.mdx
2. useAgent/Basic.stories.tsx
3. useAgent/AllMethods.stories.tsx
4. useAgent/Loading.stories.tsx
5. useAgent/Error.stories.tsx
6. Animations/AllAnimations.stories.tsx
7. MultipleAgents.stories.tsx
8. CustomPositioning.stories.tsx
9. SpeechBalloons.stories.tsx
10. AdvancedControls.stories.tsx

**Acceptance Criteria:**
- [ ] 10+ stories created
- [ ] All stories render
- [ ] Interactive controls work
- [ ] Documentation in stories

---

## Phase 5: Starter Templates

### TASK-5.1: Create Next.js Template
**Priority**: P1  
**Estimate**: 4 hours  
**Dependencies**: TASK-3.2

**Commands:**
```bash
mkdir -p packages/templates/nextjs-starter
cd packages/templates/nextjs-starter
npx create-next-app@latest . --typescript --app --tailwind
```

**Features to Implement:**
- ClippyProvider in layout
- Example pages
- Interactive demo
- Asset setup
- README with instructions

**Acceptance Criteria:**
- [ ] Template runs with `yarn dev`
- [ ] No hydration errors
- [ ] All agents work
- [ ] README comprehensive
- [ ] TypeScript strict mode

---

### TASK-5.2: Create Vite Template
**Priority**: P1  
**Estimate**: 3 hours  
**Dependencies**: TASK-3.2

**Commands:**
```bash
mkdir -p packages/templates/vite-starter
cd packages/templates/vite-starter
yarn create vite . --template react-ts
```

**Features to Implement:**
- ClippyProvider in App
- Example components
- Interactive demo
- Asset setup
- README with instructions

**Acceptance Criteria:**
- [ ] Template runs with `yarn dev`
- [ ] Hot reload works
- [ ] All agents work
- [ ] README comprehensive
- [ ] Build succeeds

---

## Summary & Next Actions

### Completed Tasks: 0 / 20

### Current Status
📋 Requirements defined
📋 Specification created
📋 Roadmap established
🔄 Ready to begin implementation

### Recommended Start
Begin with **Phase 1: Package Architecture**
- Start with TASK-1.1 (Core Package Structure)
- Work through tasks sequentially
- Mark tasks complete as you go
- Create git commits after each major task

### Tracking Progress
Use TodoWrite to track individual tasks as you implement:
```typescript
TodoWrite([
  { content: "TASK-1.1: Create Core Package Structure", status: "in_progress" },
  { content: "TASK-1.2: Create React Package Structure", status: "pending" },
  // ... etc
])
```

### Ready to Begin? 🚀
All planning complete. You can now start implementation following this task breakdown!
