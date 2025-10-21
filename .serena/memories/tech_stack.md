# ClippyJS Tech Stack

## Core Technologies

### Language & Runtime
- **TypeScript 5.7.3**: Strict mode enabled for maximum type safety
- **ES2020**: Target compilation level
- **ESNext Modules**: Modern ESM module system

### Frontend Framework
- **React 19.0.0**: Latest React with new automatic JSX runtime
- **React DOM 19.0.0**: DOM rendering
- **React Hooks**: Functional component patterns (useState, useEffect, useContext, useRef)

### Build Tools
- **Rollup 4.31.0**: Module bundler for library distribution
  - @rollup/plugin-typescript: TypeScript compilation
  - @rollup/plugin-commonjs: CommonJS module support
  - @rollup/plugin-node-resolve: Module resolution
  - @rollup/plugin-terser: Code minification
  - @rollup/plugin-replace: Environment variable replacement
- **TypeScript Compiler (tsc)**: Type checking and declaration generation
- **Vite 5.3.1**: Development server for demo apps

### Package Management
- **Yarn 3+**: Package manager with workspaces support
- **Yarn Workspaces**: Monorepo structure management

### Code Quality
- **ESLint 9.18.0**: Code linting
  - @typescript-eslint/eslint-plugin: TypeScript-specific rules
  - @typescript-eslint/parser: TypeScript parsing
  - eslint-plugin-react: React-specific rules
  - eslint-plugin-react-hooks: React Hooks rules

### Testing
- **Jest 30.0.0-alpha.7**: Testing framework
- **@testing-library/react 16.3.0**: React component testing
- **@testing-library/jest-dom**: DOM matchers
- **@testing-library/user-event**: User interaction simulation

### Development
- **tslib 2.8.1**: TypeScript runtime library
- **web-vitals 2.1.4**: Performance metrics (in demo apps)

## Platform Support
- **Target**: Modern browsers with ES2020 support
- **Development OS**: macOS (Darwin)
- **Module Formats**: 
  - ESM (primary): dist/index.esm.js
  - CommonJS (compatibility): dist/index.js
  - Type definitions: dist/index.d.ts

## Deployment
- **NPM Package**: Published as 'clippyjs'
- **CDN Assets**: Agent assets served from GitHub CDN
- **Bundle Size**: Optimized with Terser minification
