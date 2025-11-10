# TypeScript Configuration

This document explains the TypeScript configuration structure used in ClippyJS monorepo.

## Configuration Hierarchy

- `tsconfig.base.json` - Base configuration for all packages
- `tsconfig.react.json` - React-specific extensions
- `tsconfig.node.json` - Node.js-specific extensions

## Path Mappings

- `@/*` - Package-local src directory
- `@clippyjs/types` - Shared types package
- `@clippyjs/react` - React package
- `@clippyjs/ai` - AI package

## Project References

All packages use TypeScript project references for improved type checking and incremental builds.