# GEMINI.md

## Project Overview

This project is a published React UI library that allows developers to add Clippy or his friends (e.g., Bonzi, Rover, Merlin) to any website for a touch of nostalgia. It is a modern rewrite of the classic `Clippy.js` library in TypeScript, with a React implementation. The project is configured to be used either directly in the browser via a UMD build, or as an ES module / CommonJS module in a modern web development environment. It also provides React components and hooks for easy integration with React applications.

The project uses `rollup.js` for bundling and `TypeScript` for type safety. It also includes a demo page to showcase the different agents and their animations.

## Building and Running

### Build

To build the project, run the following command:

```bash
yarn build
```

This will clean the `dist` directory and then build the TypeScript source into three different formats:

*   **ESM:** `dist/index.esm.js`
*   **CommonJS:** `dist/index.js`
*   **UMD:** `dist/clippy.min.js`

### Run Demo

To run the demo page, use the following command:

```bash
yarn demo
```

To run the React demo page, use the following command:

```bash
yarn demo:react
```

This will start a local web server and you can view the demo at `http://localhost:8080/demo/`.

### Linting

To lint the project, run:

```bash
yarn lint
```

### Testing

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