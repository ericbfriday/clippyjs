---
type: debt
priority: high
created: 2025-01-06T10:00:00Z
created_by: Opus
status: reviewed
tags: [typescript, configuration, workspace, monorepo, build-system]
keywords: [tsconfig.json, typescript version, yarn workspace, composite builds, project references, path mapping, declaration files, isolatedModules]
patterns: [configuration inheritance, workspace dependency management, build script configurations, CI/CD TypeScript compilation, framework-specific TypeScript needs]
---

# DEBT-001: Standardize TypeScript configuration across workspace

## Description
The workspace lacks a unified TypeScript configuration structure, leading to IDE integration issues, version misalignment, and dependency conflicts. Individual package configurations are not necessarily wrong, but the workspace doesn't compose neatly for type checking due to the lack of a base tsconfig.base.json.

## Context
This technical debt impacts developer experience through IDE integration pain points and dependency mismatches. The current setup makes it difficult to ensure type safety across the entire workspace and hinders efficient development workflows.

## Requirements

### Functional Requirements
- Create a base tsconfig.base.json following Yarn workspace best practices
- Enable composite builds and incremental builds across the workspace
- Use NX monorepo tsconfig structure as inspiration for handling multiple frameworks
- Standardize TypeScript version across all packages
- Update all demo projects to follow the same configuration structure
- Update templates (nextjs-starter, vite-starter) with new configuration pattern
- Include Storybook in TypeScript configuration alignment
- Align Deno demo with workspace while respecting Deno conventions (low priority)
- Configure project references for better type checking across packages
- Standardize declaration file generation (.d.ts) across packages
- Move root tsconfig.demo.json into appropriate library/app

### Non-Functional Requirements
- Enable strict mode globally
- Target modern ES module distribution for tree-shaking
- Include type-only export optimizations
- Configure skipLibCheck globally
- Standardize module resolution strategy
- Standardize build output to 'dist' directory
- Enable source map generation consistently
- Include isolatedModules option for better tree-shaking
- Enable strict null checks globally
- Configure allowSyntheticDefaultImports globally where supported
- Enable esModuleInterop globally (allow overrides where needed)
- Include forceConsistentCasingInFileNames for cross-platform compatibility
- Standardize JSX configuration across React packages
- Enable resolveJsonModule globally

## Current State
- Individual tsconfig.json files in each package without unified structure
- No base configuration for inheritance
- TypeScript versions may vary across packages
- Build outputs not standardized
- No project references configured
- Demo projects and templates have independent configurations

## Desired State
- Unified TypeScript configuration structure with tsconfig.base.json at root
- All packages extending base configuration with framework-specific overrides
- Consistent TypeScript version across workspace
- Composite builds with project references enabled
- Standardized build outputs and settings
- Internal shared types package for common interfaces
- Clear deprecation notice for core package
- Updated build scripts and CI/CD configurations
- Aligned linting rules with TypeScript configs

## Research Context

### Keywords to Search
- tsconfig.json - All TypeScript configuration files
- TypeScript version - Current TS versions in package.json files
- yarn workspace - Workspace configuration patterns
- NX monorepo - Reference configuration structure
- composite builds - TypeScript composite project configuration
- project references - TypeScript project references setup
- path mapping - Import alias configurations
- declaration files - .d.ts file generation settings
- type-only exports - TypeScript export type optimizations
- isolatedModules - Module isolation for tree-shaking

### Patterns to Investigate
- Configuration inheritance patterns (extends property)
- Workspace dependency management
- Build script configurations across packages
- CI/CD TypeScript compilation steps
- Framework-specific TypeScript needs (React, Node.js, Deno)
- Linting integration with TypeScript
- Demo project configurations
- Template project structures

### Key Decisions Made
- Use tsconfig.base.json as root configuration
- Follow Yarn workspace best practices
- Enable strict mode globally
- Target modern ES modules for tree-shaking
- Standardize output to 'dist' directory
- Create internal shared types package (not published)
- Enable composite and incremental builds
- Include project references
- Align all packages including demos and templates
- Update core package with deprecation notice or exclude from CI/CD
- Root package.json to have TypeScript and workspace tools in devDependencies

## Success Criteria

### Automated Verification
- [ ] All packages extend from tsconfig.base.json
- [ ] TypeScript version consistent across package.json files
- [ ] `yarn build` succeeds for all packages
- [ ] `yarn typecheck` passes for entire workspace
- [ ] Project references configured correctly
- [ ] CI/CD builds pass with new configuration

### Manual Verification
- [ ] IDE integration works smoothly without conflicts
- [ ] Demo projects build and run correctly
- [ ] Templates generate projects with proper TypeScript config
- [ ] Storybook builds without TypeScript errors
- [ ] Deno demo respects both workspace and Deno conventions
- [ ] Documentation clearly explains the configuration structure

## Related Information
- AGENTS.md for build/lint/test commands
- Individual package README files
- Yarn workspace documentation
- NX monorepo configuration patterns

## Notes
- Make concessions for external dependencies in ai-anthropic, ai-openai packages
- Enable type-aware linting as long-term goal (not initial scope)
- Create concise documentation about the TypeScript config system
- Consider framework-specific needs while maintaining base configuration consistency