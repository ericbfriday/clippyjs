# AGENTS.md

## Project Overview

This project is a published React UI library that allows developers to add Clippy or his friends (e.g., Bonzi, Rover, Merlin) to any website for a touch of nostalgia. It is a modern rewrite of the classic `Clippy.js` library in TypeScript, with a React implementation. The project is configured to be used either directly in the browser via a UMD build, or as an ES module / CommonJS module in a modern web development environment. It also provides React components and hooks for easy integration with React applications.

The project uses `rollup.js` for bundling and `TypeScript` for type safety. It also includes a demo page to showcase the different agents and their animations.

## Build/Lint/Test Commands

- Build library: `yarn workspace clippyjs build`
- Build demo: `yarn workspace clippyjs-demo-react build`
- Lint: `yarn workspace clippyjs lint`
- Test: `yarn workspace clippyjs test`
- Test single file: `yarn workspace clippyjs test path/to/file.test.ts`

To build the project, run:
```bash
yarn build
```

This will clean the `dist` directory and then build the TypeScript source into three different formats:
*   **ESM:** `dist/index.esm.js`
*   **CommonJS:** `dist/index.js`
*   **UMD:** `dist/clippy.min.js`

To run the demo page, use:
```bash
yarn demo
```

To run the React demo page, use:
```bash
yarn demo:react
```

This will start a local web server and you can view the demo at `http://localhost:8080/demo/`.

To lint the project, run:
```bash
yarn lint
```

To run the tests, use:
```bash
yarn test
```

## Development Conventions

*   **TypeScript:** The project is written in TypeScript. All new code should be in TypeScript.
*   **React:** The project provides a React implementation. When working on React components, follow the standard React conventions.
*   **Linting:** The project uses ESLint for linting. Please run the linter before committing any changes.
*   **Testing:** The project uses Jest for testing. Please add tests for any new functionality.
*   **Commits:** Commit messages should be clear and descriptive.

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