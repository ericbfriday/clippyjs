# CRUSH.md

## Build/Lint/Test Commands
- Build library: `yarn workspace clippyjs build`
- Build demo: `yarn workspace clippyjs-demo-react build`
- Lint: `yarn workspace clippyjs lint`
- Test: `yarn workspace clippyjs test`
- Test single file: `yarn workspace clippyjs test path/to/file.test.ts`

## Code Style Guidelines
- Use TypeScript with strict mode
- Follow camelCase for variables and functions
- Use PascalCase for React components
- Import React explicitly in files using JSX
- Use functional components with hooks
- Prefer const over let for variables
- Use TypeScript interfaces for object shapes
- Follow ESLint rules with react hooks plugin
- Use JSDoc comments for exports
- No magic numbers, use constants instead
- Prefer descriptive naming over abbreviations
