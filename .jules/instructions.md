# ClippyJS Agent Instructions

## Package Manager: Yarn 4 (Berry)

**CRITICAL**: This project uses **Yarn 4 (Berry)** with `node-modules` linker. **DO NOT use npm, pnpm, or bun.**

- Install: `yarn install`
- Add dependency: `yarn add <package>` (or `yarn workspace <ws> add <package>`)
- Run scripts: `yarn <script>` or `yarn workspace <ws> <script>`
- Build: `yarn build` or `nx run-many --target=build --all`
- Test: `yarn test:all` or `nx run-many --target=test --all`
- Lint: `yarn lint` or `nx run-many --target=lint --all`
- Typecheck: `yarn typecheck`

**NEVER**:
- Run `npm install` or `npm run`
- Run `pnpm install` or `pnpm run`
- Run `bun install` or `bun run`
- Create a `package-lock.json` or `pnpm-lock.yaml`
- Modify `yarn.lock` manually — always use `yarn install` or `yarn add`

## Project Structure

- **Nx monorepo** with workspaces under `packages/`
- Default branch: `master`
- Build tool: Nx with caching
- Testing: Vitest
- Framework: React + TypeScript

## Key Packages

| Package | Path | Description |
|---------|------|-------------|
| @clippyjs/types | packages/types | Shared type definitions |
| @clippyjs/ai | packages/ai | AI integration core |
| @clippyjs/ai-anthropic | packages/ai-anthropic | Anthropic provider |
| @clippyjs/ai-openai | packages/ai-openai | OpenAI provider |
| @clippyjs/ai-openrouter | packages/ai-openrouter | OpenRouter provider |
| @clippyjs/ai-zai | packages/ai-zai | ZAI provider |
| @clippyjs/react | packages/react | React component library |
| @clippyjs/browser-assistant | packages/browser-assistant | Browser assistant |
| @clippyjs/browser-parser | packages/browser-parser | Browser DOM parser |
| @clippyjs/context-providers | packages/context-providers | Context providers |

## Build Order

Build dependencies must be respected. Use `nx run-many --target=build --all` or individual builds:
1. `@clippyjs/types` (no deps)
2. `@clippyjs/ai` (depends on types)
3. Provider packages (depend on ai)
4. `@clippyjs/react` (depends on ai, types)

## CI

- Workflow: `.github/workflows/test.yml`
- Uses `yarn install --immutable` — any lockfile changes will fail CI
- Node.js 20, Yarn 4.12.0 (via corepack)

## Common Pitfalls

1. **Don't use pnpm** — this project's CI, scripts, and lockfile are all yarn-based
2. **Build before test** — some packages depend on built outputs from others
3. **Use nx commands** for cross-package operations
4. **Check `nx.json`** for target defaults and caching config
5. **Peer dependencies** — some packages have peer dependency warnings; these are known and acceptable
