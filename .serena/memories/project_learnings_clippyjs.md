# ClippyJS Project Learnings

## Project Architecture

### Package Structure
```
clippyjs/
├── packages/
│   ├── core/           # Pure TypeScript implementation
│   │   ├── src/        # Source code
│   │   ├── dist/       # Built output (ESM + CJS)
│   │   └── assets/     # Static agent assets (NEW)
│   ├── react/          # React bindings and hooks
│   │   ├── src/        # React components
│   │   ├── dist/       # Built output
│   │   └── tests/      # Unit tests (Vitest)
│   └── storybook/      # Component showcase
│       ├── stories/    # Story files
│       └── .storybook/ # Configuration
```

### Key Technologies
- **Build System**: Rollup for core/react, Vite for Storybook
- **Testing**: Vitest + React Testing Library
- **Package Manager**: Yarn 4.x with PnP
- **React Version**: 19.0.0
- **TypeScript**: 5.7.3

## Asset Management Pattern

### Original ClippyJS Sources
- **Primary Repository**: smore-inc/clippy.js (original)
- **Active Fork**: pi0/clippyjs
- **Working CDN**: `https://cdn.jsdelivr.net/gh/josegomez/clippyjs@master/assets/agents/`
- **Legacy CDN**: `https://gitcdn.xyz/repo/pi0/clippyjs/master/assets/agents/` (unstable)

### Asset Structure Per Agent
Each agent requires 4 files:
1. **map.png**: Sprite sheet containing all animation frames
2. **agent.js**: JSONP file with animation frame data and timings
3. **sounds-mp3.js**: JSONP file with MP3 audio URLs
4. **sounds-ogg.js**: JSONP file with OGG audio URLs

### Loading Mechanism
```typescript
// JSONP-style callbacks
window.clippy.ready(agentName, agentData)        // Called by agent.js
window.clippy.soundsReady(agentName, soundMap)   // Called by sounds-*.js
```

## Build and Development Workflow

### Build Order (Important!)
```bash
yarn build:core    # Must run first
yarn build:react   # Depends on core
yarn storybook     # Uses built react package
```

### Common Issues and Solutions

#### Issue: Storybook Dependency Conflicts
**Symptom**: `@storybook/builder-vite tried to access storybook (a peer dependency)...`
**Solution**: 
```bash
yarn cache clean --all
yarn install
yarn build
```

#### Issue: Assets Not Loading
**Symptom**: 404 errors for map.png, agent.js, sounds files
**Root Cause**: Missing local assets or incorrect basePath
**Solution**: Ensure `staticDirs` in Storybook config and correct loader basePath

#### Issue: React 19 Type Errors
**Known Issue**: Some Storybook addons may have React 18 types
**Workaround**: Continue development, type errors are warnings only

## Code Patterns

### Agent Initialization
```typescript
import { load } from '@clippyjs/core';

// Loads agent with default basePath
const agent = await load('Clippy');

// Custom basePath
const agent = await load('Clippy', { 
  basePath: 'https://custom-cdn.com/agents/' 
});
```

### React Hook Usage
```typescript
import { useAgent } from '@clippyjs/react';

const { agent, isLoaded, error } = useAgent('Clippy', {
  autoShow: true
});

// Animation control
agent?.play('Wave');
agent?.speak('Hello!');
agent?.moveTo(100, 100);
```

## Testing Patterns

### Unit Test Structure
- **Location**: `/packages/react/tests/unit/`
- **Framework**: Vitest + React Testing Library
- **Run**: `yarn test --run` (single run) or `yarn test` (watch mode)

### Storybook Stories
- **Location**: `/packages/storybook/stories/`
- **Naming**: `ComponentName.stories.tsx`
- **Pattern**: One story file per component/hook with multiple variations

## Performance Considerations

### Asset Sizes
- **Clippy**: map.png (1.3MB), agent.js (67KB), sounds (25KB MP3 / 84KB OGG)
- **Largest Agent**: Peedy with 1.8MB map.png
- **Total**: ~11MB for all 10 agents

### Loading Strategy
- Parallel loading: map.png, agent.js, sounds load concurrently
- Browser caching: Assets cached after first load
- Lazy loading: Agents only load when requested

## Configuration Files

### Storybook Main Config
**File**: `packages/storybook/.storybook/main.ts`
**Key Settings**:
- `framework: '@storybook/react-vite'`
- `staticDirs: ['../../core/assets']` - Critical for asset serving

### Loader Configuration
**File**: `packages/core/src/loader.ts`
**Key Settings**:
- Default basePath: `/agents/` (for local development)
- Fallback: `window.CLIPPY_CDN` or custom basePath option

## Development Tips

1. **Always build core first** when making core changes
2. **Clear yarn cache** if seeing weird dependency errors
3. **Check browser console** for asset loading errors
4. **Use Storybook** for visual testing and component development
5. **Run tests before committing** to catch regressions

## Known Limitations

1. **Browser Support**: Requires modern browser with ES6+ support
2. **Audio Format**: Auto-detects MP3/OGG support, no AAC
3. **Internet Explorer**: Not supported (uses modern JavaScript)
4. **Mobile**: Limited testing on mobile devices
