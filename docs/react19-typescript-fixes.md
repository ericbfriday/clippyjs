# React 19 + TypeScript 5.7.3 Migration Fixes

## Expected TypeScript/React 19 Issues and Solutions

### 1. React.FC Type Changes
React 19 has updated the `React.FC` type. The children prop is no longer automatically included.

**Current Code (OK):** Your components already explicitly define children in props where needed.
```typescript
// ClippyProvider.tsx - Already correct
interface ClippyProviderProps {
  children: ReactNode;
  defaultBasePath?: string;
}
```

### 2. React 19 Type Import Updates
The type imports should be updated to use the new React 19 type definitions.

**Fix needed in tsconfig.json:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",  // Already correct for React 17+
    "moduleResolution": "bundler",  // Update from "node" to "bundler" for better React 19 support
  }
}
```

### 3. useEffect Cleanup Function
React 19 is stricter about useEffect cleanup functions. Your code already handles this correctly:
- All async operations check `mountedRef.current` before state updates
- Cleanup functions properly return cleanup logic

### 4. Potential TypeScript 5.7.3 Issues

#### Issue: Module Resolution
TypeScript 5.7.3 has stricter module resolution. Update tsconfig.json:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",  // or "node16" for better ESM support
    "module": "ESNext",
    "target": "ES2020"
  }
}
```

#### Issue: Rollup TypeScript Plugin Configuration
The @rollup/plugin-typescript v12 requires specific configuration for TypeScript 5.7.3:

```javascript
// In rollup.config.js, update typescript plugin:
typescript({
  tsconfig: "./tsconfig.json",
  declaration: true,
  declarationDir: "dist",
  rootDir: "src",
  outputToFilesystem: true  // Add this for TypeScript 5.7.3
})
```

### 5. React 19 Automatic Runtime
Your project already uses the automatic JSX runtime (`"jsx": "react-jsx"`), which is compatible with React 19.

### 6. Type-Only Imports
TypeScript 5.7.3 is stricter about type-only imports. Update imports where needed:

```typescript
// Change from:
import { AgentData, SoundMap } from './types';

// To (if only using as types):
import type { AgentData, SoundMap } from './types';
```

### 7. Event Handler Types
React 19 has updated event handler types. Your code uses standard HTML event types which should be compatible.

## Build Process Updates

### Rollup 4 Configuration
The rollup configuration looks correct for Rollup 4. The main change was:
- ✅ Already updated: `rollup-plugin-terser` → `@rollup/plugin-terser`

### Package.json Scripts
The scripts should work with the new versions. The use of `yarn exec` might need updating:

```json
// Change from:
"build:bundle": "yarn exec rollup -c"

// To:
"build:bundle": "rollup -c"
```

## Summary of Required Changes

1. **tsconfig.json** - Update `moduleResolution` to "bundler"
2. **rollup.config.js** - Add `outputToFilesystem: true` to TypeScript plugin
3. **package.json** - Simplify rollup command
4. **Type imports** - Use `import type` where appropriate (optional optimization)

## Testing Steps

1. Run `chmod +x install-and-build.sh`
2. Run `./install-and-build.sh`
3. Check for TypeScript compilation errors
4. Verify the build creates files in `dist/`
5. Test the demo with `npm run demo`

## Common Errors and Solutions

### Error: Cannot find module 'react/jsx-runtime'
- Solution: Ensure React 19 is properly installed and tsconfig has `"jsx": "react-jsx"`

### Error: Type errors with React.FC
- Solution: Explicitly define children prop where needed

### Error: Rollup build fails
- Solution: Ensure all Rollup plugins are updated to latest versions compatible with Rollup 4

### Error: TypeScript emits no output
- Solution: Add `outputToFilesystem: true` to @rollup/plugin-typescript configuration