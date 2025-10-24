# ClippyJS Project Structure

## Monorepo Architecture

ClippyJS is organized as a Yarn workspace monorepo with multiple packages:

```
clippyjs/
├── packages/
│   ├── clippyjs-lib/           # Main library package
│   ├── clippyjs-demo-react/    # React demo application
│   ├── clippyjs-demo-vanilla/  # Vanilla JS demo
│   └── clippyjs-demo-deno/     # Deno demo (experimental)
├── docs/                        # Documentation
├── scripts/                     # Build and utility scripts
├── dist/                        # Build output (generated)
├── node_modules/                # Dependencies
└── package.json                 # Root workspace configuration
```

## Main Library Package (packages/clippyjs-lib)

### Source Structure
```
packages/clippyjs-lib/
├── src/
│   ├── Agent.ts              # Main agent class (500+ lines)
│   ├── Animator.ts           # Animation controller
│   ├── Balloon.ts            # Speech balloon UI
│   ├── Queue.ts              # Action queue system
│   ├── Clippy.tsx            # React component
│   ├── ClippyProvider.tsx    # React Context provider
│   ├── loader.ts             # Agent asset loader
│   ├── types.ts              # TypeScript type definitions
│   ├── index.ts              # Main entry point (vanilla API)
│   ├── mod.ts                # Deno entry point
│   └── clippy.css            # Component styles
├── assets/
│   ├── agents/               # Agent sprite data (10 agents)
│   │   ├── Clippy/
│   │   ├── Bonzi/
│   │   ├── F1/
│   │   ├── Genie/
│   │   ├── Genius/
│   │   ├── Links/
│   │   ├── Merlin/
│   │   ├── Peedy/
│   │   ├── Rocky/
│   │   └── Rover/
│   ├── images/               # UI images
│   │   ├── border.png
│   │   └── tip.png
│   └── clippy.css
├── dist/                     # Build output
│   ├── index.js              # CommonJS bundle
│   ├── index.esm.js          # ESM bundle
│   ├── index.d.ts            # Type definitions
│   └── ...
├── package.json
├── tsconfig.json
├── rollup.config.js
├── jsr.json                  # JSR registry config
├── README.md
└── LICENCE.md
```

### Core Classes

**Agent.ts** (Primary Class)
- Main agent controller
- Public API: show, hide, play, speak, moveTo, gestureAt, animate
- Properties: animator, balloon, queue, element
- ~50 methods including drag handling, animation control, positioning

**Animator.ts**
- Controls sprite animation playback
- Frame-based animation system
- Branch handling for animation variations

**Balloon.ts**
- Speech balloon UI management
- Positioning and content rendering
- Auto-close and hold functionality

**Queue.ts**
- Sequential action queue
- Promise-based execution
- Empty queue detection

**Clippy.tsx** (React Integration)
- React component wrapper for Agent
- Props: name, basePath, showOnLoad, position, speak
- Custom hook: useAgent for programmatic control

**ClippyProvider.tsx**
- React Context provider
- Multi-agent state management
- Agent loading and caching

## Demo Applications

### React Demo (packages/clippyjs-demo-react)
```
clippyjs-demo-react/
├── src/
│   ├── App.tsx              # Main React app
│   ├── index.tsx            # Entry point
│   ├── App.css
│   └── index.css
├── public/
│   ├── assets/              # Copied from lib at build time
│   ├── index.html
│   └── manifest.json
├── demo-react.tsx           # Alternative demo
├── react.html               # Standalone HTML demo
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Vanilla Demo (packages/clippyjs-demo-vanilla)
```
clippyjs-demo-vanilla/
├── index.html
├── demo.js
├── demo-promises.html       # Promises-based examples
├── clippy.min.js            # Bundled library
└── clippy.css
```

### Deno Demo (packages/clippyjs-demo-deno)
```
clippyjs-demo-deno/
├── main.tsx                 # Deno Fresh app
├── Chat.tsx                 # Chat component
├── prompts.ts               # AI prompt examples
└── deno.json
```

## Documentation

```
docs/
└── react19-typescript-fixes.md  # Migration guide and known issues
```

## Scripts

```
scripts/
└── install-and-build.sh     # Complete installation and build script
```

## Configuration Files

### Root Level
- **package.json**: Workspace configuration, scripts for demos
- **.gitignore**: Git ignore patterns
- **yarn.lock**: Dependency lock file
- **.pnp.cjs**: Yarn PnP runtime
- **tsconfig.demo.json**: TypeScript config for demos

### Library Level (packages/clippyjs-lib)
- **tsconfig.json**: TypeScript compiler configuration
- **rollup.config.js**: Rollup bundler configuration
- **jsr.json**: JSR (JavaScript Registry) configuration
- **package.json**: Library package configuration

### Demo Level (packages/clippyjs-demo-react)
- **vite.config.ts**: Vite bundler configuration
- **tsconfig.json**: TypeScript configuration
- **package.json**: Demo app dependencies and scripts

## Build Output (Generated)

### Library Distribution (packages/clippyjs-lib/dist/)
```
dist/
├── index.js              # CommonJS bundle
├── index.esm.js          # ESM bundle
├── Clippy.js             # React component bundle
├── index.d.ts            # Root type definitions
├── Agent.d.ts            # Agent type definitions
├── Animator.d.ts
├── Balloon.d.ts
├── Queue.d.ts
├── Clippy.d.ts
├── ClippyProvider.d.ts
├── loader.d.ts
├── types.d.ts
└── ...                   # Other declaration files and maps
```

## Key Architectural Patterns

### Monorepo Benefits
- **Shared Dependencies**: Common React/TypeScript versions across demos
- **Local Development**: Test library changes immediately in demo apps
- **Workspace References**: `"clippyjs": "workspace:*"` in demo packages

### Asset Management
- **CDN-First**: Assets served from GitHub CDN by default
- **Local Fallback**: Can override with basePath option
- **Build-Time Copy**: React demo copies assets during build
- **Lazy Loading**: Agents loaded on-demand, not bundled

### Module Exports
- **Dual Format**: ESM (primary) + CommonJS (compatibility)
- **React Subpath**: Separate export for React components
- **Type Definitions**: Full TypeScript declaration files
- **Tree Shaking**: ESM format enables dead code elimination

### Development Workflow
1. Make changes in `packages/clippyjs-lib/src/`
2. Build library: `yarn build`
3. Changes automatically reflected in demos (workspace links)
4. Test in React demo: `yarn demo:react`
