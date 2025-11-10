---
date: 2025-11-06T22:32:31Z
git_commit: bdbcaf83ec2ff0f09304385b3ebdae83e0f55d6c
branch: feature/typescript-workspace-config
repository: /home/ericfriday/repos/clippyjs
topic: "TypeScript Workspace Configuration Research"
tags: [research, typescript, configuration, workspace, monorepo]
last_updated: 2025-11-06T22:32:31Z
---

## Ticket Synopsis

The ticket DEBT-001 addresses the lack of a unified TypeScript configuration structure across the ClippyJS monorepo. The workspace currently has individual package configurations without a base tsconfig.json, leading to IDE integration issues, version misalignment, and dependency conflicts. The goal is to create a standardized TypeScript configuration following Yarn workspace best practices with composite builds, project references, and consistent settings across all packages.

## Summary

The research reveals significant inconsistencies in TypeScript configurations across the workspace:

1. **No base configuration**: No tsconfig.base.json exists for inheritance
2. **TypeScript version misalignment**: While most packages use TypeScript 5.7.3, the demo-react package uses 4.9.5
3. **Configuration inconsistencies**: Different moduleResolution strategies, target versions, and lib settings
4. **No project references**: Composite builds and project references are not configured
5. **Varied output directories**: Some use 'dist', others have custom paths
6. **Missing workspace TypeScript**: Root package.json lacks TypeScript as a devDependency

## Detailed Findings

### TypeScript Configuration Files

#### Core Packages
- **packages/react/tsconfig.json**: Uses moduleResolution: "bundler", target: "ES2020", includes DOM libraries
- **packages/core/tsconfig.json**: Identical to react config (core is deprecated)
- **packages/ai/tsconfig.json**: Similar but excludes test files and has sourceMap enabled
- **packages/ai-openai/tsconfig.json**: Missing DOM.Iterable in lib, no JSX config
- **packages/ai-anthropic/tsconfig.json**: Same as ai-openai

#### Demo and Template Packages
- **tsconfig.demo.json** (root): Custom output directory, isolatedModules: false, path mappings
- **packages/clippyjs-demo-react/tsconfig.json**: Uses target: "es5", moduleResolution: "node", noEmit: true
- **packages/templates/nextjs-starter/tsconfig.json**: Next.js specific config with plugins and paths
- **packages/templates/vite-starter/tsconfig.json**: Uses project references, allowImportingTsExtensions: true

### TypeScript Version Analysis

#### Consistent Versions (5.7.3)
- packages/react
- packages/core
- packages/ai
- packages/ai-openai
- packages/ai-anthropic
- packages/clippyjs-lib
- packages/templates/vite-starter

#### Version Mismatches
- packages/clippyjs-demo-react: **4.9.5** (outdated)
- packages/templates/nextjs-starter: **^5** (loose version)

#### Missing TypeScript
- Root package.json has no TypeScript dependency

### Configuration Inconsistencies

#### Module Resolution
- **bundler**: react, core, ai, ai-openai, ai-anthropic, clippyjs-lib, nextjs-starter
- **node**: tsconfig.demo.json, clippyjs-demo-react
- **bundler** (with allowImportingTsExtensions): vite-starter

#### Target Versions
- **ES2020**: Most packages
- **es5**: clippyjs-demo-react
- **ES2017**: nextjs-starter

#### Library Settings
- **ES2020, DOM, DOM.Iterable**: Most packages
- **ES2020, DOM**: ai-openai, ai-anthropic
- **dom, dom.iterable, esnext**: clippyjs-demo-react, nextjs-starter

#### Declaration Files
- **Enabled**: react, core, ai, ai-openai, ai-anthropic, clippyjs-lib
- **Disabled**: tsconfig.demo.json
- **Not applicable** (noEmit: true): clippyjs-demo-react, vite-starter

### Build Scripts and CI/CD

#### Build Commands
- Most packages use: `yarn clean && yarn build:ts && yarn build:bundle`
- build:ts typically runs `tsc`
- AI packages use rollup directly without separate tsc step

#### CI/CD Configuration
(.github/workflows/test.yml:131)
- Runs `yarn workspaces foreach -pt run build` for packages
- Runs `yarn workspaces foreach -pt run build:ts` for TypeScript compilation
- Only tests @clippyjs/react, not other packages

### Missing Features

#### Project References
- Only vite-starter uses project references (for tsconfig.node.json)
- No composite builds configured
- No cross-package type checking

#### Path Mapping
- Only tsconfig.demo.json and nextjs-starter configure path mappings
- No standardized import aliases

## Code References

### TypeScript Configuration Files
- `tsconfig.demo.json:1-33` - Root demo config with custom output and path mappings
- `packages/react/tsconfig.json:1-28` - Standard React package configuration
- `packages/core/tsconfig.json:1-27` - Deprecated core package (identical to react)
- `packages/ai/tsconfig.json:1-25` - AI package with test exclusions
- `packages/ai-openai/tsconfig.json:1-24` - Missing DOM.Iterable library
- `packages/ai-anthropic/tsconfig.json:1-24` - Same as ai-openai
- `packages/clippyjs-demo-react/tsconfig.json:1-26` - Outdated es5 target
- `packages/templates/nextjs-starter/tsconfig.json:1-27` - Next.js specific config
- `packages/templates/vite-starter/tsconfig.json:1-25` - Only config with project references
- `packages/templates/vite-starter/tsconfig.node.json:1-11` - Node.js config for Vite

### Package.json Files
- `packages/react/package.json:69` - TypeScript 5.7.3
- `packages/core/package.json:41` - TypeScript 5.7.3
- `packages/ai/package.json:60` - TypeScript 5.7.3
- `packages/ai-openai/package.json:46` - TypeScript 5.7.3
- `packages/ai-anthropic/package.json:46` - TypeScript 5.7.3
- `packages/clippyjs-lib/package.json:60` - TypeScript 5.7.3
- `packages/clippyjs-demo-react/package.json:18` - TypeScript 4.9.5 (MISMATCH)
- `packages/templates/nextjs-starter/package.json:24` - TypeScript ^5 (LOOSE)
- `packages/templates/vite-starter/package.json:26` - TypeScript ~5.7.3

### CI/CD Configuration
- `.github/workflows/test.yml:127-131` - Build and TypeScript check steps
- `package.json:24` - Workspace typecheck command

## Architecture Insights

### Current Structure
1. **No inheritance hierarchy**: Each package has its own tsconfig.json
2. **Manual duplication**: Common settings repeated across files
3. **Framework-specific needs**: Different requirements for React, Node.js, Next.js
4. **Deprecated package**: core package duplicates react configuration

### Build System
1. **Rollup-based**: Most packages use Rollup for bundling
2. **TypeScript compilation**: Separate tsc step for declaration files
3. **No incremental builds**: Missing composite and incremental settings
4. **Inconsistent outputs**: Different outDir and exclusion patterns

### Workspace Management
1. **Yarn workspaces**: Properly configured for package management
2. **No shared types**: No internal package for common interfaces
3. **Limited CI scope**: Only tests react package thoroughly

## Historical Context (from thoughts/)

No previous thoughts or research documents found related to TypeScript configuration. This appears to be the first comprehensive analysis of the workspace's TypeScript setup.

## Related Research

None found. This is the initial research document for TypeScript workspace configuration.

## Open Questions

1. Should the deprecated core package be excluded from the new configuration system?
2. How to handle framework-specific needs (Next.js, Vite) while maintaining base consistency?
3. Should we create an internal @clippyjs/types package for shared interfaces?
4. How to migrate existing builds without breaking changes?
5. Should we enable type-aware linting as part of this effort?

## Recommendations

1. Create tsconfig.base.json with common settings
2. Standardize TypeScript version to 5.7.3 across all packages
3. Enable composite builds and project references
4. Create framework-specific base configs (tsconfig.react.json, tsconfig.node.json)
5. Add TypeScript to root package.json devDependencies
6. Update CI/CD to typecheck all packages
7. Migrate demo-react to TypeScript 5.7.3
8. Document the new configuration structure