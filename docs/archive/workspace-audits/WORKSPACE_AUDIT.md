# ClippyJS Workspace Audit

**Date**: 2025-01-20
**Status**: 🔴 Issues Found

## Current Structure

### Workspaces Detected
```
packages/clippyjs-demo-react      (clippyjs-demo-react)
packages/clippyjs-demo-vanilla    (clippyjs-demo-vanilla)
packages/clippyjs-lib             (clippyjs) [OLD]
packages/core                     (@clippyjs/core) [DEPRECATED]
packages/react                    (@clippyjs/react) [PRIMARY]
packages/storybook                (@clippyjs/storybook)
packages/templates/nextjs-starter (clippyjs-nextjs-starter)
packages/templates/vite-starter   (clippyjs-vite-starter)
```

## 🔴 Critical Issues

### 1. Workspace Glob Pattern ❌
**Issue**: Templates not included in workspace
```json
// Current (WRONG)
"workspaces": ["packages/*"]

// Should be
"workspaces": ["packages/*", "packages/templates/*"]
```

**Impact**: Templates can't use workspace dependencies, builds will fail

### 2. Root Script References ❌
**Issue**: References non-existent workspace
```json
// Line 13 in root package.json
"demo:react": "yarn workspace react-app start"
//                             ^^^^^^^^^ WRONG

// Should be
"demo:react": "yarn workspace clippyjs-demo-react start"
```

### 3. Demo Dependencies ❌
**Issue**: Demo still references deprecated old library
```json
// packages/clippyjs-demo-react/package.json
"dependencies": {
  "clippyjs": "workspace:*"  // OLD LIBRARY
}

// Should be
"dependencies": {
  "@clippyjs/react": "workspace:^"  // NEW LIBRARY
}
```

### 4. Asset Path References ❌
**Issue**: Demo copies assets from old lib location
```json
// packages/clippyjs-demo-react/package.json
"prestart": "rm -rf public/assets && cp -R ../clippyjs-lib/assets public/assets"
//                                                ^^^^^^^^^^^^^

// Should reference @clippyjs/react or @clippyjs/core assets
```

## 🟡 Minor Issues

### 5. Inconsistent Naming
- **Scoped**: `@clippyjs/core`, `@clippyjs/react`, `@clippyjs/storybook`
- **Non-scoped**: `clippyjs` (old), `clippyjs-demo-*`, `clippyjs-*-starter`

**Recommendation**: Use scoped names for publishable packages, non-scoped for demos/templates

### 6. Missing Root Scripts
- No `test` script to run all tests
- No `storybook` shortcut
- No `lint` script across all packages
- No `typecheck` script

## 📋 Recommended Actions

### High Priority
1. ✅ Fix workspace glob pattern
2. ✅ Fix root script references
3. ✅ Update demo dependencies
4. ✅ Fix asset path references
5. ✅ Add comprehensive root scripts

### Medium Priority
6. Test all workspace scripts
7. Document workspace structure
8. Add workspace-wide commands

### Low Priority
9. Consider renaming for consistency
10. Add workspace validation script

## Package Dependency Graph

```
@clippyjs/react
  └─ @clippyjs/core (workspace:^)

@clippyjs/storybook
  └─ @clippyjs/react (workspace:^)

clippyjs-demo-react
  └─ clippyjs (workspace:*) ❌ WRONG
  └─ Should be: @clippyjs/react (workspace:^)

clippyjs-nextjs-starter
  └─ @clippyjs/react (workspace:^) ✅

clippyjs-vite-starter
  └─ @clippyjs/react (workspace:^) ✅
```

## Scripts Inventory

### Root Scripts
- `build` - Builds core and react
- `build:core` - Builds @clippyjs/core
- `build:react` - Builds @clippyjs/react
- `clean` - Cleans build artifacts
- `clean:all` - Deep clean including node_modules
- `demo` - HTTP server for demos
- `demo:react` - ❌ BROKEN (references wrong workspace)

### Package Scripts
**@clippyjs/core**: build, build:ts, build:bundle, clean, prepublishOnly
**@clippyjs/react**: build, build:ts, build:bundle, clean, prepublishOnly, test, test:ui, test:coverage, test:integration, test:visual, test:all, test:ci, playwright:install
**@clippyjs/storybook**: storybook, build-storybook, preview
**clippyjs-demo-react**: prestart, start, build, test, eject
**clippyjs-nextjs-starter**: dev, build, start, lint
**clippyjs-vite-starter**: dev, build, preview, lint

## Next Steps
1. Apply fixes from recommendations
2. Test all scripts
3. Update documentation
